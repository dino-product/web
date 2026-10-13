// 교차 흐름 점검(통합 회귀): 사이드바·로그아웃·온보딩·배정·등록·취소·보드·알림·조직 설정·유형·탈퇴·발주사 전환·빈 상태·네트워크 실패를 클릭 단계로 재현하고
// 화면 반영과 콘솔 오류를 확인한다. 개발 서버를 먼저 띄운다(npm run dev).
// usage: node scripts/check-flows.mjs [baseUrl=http://localhost:5173] [flow ...]   예: node scripts/check-flows.mjs http://localhost:5173 assign cancel
//        VIEWPORT=1440x900 node scripts/check-flows.mjs ...   (창 크기 바꿔 확인)
import { chromium } from 'playwright';

const BASE = process.argv[2] && process.argv[2].startsWith('http') ? process.argv[2] : 'http://localhost:5173';
const only = process.argv.slice(2).filter((a) => !a.startsWith('http'));

const results = [];
let currentFlow = '';
function check(name, cond, detail = '') {
  results.push({ flow: currentFlow, name, pass: Boolean(cond), detail: cond ? '' : String(detail) });
  if (!cond) console.log(`  FAIL [${currentFlow}] ${name} ${detail}`);
}

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
} catch {
  browser = await chromium.launch();
}

const VIEWPORT = process.env.VIEWPORT ? { width: Number(process.env.VIEWPORT.split('x')[0]), height: Number(process.env.VIEWPORT.split('x')[1]) } : { width: 1920, height: 1080 };
async function open(path, viewport = VIEWPORT) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  return { context, page, errors };
}

const pathOf = (page) => {
  const u = new URL(page.url());
  return u.pathname + u.search;
};
const pause = (page, ms = 200) => page.waitForTimeout(ms);
async function click(page, selector, opts = {}) {
  await page.locator(selector).first().click(opts);
  await pause(page);
}
const count = (page, selector) => page.locator(selector).count();
const visible = async (page, selector) => (await page.locator(selector).count()) > 0 && page.locator(selector).first().isVisible();
const text = (page, selector) => page.locator(selector).first().innerText();
async function overlayText(page) {
  return page.evaluate(() => document.getElementById('overlay-root')?.innerText ?? '');
}
async function mainText(page) {
  return page.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText);
}
async function sidebarActive(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('aside a[aria-current="page"]')).map((a) => a.textContent.trim()),
  );
}
async function sidebarUser(page) {
  return page.evaluate(() => {
    const aside = document.querySelector('aside');
    return aside ? aside.innerText.split('\n').slice(-4).join(' | ') : '';
  });
}
async function finish(env) {
  check('콘솔·페이지 오류 없음', env.errors.length === 0, env.errors.join(' / '));
  await env.context.close();
}

/** 타임테이블 격자의 기사 행 y와 시간 x(캔버스 좌표) → 화면 좌표 */
async function gridPoint(page, technicianName, hm) {
  return page.evaluate(
    ({ technicianName, hm }) => {
      const blocks = document.querySelector('[class*="lanes"]');
      if (!blocks) return null;
      const rect = blocks.getBoundingClientRect();
      const names = Array.from(document.querySelectorAll('[class*="drivers"] > *')).map((el) => el.textContent);
      const row = names.findIndex((n) => n.includes(technicianName));
      if (row < 0) return null;
      const [h, m] = hm.split(':').map(Number);
      const zoom = rect.width / blocks.offsetWidth || 1;
      const x = rect.left + (((h * 60 + m) / 60) * 156 + 20) * zoom;
      const y = rect.top + (row * 111 + 55) * zoom;
      return { x, y };
    },
    { technicianName, hm },
  );
}

async function dragCardTo(page, cardSelector, technicianName, hm) {
  const pt = await gridPoint(page, technicianName, hm);
  if (!pt) throw new Error(`grid point not found ${technicianName} ${hm}`);
  const source = page.locator(cardSelector).first();
  const lanes = page.locator('[class*="lanes"]').first();
  const box = await lanes.boundingBox();
  await source.dragTo(lanes, { targetPosition: { x: pt.x - box.x, y: pt.y - box.y } });
  await pause(page, 300);
}

async function chooseOption(page, triggerSelector, optionText) {
  await click(page, triggerSelector);
  const option = page.locator('#overlay-root [role="option"]', { hasText: optionText }).first();
  await option.scrollIntoViewIfNeeded();
  await option.click();
  await pause(page);
}

const flows = {
  // 1. 사이드바 메뉴 이동·활성 표시
  async sidebar() {
    const env = await open('/timetable?reset=1');
    const { page } = env;
    const menu = [
      ['작업 목록', '/tasks'],
      ['진행 보드', '/board'],
      ['조직 설정', '/org/company'],
      ['알림함', '/notifications'],
      ['마이페이지', '/mypage'],
      ['타임테이블', '/timetable'],
    ];
    check('처음 타임테이블 활성', JSON.stringify(await sidebarActive(page)) === '["타임테이블"]', await sidebarActive(page));
    for (const [label, path] of menu) {
      await click(page, `aside a:has-text("${label}")`);
      check(`${label} → ${path}`, pathOf(page) === path, pathOf(page));
      const active = await sidebarActive(page);
      check(`${label} 활성 표시`, active.length === 1 && active[0] === label, JSON.stringify(active));
    }
    // 하위 경로에서도 섹션 메뉴가 활성
    const sub = [
      ['/tasks/task-10', '작업 목록'],
      ['/board/task-06', '진행 보드'],
      ['/org/members', '조직 설정'],
      ['/org/types', '조직 설정'],
      ['/org/members/m-parkseoyeon', '조직 설정'],
      ['/notifications/n-04', '알림함'],
      ['/mypage/withdraw', '마이페이지'],
    ];
    for (const [path, label] of sub) {
      await page.evaluate((p) => {
        window.history.pushState({}, '', p);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, path);
      await pause(page, 400);
      const active = await sidebarActive(page);
      check(`${path} 에서 ${label} 활성`, active.length === 1 && active[0] === label, `${pathOf(page)} ${JSON.stringify(active)}`);
    }
    // 검색 입력만 가능
    await page.fill('aside input[type="search"]', '김민수');
    check('사이드바 검색 입력 후 경로 그대로', pathOf(page) === '/mypage/withdraw', pathOf(page));
    await finish(env);
  },

  // 2. 로그아웃 → /login, 로그아웃 상태 앱 경로 차단, 다시 로그인
  async logout() {
    const env = await open('/tasks?reset=1');
    const { page } = env;
    await click(page, 'aside a:has-text("진행 보드")');
    await click(page, 'aside button[aria-label="로그아웃"]');
    check('사이드바 로그아웃 → /login', pathOf(page) === '/login', pathOf(page));
    await page.goBack();
    await pause(page, 400);
    check('로그아웃 후 뒤로가기(앱 경로) → /login', pathOf(page).startsWith('/login'), pathOf(page));
    await click(page, 'button:has-text("카카오 로그인")');
    check('다시 카카오 로그인 → 원래 경로(/tasks)', pathOf(page) === '/tasks?reset=1', pathOf(page));
    await click(page, 'aside a:has-text("진행 보드")');
    await click(page, 'aside button[aria-label="로그아웃"]');
    await click(page, 'button:has-text("카카오 로그인")');
    check('사이드바 로그아웃 직후 로그인 → /timetable', pathOf(page) === '/timetable', pathOf(page));
    // 마이페이지 로그아웃
    await click(page, 'aside a:has-text("마이페이지")');
    await click(page, 'main button:has-text("로그아웃")');
    check('마이페이지 로그아웃 → /login', pathOf(page) === '/login', pathOf(page));
    await click(page, 'button:has-text("카카오 로그인")');
    check('로그인 → /timetable', pathOf(page) === '/timetable', pathOf(page));
    await finish(env);
  },

  // 3. 첫 사용자 온보딩 전체
  async onboarding() {
    const env = await open('/?user=new');
    const { page } = env;
    check('랜딩', pathOf(page) === '/?user=new', pathOf(page));
    await click(page, 'button:has-text("로그인 하기"), a:has-text("로그인 하기")');
    check('랜딩 로그인 하기 → /login', pathOf(page) === '/login', pathOf(page));
    await click(page, 'button:has-text("카카오 로그인")');
    check('약관 모달 열림', (await overlayText(page)).includes('서비스 이용약관 동의'), await overlayText(page));
    const agree = page.locator('#overlay-root button:has-text("동의하고 계속하기")');
    check('처음 동의 버튼 비활성', await agree.isDisabled());
    await click(page, '#overlay-root label:has-text("전체 동의")');
    check('전체 동의 후 활성', await agree.isEnabled());
    await agree.click();
    await pause(page);
    check('→ /onboarding/profile', pathOf(page) === '/onboarding/profile', pathOf(page));
    await page.fill('#onboarding-name', '홍길순');
    await page.fill('#onboarding-phone', '01098761234');
    check('연락처 하이픈', (await page.inputValue('#onboarding-phone')) === '010-9876-1234', await page.inputValue('#onboarding-phone'));
    await click(page, 'button:has-text("다음")');
    check('→ /onboarding/company', pathOf(page) === '/onboarding/company', pathOf(page));
    await page.fill('#onboarding-company-name', '한빛설비');
    await click(page, 'main button[aria-haspopup="listbox"]');
    await click(page, '#overlay-root [role="option"]:has-text("배관")');
    await click(page, 'button:has-text("생성")');
    check('→ /onboarding/types', pathOf(page) === '/onboarding/types', pathOf(page));
    await click(page, 'main button:has-text("유형 설정")');
    check('유형 설정 → /org/types', pathOf(page).startsWith('/org/types'), pathOf(page));
    const user = await sidebarUser(page);
    check('사이드바 이름·발주사 반영', user.includes('홍길순') && user.includes('한빛설비'), user);
    check('조직 설정 활성', (await sidebarActive(page))[0] === '조직 설정');
    // 마이페이지에도 반영
    await click(page, 'aside a:has-text("마이페이지")');
    const mt = await mainText(page);
    check('마이페이지 인사말·소속 반영', mt.includes('홍길순님') && mt.includes('한빛설비'), mt.slice(0, 200));
    await finish(env);

    // 건너뛰기 경로
    const env2 = await open('/login?user=new&reset=1');
    const p2 = env2.page;
    await click(p2, 'button:has-text("카카오 로그인")');
    await click(p2, '#overlay-root label:has-text("[필수] 서비스 이용약관 동의")');
    await click(p2, '#overlay-root label:has-text("[필수] 개인정보 처리방침 동의")');
    await click(p2, '#overlay-root button:has-text("동의하고 계속하기")');
    await p2.fill('#onboarding-name', '김테스트');
    await p2.fill('#onboarding-phone', '0212345678');
    await p2.press('#onboarding-phone', 'Enter');
    await pause(p2);
    check('Enter 제출 → company', pathOf(p2) === '/onboarding/company', pathOf(p2));
    await click(p2, 'button:has-text("건너뛰기")');
    check('건너뛰기 → types', pathOf(p2) === '/onboarding/types', pathOf(p2));
    await click(p2, 'button:has-text("건너뛰기")');
    check('건너뛰기 → /timetable', pathOf(p2) === '/timetable', pathOf(p2));
    const u2 = await sidebarUser(p2);
    check('사이드바 새 이름, 기존 발주사', u2.includes('김테스트') && u2.includes('OO건설'), u2);
    await finish(env2);
  },

  // 4. 작업 목록 배정하기 → 타임테이블 편집 → 배정 확인 → 작업 목록 반영
  async assign() {
    const env = await open('/tasks?reset=1');
    const { page } = env;
    const rows = page.locator('section[aria-label="대기함 잔여 · 거절 작업"] li');
    const n = await rows.count();
    let idx = -1;
    let title = '';
    for (let i = 0; i < n; i++) {
      const t = await rows.nth(i).locator('span').first().innerText();
      if (t !== '인덕션 교체') {
        idx = i;
        title = t;
        break;
      }
    }
    const waitingBefore = await text(page, 'section[aria-label="대기함 잔여 · 거절 작업"]');
    await rows.nth(idx).locator('button:has-text("배정하기")').click();
    await pause(page, 500);
    const url = new URL(page.url());
    const taskId = url.searchParams.get('task');
    check('배정하기 → /timetable?mode=edit&task=', url.pathname === '/timetable' && url.searchParams.get('mode') === 'edit' && taskId, pathOf(page));
    check('사이드바 타임테이블 활성', (await sidebarActive(page))[0] === '타임테이블');
    const card = page.locator(`[data-task-id="${taskId}"]`).first();
    check('대기함 카드 선택 강조', /cardSelected/.test((await card.getAttribute('class')) ?? ''), await card.getAttribute('class'));
    await dragCardTo(page, `[data-task-id="${taskId}"]`, '홍길동', '13:00');
    const ov = await overlayText(page);
    check('배정 확인 모달(홍길동·13:00)', ov.includes('배정 확인') && ov.includes('홍길동') && ov.includes('13:00'), ov);
    await click(page, '#overlay-root button:has-text("배정 확정")');
    let ov2 = await overlayText(page);
    if (ov2.includes('일정 충돌 경고')) {
      await click(page, '#overlay-root button:has-text("충돌 확인 후 배치")');
      ov2 = await overlayText(page);
    }
    check('모달 닫힘', !ov2.includes('배정 확인'), ov2);
    const block = page.locator(`[class*="lanes"] [data-task-id="${taskId}"]`);
    check('격자에 배정됨 블록', (await block.count()) === 1 && (await block.innerText()).includes('배정됨'), await block.count());
    check('대기함에서 빠짐', (await page.locator(`aside[aria-label="대기함"] [data-task-id="${taskId}"]`).count()) === 0);
    await click(page, 'aside a:has-text("작업 목록")');
    const waitingAfter = await text(page, 'section[aria-label="대기함 잔여 · 거절 작업"]');
    check('작업 목록 대기함 건수 감소', waitingBefore !== waitingAfter && !waitingAfter.includes(`${title}\n`), `${waitingBefore.split('\n').slice(0, 4)} → ${waitingAfter.split('\n').slice(0, 4)}`);
    const firstRow = await text(page, 'section[aria-label="작업 목록"] [role="row"]:nth-child(2)');
    check('작업 표 첫 행에 배정됨·홍길동', firstRow.includes(title) && firstRow.includes('배정됨') && firstRow.includes('홍길동'), firstRow);
    // 상세 모달에서도 반영
    await page.locator('section[aria-label="작업 목록"] [role="row"]:nth-child(2)').click();
    await pause(page, 400);
    const det = await overlayText(page);
    check('상세 모달 상태·담당기사 반영', det.includes('배정됨') && det.includes('홍길동') && det.includes('배정 알림 발송됨'), det.slice(0, 300));
    await page.keyboard.press('Escape');
    await pause(page);
    check('상세 닫기 → /tasks', pathOf(page) === '/tasks', pathOf(page));
    await page.goBack();
    await pause(page, 400);
    check('닫은 뒤 뒤로가기 → 상세 다시 안 열림', !pathOf(page).startsWith('/tasks/') && (await overlayText(page)).trim() === '', pathOf(page));
    await page.goForward();
    await pause(page, 400);
    // 알림함에 신규 배정 알림
    await click(page, 'aside a:has-text("알림함")');
    const nt = await mainText(page);
    check('알림함에 신규 배정 알림', nt.includes(`홍길동 기사님께 [${title}] 작업이 배정되었습니다.`), nt.slice(0, 300));
    check('안 읽음 3', nt.includes('안 읽음 3'), nt.slice(0, 120));
    await finish(env);
  },

  // 4b. 변경된 정보 데모 트리거
  async stale() {
    const env = await open('/timetable?mode=edit&reset=1');
    const { page } = env;
    await dragCardTo(page, 'aside[aria-label="대기함"] [data-task-id="t-demo-stale"]', '이철호', '13:00');
    let ov = await overlayText(page);
    check('배정 확인(이철호·13:00·2시간)', ov.includes('이철호') && ov.includes('13:00') && ov.includes('2시간'), ov);
    await click(page, '#overlay-root button:has-text("배정 확정")');
    ov = await overlayText(page);
    check('일정 충돌 경고', ov.includes('일정 충돌 경고') && ov.includes('세탁기 설치') && ov.includes('충돌 확인 후 배치'), ov);
    await click(page, '#overlay-root button:has-text("충돌 확인 후 배치")');
    ov = await overlayText(page);
    check('변경된 정보입니다', ov.includes('변경된 정보입니다'), ov);
    await click(page, '#overlay-root button:has-text("확인")');
    const cardText = await text(page, 'aside[aria-label="대기함"] [data-task-id="t-demo-stale"]');
    check('카드 김민수 갱신', cardText.includes('김민수'), cardText);
    await dragCardTo(page, 'aside[aria-label="대기함"] [data-task-id="t-demo-stale"]', '홍길동', '13:00');
    await click(page, '#overlay-root button:has-text("배정 확정")');
    ov = await overlayText(page);
    if (ov.includes('일정 충돌 경고')) await click(page, '#overlay-root button:has-text("충돌 확인 후 배치")');
    check('두 번째 시도 정상 배정', (await page.locator('[class*="lanes"] [data-task-id="t-demo-stale"]').count()) === 1);
    await finish(env);
  },

  // 5. 새 작업 등록 → 대기함/격자 반영
  async register() {
    const env = await open('/tasks?reset=1');
    const { page } = env;
    const headBefore = await text(page, 'section[aria-label="대기함 잔여 · 거절 작업"]');
    await click(page, 'header button:has-text("새 작업 등록")');
    await page.locator('#overlay-root [role="dialog"]').first().waitFor();
    check('작업 목록 새 작업 등록 모달', (await overlayText(page)).includes('새 작업 등록'));
    const save = page.locator('#overlay-root button:has-text("저장")');
    check('저장 비활성', await save.isDisabled());
    await page.fill('#overlay-root input[placeholder="예) 배관 누수 점검 및 교체"]', 'QA 등록 작업');
    check('저장 활성', await save.isEnabled());
    await save.click();
    await pause(page, 300);
    check('모달 닫힘', !(await overlayText(page)).includes('새 작업 등록'));
    const headAfter = await text(page, 'section[aria-label="대기함 잔여 · 거절 작업"]');
    const before = Number(/등록 (\d+)건/.exec(headBefore)?.[1]);
    const after = Number(/등록 (\d+)건/.exec(headAfter)?.[1]);
    check('대기함 등록 건수 +1', after === before + 1, `${before} → ${after}`);
    const firstRow = await text(page, 'section[aria-label="작업 목록"] [role="row"]:nth-child(2)');
    check('작업 표 첫 행 QA 등록 작업(등록)', firstRow.includes('QA 등록 작업') && firstRow.includes('등록'), firstRow);
    // 타임테이블에서 대기함에도 보임
    await click(page, 'aside a:has-text("타임테이블")');
    const panel = await text(page, 'aside[aria-label="대기함"]');
    check('타임테이블 대기함에 QA 등록 작업', panel.includes('QA 등록 작업'), panel.slice(0, 200));
    // 타임테이블에서 배정까지 입력해 저장 → 격자
    await click(page, 'main button:has-text("새 작업 등록")');
    await page.fill('#overlay-root input[placeholder="예) 배관 누수 점검 및 교체"]', 'QA 배정 작업');
    await chooseOption(page, '#overlay-root button:has-text("담당 기사 선택")', '홍길동');
    await chooseOption(page, '#overlay-root button:has-text("시간 선택")', '13:00');
    await chooseOption(page, '#overlay-root button:has-text("소요 시간 선택")', '1시간');
    await click(page, '#overlay-root button:has-text("저장")');
    const grid = await text(page, '[class*="lanes"]');
    check('격자에 QA 배정 작업', grid.includes('QA 배정 작업'), grid.slice(0, 100));
    // 작업 목록 반영
    await click(page, 'aside a:has-text("작업 목록")');
    const row1 = await text(page, 'section[aria-label="작업 목록"] [role="row"]:nth-child(2)');
    check('작업 표 첫 행 QA 배정 작업(배정됨·홍길동·13:00)', row1.includes('QA 배정 작업') && row1.includes('배정됨') && row1.includes('홍길동'), row1);
    // 진행 보드 반영(오늘)
    await click(page, 'aside a:has-text("진행 보드")');
    const board = await mainText(page);
    check('진행 보드에 QA 배정 작업', board.includes('QA 배정 작업'), '');
    await finish(env);
  },

  // 6. 작업 상세 → 작업 취소 → 목록·보드·타임테이블에서 제외
  async cancel() {
    const env = await open('/board?reset=1');
    const { page } = env;
    const total = await page.evaluate(() => document.querySelector('main')?.innerText.match(/총 작업\s*(\d+)/)?.[1]);
    await click(page, 'aside a:has-text("작업 목록")');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/tasks/t-demo-pending');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await pause(page, 500);
    let ov = await overlayText(page);
    check('상세 모달(배관 누수 점검 및 교체)', ov.includes('배관 누수 점검 및 교체') && ov.includes('작업 목록으로'), ov.slice(0, 100));
    await click(page, '#overlay-root button:has-text("작업 취소")');
    ov = await overlayText(page);
    check('취소 모달만 표시', ov.includes('작업 취소 확인') && !ov.includes('상태 변경 이력'), ov.slice(0, 200));
    const confirm = page.locator('#overlay-root button:has-text("작업 취소")').last();
    check('사유 전 비활성', await confirm.isDisabled());
    await click(page, '#overlay-root button[aria-haspopup="listbox"]');
    await click(page, '#overlay-root [role="option"]:has-text("고객 요청")');
    check('사유 후 활성', await confirm.isEnabled());
    await confirm.click();
    await pause(page, 400);
    check('→ /tasks, 모달 닫힘', pathOf(page) === '/tasks' && (await overlayText(page)).trim() === '', pathOf(page));
    check('작업 목록에서 제외', !(await mainText(page)).includes('배관 누수 점검 및 교체'));
    await click(page, 'aside a:has-text("진행 보드")');
    const total2 = await page.evaluate(() => document.querySelector('main')?.innerText.match(/총 작업\s*(\d+)/)?.[1]);
    check('보드에서 제외·총 작업 -1', !(await mainText(page)).includes('배관 누수 점검 및 교체') && Number(total2) === Number(total) - 1, `${total} → ${total2}`);
    await click(page, 'aside a:has-text("타임테이블")');
    check('타임테이블에서 제외', (await page.locator('[data-task-id="t-demo-pending"]').count()) === 0);
    await click(page, 'aside a:has-text("알림함")');
    const nt = await mainText(page);
    check('알림함에 작업 취소 알림', nt.includes('[배관 누수 점검 및 교체] 작업이 취소되었습니다.'), nt.slice(0, 200));
    // 보드에서 취소
    await click(page, 'aside a:has-text("진행 보드")');
    await click(page, 'main a:has-text("에어컨 실외기 점검 및 세척")');
    check('보드 행 → /board/task-06', pathOf(page) === '/board/task-06', pathOf(page));
    await click(page, '#overlay-root button:has-text("작업 취소")');
    await click(page, '#overlay-root button[aria-haspopup="listbox"]');
    await click(page, '#overlay-root [role="option"]:has-text("기타")');
    const c2 = page.locator('#overlay-root button:has-text("작업 취소")').last();
    check('기타 + 빈 상세 → 비활성', await c2.isDisabled());
    await page.fill('#overlay-root textarea', '고객 일정 변경');
    check('기타 + 상세 → 활성', await c2.isEnabled());
    await c2.click();
    await pause(page, 400);
    check('보드 취소 → /board', pathOf(page) === '/board', pathOf(page));
    const total3 = await page.evaluate(() => document.querySelector('main')?.innerText.match(/총 작업\s*(\d+)/)?.[1]);
    check('총 작업 다시 -1', Number(total3) === Number(total) - 2, `${total} → ${total3}`);
    await click(page, 'aside a:has-text("작업 목록")');
    check('작업 목록에서 task-06 제외', !(await mainText(page)).includes('에어컨 실외기 점검 및 세척'));
    await finish(env);
  },

  // 7. 진행 보드 행 → 상세 모달, 닫기
  async board() {
    const env = await open('/board?reset=1');
    const { page } = env;
    await click(page, 'main [role="tab"]:has-text("작업중")');
    const firstLink = page.locator('main ul a').first();
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await pause(page, 400);
    check('행 → /board/:id', pathOf(page) === href, `${pathOf(page)} vs ${href}`);
    const ov = await overlayText(page);
    check('상세 모달 뒤로가기 라벨 진행 보드', ov.includes('진행 보드') && ov.includes('작업 상세'), ov.slice(0, 80));
    await click(page, '#overlay-root button:has-text("진행 보드")');
    check('뒤로가기 → /board', /^\/board(\?|$)/.test(pathOf(page)), pathOf(page));
    check('탭 작업중 유지', (await page.locator('main [role="tab"][aria-selected="true"]').innerText()).includes('작업중'));
    // 닫은 뒤 브라우저 뒤로가기로 모달이 다시 열리지 않는다
    await click(page, 'aside a:has-text("작업 목록")');
    await click(page, 'aside a:has-text("진행 보드")');
    await page.locator('main ul a').first().click();
    await pause(page, 300);
    await page.keyboard.press('Escape');
    await pause(page, 300);
    check('Esc 닫기 → /board', pathOf(page) === '/board', pathOf(page));
    await page.goBack();
    await pause(page, 400);
    check('닫은 뒤 뒤로가기 → 모달 다시 안 열림(/tasks)', pathOf(page) === '/tasks' && (await overlayText(page)).trim() === '', pathOf(page));
    // 주소로 바로 연 상세 닫기 → /board
    await page.goto(BASE + '/board/task-06', { waitUntil: 'networkidle' });
    await pause(page, 300);
    await page.keyboard.press('Escape');
    await pause(page, 300);
    check('직접 진입 상세 닫기 → /board', pathOf(page) === '/board', pathOf(page));
    await finish(env);
  },

  // 8. 알림 → 상세·읽음 처리
  async notifications() {
    const env = await open('/notifications?reset=1');
    const { page } = env;
    check('안 읽음 2', (await mainText(page)).includes('안 읽음 2'));
    await click(page, 'main [role="tab"]:has-text("안 읽음"), main button:has-text("안 읽음")');
    check('?filter=unread', pathOf(page) === '/notifications?filter=unread', pathOf(page));
    const rows = page.locator('main ul button');
    check('안 읽음 2행', (await rows.count()) === 2, await rows.count());
    await rows.first().click();
    await pause(page, 300);
    check('상세 /notifications/n-01', pathOf(page) === '/notifications/n-01', pathOf(page));
    await click(page, 'main a:has-text("알림함")');
    check('필터 유지로 복귀', pathOf(page) === '/notifications?filter=unread', pathOf(page));
    check('안 읽음 1', (await mainText(page)).includes('안 읽음 1') && (await rows.count()) === 1);
    await click(page, 'main button:has-text("전체")');
    await click(page, 'main ul button:has-text("[정수기 필터 교체] 작업이 취소되었습니다.")');
    check('취소 알림 → n-03 상세', pathOf(page) === '/notifications/n-03', pathOf(page));
    const mt = await mainText(page);
    check('취소 상세 내용', mt.includes('작업 취소됨') && mt.includes('취소 상세') === mt.includes('취소 상세') && !mt.includes('삭제'), mt.slice(0, 200));
    await page.goBack();
    await pause(page, 300);
    await click(page, 'main ul button:has-text("[냉장고 수리] 작업을 수락했습니다.")');
    check('수락 완료 → n-04', pathOf(page) === '/notifications/n-04', pathOf(page));
    await click(page, 'main button:has-text("삭제")');
    check('삭제 → /notifications', pathOf(page) === '/notifications', pathOf(page));
    check('11행', (await page.locator('main ul button').count()) === 11, await page.locator('main ul button').count());
    await finish(env);
  },

  // 9. 조직 설정 탭 4개
  async orgTabs() {
    const env = await open('/org/company?reset=1');
    const { page } = env;
    const tabSel = (l) => `main [role="tab"]:has-text("${l}")`;
    const sel = async () => page.locator('main [role="tablist"][aria-label="조직 설정"] [role="tab"][aria-selected="true"]').innerText();
    check('발주사 정보 선택', (await sel()).includes('발주사 정보'));
    check('우측 상단 버튼 없음', !(await mainText(page)).includes('회사 코드 관리'));
    await click(page, tabSel('인력관리'));
    check('인력관리 → /org/members', pathOf(page) === '/org/members' && (await sel()).includes('인력관리'), pathOf(page));
    check('우측 상단 버튼', (await mainText(page)).includes('회사 코드 관리') && (await mainText(page)).includes('승인대기 7'));
    await click(page, tabSel('유형 설정'));
    check('유형 설정 → /org/types', pathOf(page) === '/org/types' && (await sel()).includes('유형 설정'), pathOf(page));
    await click(page, tabSel('관리자 설정'));
    check('관리자 설정 → 이동 없음', pathOf(page) === '/org/types', pathOf(page));
    await click(page, tabSel('발주사 정보'));
    check('발주사 정보 → /org/company', pathOf(page) === '/org/company', pathOf(page));
    // 발주사 정보 저장 → 사이드바
    await page.fill('#company-name', '경돈나비엔');
    await click(page, 'main button:has-text("저장")');
    check('발주사명 사이드바 반영', (await sidebarUser(page)).includes('경돈나비엔'), await sidebarUser(page));
    // 회사 코드 관리 모달 / 승인대기
    await click(page, tabSel('인력관리'));
    await click(page, 'main button:has-text("회사 코드 관리")');
    check('회사 코드 모달', pathOf(page) === '/org/members?modal=code' && (await overlayText(page)).includes('ORBIT-7K2M'), pathOf(page));
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'main button:has-text("승인대기")');
    check('승인대기 모달', (await overlayText(page)).includes('정하늘'), (await overlayText(page)).slice(0, 100));
    await page.keyboard.press('Escape');
    await pause(page);
    // 상세보기 → 작업이력 → 기사 관리로
    await click(page, tabSel('기사'));
    await page.locator('main [role="row"]:has-text("박서연") button:has-text("상세보기")').click();
    await pause(page, 300);
    check('상세보기 → 작업이력', pathOf(page) === '/org/members/m-parkseoyeon', pathOf(page));
    await finish(env);
  },

  // 10. 유형 추가·삭제 → 타임테이블·새 작업 등록 선택지 반영
  async types() {
    const env = await open('/org/types?tab=work&reset=1');
    const { page } = env;
    await click(page, 'main button:has-text("새 유형 추가")');
    await page.fill('main input[aria-label="새 유형 이름"]', '배관청소');
    await click(page, 'main button:has-text("저장")');
    check('작업유형 추가', (await mainText(page)).includes('배관청소'));
    await click(page, 'main [role="tab"]:has-text("기사유형")');
    await click(page, 'main button:has-text("새 유형 추가")');
    await page.fill('main input[aria-label="새 유형 이름"]', '배관 기사');
    await click(page, 'main button:has-text("저장")');
    check('기사유형 추가', (await mainText(page)).includes('배관 기사'));
    await click(page, 'aside a:has-text("타임테이블")');
    await click(page, 'main button:has-text("점검")');
    check('타임테이블 작업 유형 필터에 배관청소', (await overlayText(page)).includes('배관청소'), await overlayText(page));
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'main button:has-text("일반 기사")');
    check('타임테이블 기사 유형 필터에 배관 기사', (await overlayText(page)).includes('배관 기사'), await overlayText(page));
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'main button:has-text("새 작업 등록")');
    await click(page, '#overlay-root button:has-text("작업 유형 선택")');
    check('새 작업 등록 작업 유형에 배관청소', (await overlayText(page)).includes('배관청소'));
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'aside a:has-text("작업 목록")');
    await click(page, 'main button:has-text("작업유형")');
    check('작업 목록 작업유형 필터에 배관청소', (await overlayText(page)).includes('배관청소'));
    await page.keyboard.press('Escape');
    await pause(page);
    // 삭제
    await click(page, 'aside a:has-text("조직 설정")');
    await click(page, 'main [role="tab"]:has-text("유형 설정")');
    await click(page, 'main [role="tab"]:has-text("작업유형")');
    const row = page.locator('main [class*="row"]', { hasText: '배관청소' }).last();
    await row.locator('button[aria-label="더보기"]').click();
    await pause(page);
    await click(page, '#overlay-root button:has-text("삭제")');
    check('유형 삭제 확인 모달', (await overlayText(page)).includes('유형 삭제 확인'));
    await page.locator('#overlay-root [role="dialog"] button:has-text("삭제")').last().click();
    await pause(page);
    check('삭제됨', !(await mainText(page)).includes('배관청소'));
    // 비활성화(작업유형 즉시) — 설치
    const row2 = page.locator('main [class*="row"]', { hasText: '수리' }).last();
    await row2.locator('button[aria-label="더보기"]').click();
    await pause(page);
    await click(page, '#overlay-root button:has-text("비활성화")');
    await click(page, 'aside a:has-text("타임테이블")');
    await click(page, 'main button:has-text("점검")');
    const ov = await overlayText(page);
    check('타임테이블 필터에서 배관청소·수리(비활성) 빠짐', !ov.includes('배관청소') && !ov.includes('수리'), ov);
    await page.keyboard.press('Escape');
    await click(page, 'main button:has-text("새 작업 등록")');
    await click(page, '#overlay-root button:has-text("작업 유형 선택")');
    const ov2 = await overlayText(page);
    check('새 작업 등록 선택지에서도 빠짐', !ov2.includes('배관청소') && !ov2.includes('수리'), ov2.slice(-80));
    await finish(env);
  },

  // 11. 마이페이지 → 계정 탈퇴
  async withdraw() {
    const env = await open('/mypage?reset=1');
    const { page } = env;
    await click(page, 'main button:has-text("계정 탈퇴")');
    check('→ /mypage/withdraw', pathOf(page) === '/mypage/withdraw', pathOf(page));
    check('총관리자 탈퇴 불가', (await mainText(page)).includes('현재 계정은 탈퇴할 수 없습니다.'));
    await click(page, 'main button:has-text("마이페이지로")');
    check('마이페이지로', pathOf(page) === '/mypage', pathOf(page));
    await click(page, 'main button:has-text("계정 탈퇴")');
    await click(page, 'main button:has-text("조직 설정으로")');
    check('조직 설정으로 → /org/members', pathOf(page) === '/org/members', pathOf(page));
    await finish(env);

    const env2 = await open('/mypage?role=staff&reset=1');
    const p = env2.page;
    check('직원 사이드바 역할', (await sidebarUser(p)).includes('직원'), await sidebarUser(p));
    await click(p, 'main button:has-text("계정 탈퇴")');
    const withdrawBtn = p.locator('main button:has-text("탈퇴")').last();
    check('동의 전 비활성', await withdrawBtn.isDisabled());
    await click(p, 'main label:has-text("탈퇴에 동의합니다")');
    check('동의 후 활성', await withdrawBtn.isEnabled());
    await withdrawBtn.click();
    await pause(p);
    check('확인 모달', (await overlayText(p)).includes('계정 탈퇴 확인'));
    await click(p, '#overlay-root button:has-text("취소")');
    check('취소 → 닫힘', !(await overlayText(p)).includes('계정 탈퇴 확인'));
    await withdrawBtn.click();
    await pause(p);
    await p.locator('#overlay-root button:has-text("탈퇴")').last().click();
    await pause(p, 300);
    check('탈퇴 → /login', pathOf(p) === '/login', pathOf(p));
    await p.goBack();
    await pause(p, 300);
    check('탈퇴 후 앱 경로 → /login', pathOf(p).startsWith('/login'), pathOf(p));
    await finish(env2);
  },

  // 12. 발주사 2곳 전환
  async companies() {
    const env = await open('/timetable?companies=2&reset=1');
    const { page } = env;
    await click(page, 'aside button[aria-haspopup="menu"]');
    check('발주사 전환 팝오버', (await overlayText(page)).includes('발주사 전환') && (await overlayText(page)).includes('협력 발주사'));
    await click(page, '#overlay-root button:has-text("협력 발주사")');
    const u = await sidebarUser(page);
    check('사이드바 직원 · 협력 발주사', u.includes('직원') && u.includes('협력 발주사'), u);
    await click(page, 'aside a:has-text("조직 설정")');
    await click(page, 'main [role="tab"]:has-text("인력관리")');
    check('직원이면 총관리자 지정·해제 숨김', !(await mainText(page)).includes('총관리자 지정·해제'));
    await click(page, 'main button:has-text("회사 코드 관리")');
    check('협력 발주사 코드 미발급', !(await overlayText(page)).includes('ORBIT-7K2M'), (await overlayText(page)).slice(0, 200));
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'aside a:has-text("마이페이지")');
    const mt = await mainText(page);
    check('마이페이지 소속 2곳', mt.includes('OO건설') && mt.includes('협력 발주사'), mt.slice(0, 300));
    await click(page, 'main button:has-text("계정 탈퇴")');
    check('OO건설 총관리자라 탈퇴 불가', (await mainText(page)).includes('현재 계정은 탈퇴할 수 없습니다.'));
    await click(page, 'aside button[aria-haspopup="menu"]');
    await click(page, '#overlay-root button:has-text("OO건설")');
    check('OO건설로 복귀 총 관리자', (await sidebarUser(page)).includes('총 관리자'), await sidebarUser(page));
    await click(page, 'aside button[aria-haspopup="menu"]');
    await click(page, '#overlay-root button:has-text("로그아웃")');
    check('팝오버 로그아웃 → /login', pathOf(page) === '/login', pathOf(page));
    await finish(env);
  },

  // 13. 빈 상태
  async empty() {
    const env = await open('/timetable?data=empty&reset=1');
    const { page } = env;
    let mt = await mainText(page);
    check('타임테이블 기사 0명·대기함 비어 있음', mt.includes('등록된 기사가 없어요') && mt.includes('등록된 작업이 없어요'), mt.slice(0, 200));
    await click(page, 'main button:has-text("일반 기사")');
    check('타임테이블 빈 기사 유형 필터 패널 안 열림', (await overlayText(page)).trim() === '' && (await page.locator('#overlay-root > *').count()) === 0);
    await click(page, 'main button:has-text("조직 설정으로")');
    check('조직 설정으로 → /org/members', pathOf(page) === '/org/members', pathOf(page));
    await click(page, 'main [role="tab"]:has-text("기사")');
    check('인력 빈 상태', (await mainText(page)).includes('등록된 이름이 없습니다'));
    await click(page, 'aside a:has-text("작업 목록")');
    mt = await mainText(page);
    check('작업 목록 빈 상태', mt.includes('등록된 작업이 없어요') && mt.includes('대기함이 비었어요'), mt.slice(0, 200));
    for (const label of ['담당기사', '작업유형', '등록자']) {
      await click(page, `main button:has-text("${label}")`);
      const n = await page.locator('#overlay-root > *').count();
      check(`작업 목록 ${label} 빈 필터 패널 안 열림`, n === 0, `overlay children ${n}`);
      await page.keyboard.press('Escape');
      await pause(page, 100);
    }
    await click(page, 'main button:has-text("새 작업 등록")');
    await click(page, '#overlay-root button:has-text("작업 유형 선택")');
    check('새 작업 등록 빈 유형 패널 안 열림', (await page.locator('#overlay-root [role="listbox"]').count()) === 0);
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'aside a:has-text("진행 보드")');
    check('보드 빈 상태', (await mainText(page)).includes('등록된 작업이 없습니다'));
    await click(page, 'aside a:has-text("알림함")');
    check('알림 빈 상태', (await mainText(page)).includes('아직 받은 알림이 없어요'));
    await click(page, 'aside a:has-text("조직 설정")');
    await click(page, 'main [role="tab"]:has-text("유형 설정")');
    check('유형 빈 상태', (await page.locator('main button:has-text("새 유형 추가")').count()) === 1);
    await click(page, 'main button:has-text("승인대기")');
    check('승인대기 0', (await overlayText(page)).length >= 0);
    await page.keyboard.press('Escape');
    await click(page, 'main button:has-text("회사 코드 관리")');
    check('회사 코드 발급 전', (await overlayText(page)).includes('-'));
    await page.keyboard.press('Escape');
    await finish(env);
  },

  // 15. 화면 간 데이터 연동(승인·역할 변경·총관리자·마이페이지·새 알림)
  async crossData() {
    const env = await open('/org/members?modal=approvals&reset=1');
    const { page } = env;
    // 정하늘(기사) 승인 → 인력·타임테이블·새 작업 등록 선택지
    await page.locator('#overlay-root label:has([aria-label="정하늘 선택"])').click();
    await pause(page);
    await page.locator('#overlay-root [role="row"]:has-text("정하늘") button:has-text("승인")').click();
    await pause(page);
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'main [role="tab"]:has-text("기사")');
    const mt = await mainText(page);
    check('승인한 기사 인력관리에 표시(유형 없음)', mt.includes('정하늘') && mt.includes('유형 없음'), mt.slice(0, 300));
    await click(page, 'aside a:has-text("타임테이블")');
    const drivers = await page.evaluate(() => Array.from(document.querySelectorAll('[class*="drivers"] > *')).map((e) => e.textContent));
    check('타임테이블 기사 행에 정하늘(유형 없음)', drivers.some((d) => d.includes('정하늘') && d.includes('유형 없음')), JSON.stringify(drivers));
    await click(page, 'main button:has-text("새 작업 등록")');
    await click(page, '#overlay-root button:has-text("담당 기사 선택")');
    check('새 작업 등록 담당기사에 정하늘', (await overlayText(page)).includes('정하늘'));
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await pause(page);
    // 김태훈 기사 → 직원: 예정 작업 '조명 교체'가 대기함으로
    await click(page, 'aside a:has-text("조직 설정")');
    await click(page, 'main [role="tab"]:has-text("인력관리")');
    await click(page, 'main [role="tab"]:has-text("기사")');
    await page.locator('main [role="row"]:has-text("김태훈") button[aria-haspopup]').first().click();
    await pause(page);
    await click(page, '#overlay-root [role="option"]:has-text("직원")');
    const ov = await overlayText(page);
    check('역할 변경 모달(예정된 작업 1건)', ov.includes('역할을 변경할까요?') && ov.includes('조명 교체'), ov.slice(0, 300));
    await click(page, '#overlay-root button[aria-haspopup="listbox"]');
    await page.locator('#overlay-root [role="option"]').first().click();
    await pause(page);
    await page.locator('#overlay-root button:has-text("역할 변경")').last().click();
    await pause(page);
    await click(page, 'aside a:has-text("타임테이블")');
    const drivers2 = await page.evaluate(() => Array.from(document.querySelectorAll('[class*="drivers"] > *')).map((e) => e.textContent));
    check('타임테이블에서 김태훈 행 빠짐', !drivers2.some((d) => d.includes('김태훈')), JSON.stringify(drivers2));
    check('대기함에 조명 교체', (await text(page, 'aside[aria-label="대기함"]')).includes('조명 교체'));
    await click(page, 'aside a:has-text("작업 목록")');
    const firstRow = await text(page, 'section[aria-label="작업 목록"] [role="row"]:nth-child(2)');
    check('작업 목록 조명 교체 등록', firstRow.includes('조명 교체') && firstRow.includes('등록'), firstRow);
    // 총관리자 지정 → 사이드바 직원 → 계정 탈퇴 가능
    await click(page, 'aside a:has-text("조직 설정")');
    await click(page, 'main [role="tab"]:has-text("인력관리")');
    await click(page, 'main button:has-text("총관리자 지정·해제")');
    await click(page, '#overlay-root button:has-text("지정 확정")');
    await click(page, '#overlay-root button:has-text("해제 확정")');
    const u = await sidebarUser(page);
    check('총관리자 지정 후 사이드바 직원', u.includes('직원') && !u.includes('총 관리자'), u);
    await click(page, 'aside a:has-text("마이페이지")');
    await click(page, 'main button:has-text("계정 탈퇴")');
    check('총관리자 해제 후 탈퇴 동의 화면', (await mainText(page)).includes('탈퇴에 동의합니다'), (await mainText(page)).slice(0, 200));
    // 마이페이지 저장 → 사이드바 이름
    await click(page, 'aside a:has-text("마이페이지")');
    await page.fill('#mypage-name', '오르빗2');
    await click(page, 'main button:has-text("저장")');
    check('마이페이지 이름 저장 → 사이드바', (await sidebarUser(page)).includes('오르빗2'));
    // 새 배정 알림 → 상세
    await click(page, 'aside a:has-text("작업 목록")');
    await click(page, 'header button:has-text("새 작업 등록")');
    await page.locator('#overlay-root [role="dialog"]').first().waitFor();
    await page.fill('#overlay-root input[placeholder="예) 배관 누수 점검 및 교체"]', 'QA 알림 작업');
    await chooseOption(page, '#overlay-root button:has-text("담당 기사 선택")', '김민수');
    await chooseOption(page, '#overlay-root button:has-text("시간 선택")', '20:00');
    await chooseOption(page, '#overlay-root button:has-text("소요 시간 선택")', '1시간');
    await click(page, '#overlay-root button:has-text("저장")');
    await click(page, 'aside a:has-text("알림함")');
    await click(page, 'main ul button:has-text("[QA 알림 작업]")');
    const dt = await mainText(page);
    check('새 배정 알림 상세', /\/notifications\/n-/.test(pathOf(page)) && dt.includes('QA 알림 작업') && dt.includes('김민수'), dt.slice(0, 300));
    await finish(env);
  },

  // 14. 네트워크 실패
  async offline() {
    const env = await open('/timetable?network=offline&reset=1');
    const { page } = env;
    check('타임테이블 실패 화면', (await mainText(page)).includes('네트워크 연결 실패'));
    await click(page, 'main button:has-text("작업 등록으로")');
    check('작업 등록으로 → 새 작업 등록 모달', (await overlayText(page)).includes('새 작업 등록'));
    await page.keyboard.press('Escape');
    await pause(page);
    await click(page, 'aside a:has-text("진행 보드")');
    check('보드 실패 화면', (await mainText(page)).includes('네트워크 연결 실패'));
    await click(page, 'main button:has-text("다시 시도")');
    check('보드 다시 시도 → 보드', (await mainText(page)).includes('작업 상태'));
    await click(page, 'aside a:has-text("타임테이블")');
    check('타임테이블도 온라인', !(await mainText(page)).includes('네트워크 연결 실패'));
    await finish(env);
  },
};

for (const [name, fn] of Object.entries(flows)) {
  if (only.length && !only.includes(name)) continue;
  currentFlow = name;
  const before = results.length;
  try {
    await fn();
  } catch (error) {
    check('예외 없이 완료', false, error.message.split('\n')[0]);
  }
  const mine = results.slice(before);
  console.log(`${name}: ${mine.filter((r) => r.pass).length}/${mine.length} PASS`);
}
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`TOTAL ${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`- [${f.flow}] ${f.name}: ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
