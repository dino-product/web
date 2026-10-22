// Real-backend regression: node scripts/check-flows.mjs [baseUrl] [--no-seed] [flow ...]
// VIEWPORT=1440x900 overrides the browser viewport. Services must already be running.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const started = Date.now();
const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const BASE = args.find((arg) => /^https?:\/\//.test(arg)) ?? 'http://localhost:5173';
const selected = args.filter((arg) => !/^https?:\/\//.test(arg) && arg !== '--no-seed');
const [width, height] = (process.env.VIEWPORT ?? '1920x1080').split('x').map(Number);
assert(width > 0 && height > 0, 'VIEWPORT must be WIDTHxHEIGHT');
let seed;
let browser;
const results = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(BASE)).ok) return; } catch {}
    await delay(500);
  }
  throw new Error(`Frontend did not become ready: ${BASE}`);
}
const org = () => seed.organizationIds['OO건설'];
const work = (label) => seed.workIds[label];
const apiPath = (suffix) => `/api/v1/organizations/${org()}${suffix}`;
const pathname = (page) => new URL(page.url()).pathname;
const overlay = (page) => page.locator('#overlay-root');
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function textIncludes(locator, text) {
  await locator.filter({ hasText: text }).first().waitFor({ state: 'visible' });
}
async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
}
async function option(page, trigger, name) {
  await page.locator(trigger).click();
  await page.getByRole('option', { name, exact: true }).click();
}
async function login(env, path = '/timetable', persona = '') {
  await go(env.page, `/login${persona}`);
  await button(env.page, '카카오 로그인').click();
  await env.page.waitForURL('**/timetable');
  await env.page.locator('main [aria-label="다음 날짜"]').waitFor();
  await env.page.waitForTimeout(300);
  await env.page.waitForLoadState('networkidle');
  if (path !== '/timetable') await go(env.page, path);
}
async function response(env, method, path, status, action) {
  const [r] = await Promise.all([
    env.page.waitForResponse((r) => r.request().method() === method && new URL(r.url()).pathname === path),
    action(),
  ]);
  assert.equal(r.status(), status, `${method} ${path}: ${r.status()} ${await r.text()}`);
  await env.page.waitForTimeout(200);
  await env.page.waitForLoadState('networkidle');
  return r;
}
async function seen(env, method, suffix) {
  assert(env.responses.some((r) => r.method === method && new URL(r.url).pathname.endsWith(suffix) && r.status >= 200 && r.status < 300), `Missing successful ${method} ${suffix}`);
}
async function gridPoint(page, name, time) {
  return page.evaluate(({ name, time }) => {
    const lanes = document.querySelector('[class*="lanes"]');
    const row = [...document.querySelectorAll('[class*="drivers"] > *')].findIndex((el) => el.textContent.includes(name));
    if (!lanes || row < 0) throw new Error(`Missing grid row: ${name}`);
    const rect = lanes.getBoundingClientRect();
    const zoom = rect.width / lanes.offsetWidth;
    const [h, m] = time.split(':').map(Number);
    return { x: ((h + m / 60) * 156 + 20) * zoom, y: (row * 111 + 55) * zoom };
  }, { name, time });
}
async function drag(page, id, name, time) {
  const source = page.locator(`aside[aria-label="대기함"] [data-task-id="${id}"]`);
  await source.dragTo(page.locator('[class*="lanes"]').first(), { targetPosition: await gridPoint(page, name, time) });
  await textIncludes(overlay(page), '배정 확인');
}
function staffToken() {
  const values = Object.fromEntries(readFileSync(`${root}/.env.development.local`, 'utf8').split('\n').filter((line) => line.includes('=')).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')];
  }));
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256' })}.${encode({ iss: values.VITE_DEV_AUTH_JWT_ISSUER ?? 'orbit', sub: String(seed.accountIds['김운영']), jti: randomUUID(), iat: now, exp: now + 3600, token_use: 'access' })}`;
  return `${unsigned}.${createHmac('sha256', values.VITE_DEV_AUTH_JWT_SECRET).update(unsigned).digest('base64url')}`;
}

const flows = {
  async auth(env) {
    const { page } = env;
    await login(env);
    await page.locator('aside button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: '로그아웃', exact: true }).click();
    await page.waitForURL('**/login');
    await go(page, '/tasks');
    assert.equal(pathname(page), '/login');
    await button(page, '카카오 로그인').click();
    await page.waitForURL('**/tasks');
    await textIncludes(page.locator('main'), '작업 목록');
  },
  async timetable(env) {
    const { page } = env;
    await login(env);
    const participants = JSON.parse(env.responses.findLast((r) => new URL(r.url).pathname.endsWith('/participants')).body).result.participants;
    for (const member of participants.filter((m) => m.role === 'TECHNICIAN' && m.status === 'ACTIVE')) await textIncludes(page.locator('[class*="drivers"]').first(), member.name);
    await page.locator(`[class*="lanes"] [data-task-id="${work('demo-conflict')}"]`).waitFor();
    const initial = env.responses.findLast((r) => new URL(r.url).pathname.endsWith('/timetable')).url;
    const prev = await response(env, 'GET', apiPath('/timetable'), 200, () => button(page, '이전 날짜').click());
    assert.notEqual(new URL(prev.url()).search, new URL(initial).search, 'Previous date must change API range');
    const next = await response(env, 'GET', apiPath('/timetable'), 200, () => button(page, '다음 날짜').click());
    assert.equal(new URL(next.url()).search, new URL(initial).search);
    await button(page, '편집').click();
    const id = work('task-34');
    await drag(page, id, '홍길동', '13:00');
    await response(env, 'PUT', apiPath(`/works/${id}/assignment`), 200, () => button(page, '배정 확정').click());
    await page.locator(`aside[aria-label="대기함"] [data-task-id="${id}"]`).waitFor({ state: 'detached' });
    const conflictId = work('demo-rejected');
    await drag(page, conflictId, '이철호', '13:00');
    await button(page, '배정 확정').click();
    await textIncludes(overlay(page), '일정 충돌 경고');
    await response(env, 'PUT', apiPath(`/works/${conflictId}/assignment`), 200, () => button(page, '충돌 확인 후 배치').click());
    await page.locator(`aside[aria-label="대기함"] [data-task-id="${conflictId}"]`).waitFor({ state: 'detached' });
    await go(page, '/timetable?mode=edit');
    const staleId = work('demo-stale');
    const update = await page.evaluate(async ({ url, token }) => {
      const r = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'QA 동시 수정 인덕션 교체' }) });
      return { status: r.status, body: await r.text() };
    }, { url: apiPath(`/works/${staleId}`), token: staffToken() });
    assert.equal(update.status, 204, JSON.stringify(update));
    env.expectedErrors.push({ method: 'PUT', path: apiPath(`/works/${staleId}/assignment`), status: 409, code: 'SCHEDULE-016' });
    await drag(page, staleId, '이철호', '13:00');
    await button(page, '배정 확정').click();
    await textIncludes(overlay(page), '일정 충돌 경고');
    const stale = await response(env, 'PUT', apiPath(`/works/${staleId}/assignment`), 409, () => button(page, '충돌 확인 후 배치').click());
    assert.match(await stale.text(), /SCHEDULE-016/);
    await textIncludes(overlay(page), '변경된 정보입니다');
    await response(env, 'GET', apiPath('/timetable'), 200, () => overlay(page).getByRole('button', { name: '확인', exact: true }).click());
  },
  async register(env) {
    const { page } = env;
    await login(env, '/tasks');
    await button(page, '새 작업 등록').click();
    await page.getByPlaceholder('예) 배관 누수 점검 및 교체').fill('QA 등록 작업');
    await page.getByPlaceholder('고객 이름').fill('QA 고객');
    await option(page, '#overlay-root button:has-text("담당 기사 선택")', '홍길동');
    await response(env, 'POST', apiPath('/works'), 200, () => button(page, '저장').click());
    await textIncludes(page.locator('main'), 'QA 등록 작업');
  },
  async tasks(env) {
    const { page } = env;
    await login(env, '/tasks');
    await textIncludes(page.locator('main'), '가스보일러 점검');
    await go(page, `/tasks/${work('demo-completed')}`);
    await seen(env, 'GET', `/works/${work('demo-completed')}`);
    await textIncludes(overlay(page), '완료 보고');
    await textIncludes(overlay(page), '누수');
    await go(page, `/tasks/${work('demo-no-report')}`);
    await response(env, 'POST', apiPath(`/works/${work('demo-no-report')}/completion-report-requests`), 200, () => button(page, '기사에게 요청 보내기').click());
    await go(page, `/tasks/${work('demo-accepted')}`);
    const detail = JSON.parse(env.responses.findLast((r) => new URL(r.url).pathname.endsWith(`/works/${work('demo-accepted')}`)).body).result;
    await button(page, '작업 취소').click();
    await option(page, '#overlay-root button[aria-haspopup="listbox"]', '고객 요청');
    await response(env, 'POST', apiPath(`/works/${work('demo-accepted')}/cancellation`), 204, () => overlay(page).getByRole('button', { name: '작업 취소', exact: true }).click());
    await page.waitForURL('**/tasks');
    assert(!(await page.locator('section[aria-label="작업 목록"]').innerText()).includes(detail.name), `Canceled work remains: ${detail.name}`);
    const [download, exported] = await Promise.all([
      page.waitForEvent('download'),
      response(env, 'GET', apiPath('/works/export'), 200, () => button(page, '작업내역 출력').click()),
    ]);
    assert.match(exported.headers()['content-type'], /spreadsheetml/);
    assert.match(download.suggestedFilename(), /\.xlsx$/);
    assert.equal(await download.failure(), null);
    const bytes = readFileSync(await download.path());
    assert(bytes.length > 0, 'Downloaded XLSX must not be empty');
    assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'Export must be an XLSX ZIP');
  },
  async board(env) {
    const { page } = env;
    await login(env, '/board');
    await seen(env, 'GET', '/progress-board');
    await textIncludes(page.locator('main'), '총 작업');
    const row = page.locator('main ul a').first();
    const href = await row.getAttribute('href');
    await response(env, 'GET', apiPath(`/works/${href.split('/').at(-1)}`), 200, () => row.click());
    await page.waitForURL(`**${href}`);
    await textIncludes(overlay(page), '작업 상세');
    await seen(env, 'GET', `/works/${href.split('/').at(-1)}`);
  },
  async notifications(env) {
    const { page } = env;
    await login(env, '/notifications');
    await seen(env, 'GET', '/notifications');
    const notifications = JSON.parse(env.responses.findLast((r) => new URL(r.url).pathname.endsWith('/notifications')).body).result.notifications;
    const notification = notifications.find((item) => !item.read && item.type !== 'WORK_CANCELED');
    assert(notification, 'Seed must contain an unread linked-work notification');
    await response(env, 'PUT', `/api/v1/notifications/${notification.id}/read`, 204, () => page.locator('main ul button').filter({ hasText: notification.message }).click());
    await textIncludes(page.locator('main'), '작업 정보');
    await textIncludes(page.locator('main'), '작업명');
    const detail = JSON.parse(env.responses.findLast((r) => new URL(r.url).pathname.endsWith(`/works/${notification.workId}`)).body).result;
    await textIncludes(page.locator('main'), detail.name);
    const count = env.responses.length;
    await button(page, '삭제').click();
    await page.waitForURL(/\/notifications(?:\?|$)/);
    assert(!env.responses.slice(count).some((r) => r.method === 'DELETE'), 'Notification deletion must remain local');
  },
  async 'org-company'(env) {
    const { page } = env;
    await login(env, '/org/company');
    const original = await page.locator('#company-name').inputValue();
    await page.locator('#company-name').fill('QA 발주사');
    await response(env, 'PUT', apiPath(''), 200, () => button(page, '저장').click());
    await textIncludes(page.locator('aside').first(), 'QA 발주사');
    await page.locator('#company-name').fill('취소할 변경');
    await button(page, '취소').click();
    assert.equal(await page.locator('#company-name').inputValue(), 'QA 발주사');
    await page.locator('#company-name').fill(original);
    await response(env, 'PUT', apiPath(''), 200, () => button(page, '저장').click());
  },
  async 'org-members'(env) {
    const { page } = env;
    await login(env, '/org/members');
    await seen(env, 'GET', '/participants');
    const counts = JSON.parse(env.responses.findLast((r) => new URL(r.url).pathname.endsWith('/participants')).body).result.counts;
    for (const [label, count] of [['전체', counts.all], ['직원', counts.staff], ['기사', counts.technician]]) {
      await page.getByRole('tab', { name: new RegExp(`^${label} *${count}$`) }).waitFor();
    }
    await textIncludes(page.locator('main'), '승인대기 7');
    await page.locator('main button:has-text("승인대기")').click();
    await page.locator('#overlay-root label:has([aria-label="정하늘 선택"])').click();
    await response(env, 'POST', apiPath('/participation-requests/approvals'), 200, () => page.locator('#overlay-root [role="row"]:has-text("정하늘")').getByRole('button', { name: '승인', exact: true }).click());
    await page.locator('#overlay-root label:has([aria-label="오세훈 선택"])').click();
    await page.locator('#overlay-root [role="row"]:has-text("오세훈")').getByRole('button', { name: '거절', exact: true }).click();
    await page.locator('#reject-reason').fill('QA 신청 정보 확인 필요');
    await response(env, 'POST', apiPath('/participation-requests/rejections'), 200, () => overlay(page).getByRole('button', { name: '거절', exact: true }).last().click());
    await page.keyboard.press('Escape');
    await button(page, '회사 코드 관리').click();
    const before = await overlay(page).innerText();
    await response(env, 'POST', apiPath('/company-code'), 200, () => page.getByRole('button', { name: 'QR 코드 새로 발급', exact: true }).click());
    assert.notEqual(await overlay(page).innerText(), before);
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: /^기사/ }).click();
    await page.locator('main [role="row"]:has-text("김민수")').getByRole('button', { name: '상세보기', exact: true }).click();
    await page.waitForURL(`**/org/members/t${seed.technicianIds['김민수']}`);
    await textIncludes(page.locator('main'), '완료');
  },
  async 'org-types'(env) {
    const { page } = env;
    await login(env, '/org/types?tab=work');
    await button(page, '새 유형 추가').click();
    await page.getByRole('textbox', { name: '새 유형 이름', exact: true }).fill('QA 작업유형');
    const created = await response(env, 'POST', apiPath('/work-types'), 200, () => button(page, '저장').click());
    const { result: body } = await created.json();
    const typeId = body.workTypeId ?? body.id;
    const row = page.locator('main [class*="row"]').filter({ hasText: 'QA 작업유형' }).last();
    await row.getByRole('button', { name: '수정하기', exact: true }).click();
    await page.getByRole('textbox', { name: '유형 이름', exact: true }).fill('QA 수정유형');
    await response(env, 'PUT', apiPath(`/work-types/${typeId}`), 200, () => button(page, '변경사항 저장').click());
    await page.locator('main [class*="row"]').filter({ hasText: 'QA 수정유형' }).last().getByRole('button', { name: '더보기', exact: true }).click();
    await page.getByRole('menuitem', { name: '삭제', exact: true }).click();
    await response(env, 'DELETE', apiPath(`/work-types/${typeId}`), 204, () => overlay(page).getByRole('button', { name: '삭제', exact: true }).last().click());
    await page.getByRole('tab', { name: '직원유형', exact: true }).click();
    await button(page, '새 유형 추가').click();
    await page.getByRole('textbox', { name: '새 유형 이름', exact: true }).fill('QA 직원유형');
    await response(env, 'POST', apiPath('/staff-categories'), 200, () => button(page, '저장').click());
    await textIncludes(page.locator('main'), 'QA 직원유형');
  },
  async mypage(env) {
    const { page } = env;
    await login(env, '/mypage');
    await page.locator('#mypage-phone').fill('01012349876');
    await response(env, 'PUT', `/api/v1/profiles/${seed.accountIds['오르빗']}`, 200, () => button(page, '저장').click());
    await button(page, '계정 탈퇴').click();
    await page.waitForURL('**/mypage/withdraw');
    await textIncludes(page.locator('main'), '탈퇴할 수 없습니다');
  },
  async 'company-switch'(env) {
    const { page } = env;
    await login(env);
    await page.locator('aside button[aria-haspopup="menu"]').click();
    const start = env.responses.length;
    await response(env, 'GET', `/api/v1/organizations/${seed.organizationIds['협력 발주사']}/timetable`, 200, () => page.getByRole('menuitemradio', { name: /협력 발주사/ }).click());
    await textIncludes(page.locator('aside').first(), '협력 발주사');
    assert(env.responses.slice(start).some((r) => r.url.includes(`/organizations/${seed.organizationIds['협력 발주사']}/`)), 'No requests for switched organization');
  },
  async offline(env) {
    const { page } = env;
    await login(env);
    env.offline = true;
    await env.context.setOffline(true);
    await button(page, '다음 날짜').click();
    await textIncludes(page.locator('main'), '네트워크 연결 실패');
    assert(env.offlineFailures.length > 0, 'Offline fetch must fail at the transport layer');
    await env.context.setOffline(false);
    env.offline = false;
    await response(env, 'GET', apiPath('/timetable'), 200, () => button(page, '다시 시도').click());
    await page.locator('[class*="drivers"]').first().waitFor();
    assert(!(await page.locator('main').innerText()).includes('네트워크 연결 실패'));
  },
  async staff(env) {
    const { page } = env;
    await login(env, '/timetable', '?role=staff');
    await textIncludes(page.locator('main'), '등록된 기사가 없어요');
    await go(page, '/mypage/withdraw');
    await page.locator('main label:has-text("탈퇴에 동의합니다")').click();
    await page.locator('main button:has-text("탈퇴")').last().click();
    await response(env, 'POST', `/api/v1/profiles/${seed.accountIds['김운영']}/withdrawals`, 204, () => overlay(page).getByRole('button', { name: '탈퇴', exact: true }).click());
    await page.waitForURL('**/login');
  },
  async onboarding(env) {
    const { page } = env;
    await go(page, '/login?user=new');
    await button(page, '카카오 로그인').click();
    await page.locator('#overlay-root label:has-text("전체 동의")').click();
    await button(page, '동의하고 계속하기').click();
    await page.waitForURL('**/onboarding/profile');
    await page.locator('#onboarding-name').fill('홍길순');
    await page.locator('#onboarding-phone').fill('01098761234');
    await button(page, '다음').click();
    await page.waitForURL('**/onboarding/company');
    assert(env.responses.some((r) => r.method === 'PUT' && /\/profiles\/\d+$/.test(new URL(r.url).pathname) && r.status === 200));
    await seen(env, 'POST', '/terms-agreements');
    await page.locator('#onboarding-company-name').fill('QA 신규회사');
    await option(page, 'main button[aria-haspopup="listbox"]', '배관·설비');
    await response(env, 'POST', '/api/v1/organizations', 200, () => button(page, '생성').click());
    await page.waitForURL('**/onboarding/types');
    await button(page, '유형 설정').click();
    await page.waitForURL('**/org/types');
  },
  async 'owner-transfer'(env) {
    const { page } = env;
    await login(env, '/org/members');
    await button(page, '총관리자 지정·해제').click();
    await option(page, '#owner-candidate', '박서준');
    await button(page, '지정 확정').click();
    await response(env, 'DELETE', apiPath(`/owners/${seed.membershipIds['오르빗']}`), 204, () =>
      response(env, 'PUT', apiPath(`/owners/${seed.membershipIds['박서준']}`), 204, () => button(page, '해제 확정').click()));
    await textIncludes(page.locator('aside').first(), '직원');
  },
};

for (const name of selected) assert(Object.hasOwn(flows, name), `Unknown flow: ${name}. Available: ${Object.keys(flows).join(', ')}`);
if (!args.includes('--no-seed')) execFileSync('npm', ['run', 'seed:local'], { cwd: root, stdio: 'inherit' });
seed = JSON.parse(readFileSync(`${root}/.dev-seed.json`, 'utf8'));
await ready();
try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
try {
  for (const [name, run] of Object.entries(flows)) {
    if (selected.length && !selected.includes(name)) continue;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const env = { page, context, responses: [], pending: [], errors: [], consoleErrors: [], expectedErrors: [], offline: false, offlineFailures: [] };
    page.on('pageerror', (error) => env.errors.push(`pageerror: ${error.stack}`));
    page.on('console', (message) => {
      if (message.type() !== 'error' || /\[vite\]|React DevTools/.test(message.text())) return;
      if (env.offline && /net::ERR_INTERNET_DISCONNECTED/.test(message.text())) return;
      env.consoleErrors.push({ text: message.text(), url: message.location().url });
    });
    page.on('requestfailed', (request) => {
      if (!new URL(request.url()).pathname.startsWith('/api/')) return;
      const detail = `${request.method()} ${request.url()} ${request.failure()?.errorText}`;
      if (env.offline) env.offlineFailures.push(detail);
      else env.errors.push(`requestfailed: ${detail}`);
    });
    page.on('response', (r) => {
      if (!new URL(r.url()).pathname.startsWith('/api/')) return;
      const record = { method: r.request().method(), url: r.url(), status: r.status(), request: r.request().postData(), body: '' };
      env.responses.push(record);
      env.pending.push((async () => {
        let timer;
        try {
          const body = /spreadsheetml/.test(r.headers()['content-type'] ?? '') ? r.body().then((bytes) => `<xlsx ${bytes.length} bytes>`) : r.text();
          record.body = await Promise.race([body, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Response body timed out')), 5000); })]);
        } catch (error) { record.body = `<body unavailable: ${error.message}>`; }
        finally { clearTimeout(timer); }
      })());
    });
    const flowStart = Date.now();
    try { await run(env); } catch (error) { env.errors.push(error.stack ?? String(error)); }
    await Promise.all(env.pending);
    const expected = (r) => env.expectedErrors.some((e) => r.method === e.method && new URL(r.url).pathname === e.path && r.status === e.status && r.body.includes(e.code));
    for (const r of env.responses) if ((r.status < 200 || r.status >= 300) && !expected(r)) env.errors.push(`HTTP ${r.status} ${r.method} ${r.url}\nrequest: ${r.request}\nresponse: ${r.body}`);
    for (const error of env.consoleErrors) {
      const expectedResourceError = /Failed to load resource.*409/.test(error.text) && env.responses.some((r) => expected(r) && r.url === error.url);
      if (!expectedResourceError) env.errors.push(`console error: ${error.text} (${error.url})`);
    }
    const result = { flow: name, status: env.errors.length ? 'FAIL' : 'PASS', seconds: ((Date.now() - flowStart) / 1000).toFixed(1), api: env.responses.length };
    results.push(result);
    console.log(`${result.status} ${name} (${result.seconds}s, ${result.api} API responses)`);
    if (env.errors.length) {
      console.log(env.errors.join('\n'));
      console.log('API trace:', JSON.stringify(env.responses, null, 2));
      console.log('Visible page:', await page.locator('body').innerText().catch(() => '<closed>'));
    }
    await context.close();
  }
} finally { await browser.close(); }
console.table(results);
console.log(`Wall time: ${((Date.now() - started) / 1000).toFixed(1)}s`);
process.exitCode = results.some((r) => r.status === 'FAIL') ? 1 : 0;
