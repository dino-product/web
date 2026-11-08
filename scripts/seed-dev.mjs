/**
 * 배포 dev(공용 DB)에 목데이터를 "더하는" 시드. 기존 데이터는 지우지 않고, 시드가 만든 식별자만 기록해 그 범위에서만 SQL을 쓴다.
 *
 *   로컬 리허설: npm run seed:dev -- --target=local            (server docker compose + bootRun 상태)
 *   dev 적용:   npm run seed:dev -- --target=dev --confirm-dev  (AWS_PROFILE로 SSM을 읽고, RDS 터널 127.0.0.1:15432를 연 상태)
 *   되돌리기:   npm run seed:dev -- --target=<local|dev> --rollback [--confirm-dev]
 *   대조표만:   npm run seed:dev -- --target=<local|dev> --report [--confirm-dev]
 *
 * 원칙
 * - 서버 API로 만들 수 없는 것만 SQL로 한다: 계정(accounts·oauth_credentials), 기기 세션(refresh_sessions, 해시만),
 *   작업 유형 지정(local·dev는 유형 확인이 임시 어댑터라 거부), 시각 사상, "발송 성공" 발신 행, 연결 해제 재시도 행 삭제.
 * - API는 "지금" 시각으로만 동작하므로, 지난 작업은 지금 근처 일정으로 끝까지 진행한 뒤 그 작업의 시각을 목표 날짜로 단조 사상한다(순서 보존).
 * - 사진은 .seed-assets/{site,before,after}/<유형>-NN.jpg(git 제외, Codex imagegen 생성)를 업로드 주소 발급 → S3 PUT → 작업 저장으로 넣는다.
 * - 서버가 다시 처리하는 행(대기 중인 이벤트·발신 대기·연결 해제 재시도)은 만들지 않거나 끝난 상태만 둔다.
 * - TRUNCATE·FLUSHDB 없음. 되돌리기는 기록 파일(.seed-dev.<target>.json)의 식별자 범위만 지운다(S3 객체는 남는다).
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import pg from 'pg';

// ── 실행 설정 ────────────────────────────────────────────────────────

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  return [key, value ?? true];
}));
const target = args.target;
if (!['local', 'dev'].includes(target)) throw new Error('--target=local 또는 --target=dev 를 주세요');
if (target === 'dev' && !args['confirm-dev']) throw new Error('dev에 쓰려면 --confirm-dev 를 함께 주세요');

const root = new URL('../', import.meta.url);
const manifestUrl = new URL(`.seed-dev.${target}.json`, root);
const assetsUrl = new URL('.seed-assets/', root);

function ssm(name) {
  return execFileSync('aws', ['ssm', 'get-parameter', '--with-decryption', '--name', name,
    '--query', 'Parameter.Value', '--output', 'text', '--region', 'ap-northeast-2'], { encoding: 'utf8' }).trim();
}
function serverEnv(key) {
  const text = readFileSync(new URL('../server/.env', root), 'utf8');
  const line = text.split(/\r?\n/).find(l => l.startsWith(`${key}=`));
  if (!line) throw new Error(`server/.env에 ${key}가 없습니다`);
  return line.slice(key.length + 1).replace(/^(['"])(.*)\1$/, '$2');
}

if (target === 'dev') {
  // dev-token.mjs는 import 시점에 이 값을 읽는다(local은 ../server/.env)
  process.env.AUTH_JWT_SECRET = ssm('/orbit/dev/AUTH_JWT_SECRET');
  process.env.AUTH_JWT_ISSUER = 'orbit';
}
const { devAccessToken } = await import('./dev-token.mjs');

const config = target === 'local'
  ? {
    apiBase: 'http://localhost:8080',
    db: { host: 'localhost', port: 54321, database: 'postgres', user: 'postgres', password: serverEnv('POSTGRES_PASSWORD') },
  }
  : {
    apiBase: 'https://dev-api.orbi-t.com',
    db: {
      host: '127.0.0.1', port: Number(process.env.SEED_DB_PORT ?? 15432), database: 'orbit_dev', user: 'orbit_dev_rw',
      password: ssm('/orbit/dev/DATABASE_RW_PASSWORD'), ssl: { rejectUnauthorized: false },
    },
  };

const db = new pg.Client(config.db);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = (...parts) => console.log(new Date().toISOString().slice(11, 19), ...parts);

// ── 시각 ─────────────────────────────────────────────────────────────

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const KST = 9 * HOUR;
const seedStartedAt = Date.now();
const todayKst = Math.floor((seedStartedAt + KST) / DAY) * DAY - KST; // 오늘 0시(KST)의 UTC epoch ms
const at = (day, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return todayKst + day * DAY + h * HOUR + m * MIN;
};
const iso = ms => new Date(ms).toISOString();

async function dbNow() {
  const { rows: [row] } = await db.query('SELECT clock_timestamp() AS now');
  return row.now.getTime();
}

// ── 결정적 난수 ─────────────────────────────────────────────────────

let rngState = 20261108;
function rand() {
  rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = list => list[Math.floor(rand() * list.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// ── 기록 파일 ───────────────────────────────────────────────────────

const manifest = {
  target, startedAt: iso(seedStartedAt), accounts: {}, organizations: {}, companyCodes: {}, memberships: {},
  technicians: {}, categories: {}, workTypes: {}, works: [], appUsers: [], pushDevices: [], pendingUploads: [],
};
const ids = {
  accounts: () => Object.values(manifest.accounts),
  organizations: () => Object.values(manifest.organizations),
};
function saveManifest() {
  writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
}

// ── API ─────────────────────────────────────────────────────────────

const tokens = {};
const token = accountId => devAccessToken(accountId, 6 * 3600);

async function api(person, method, path, body, { allow = [] } = {}) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${config.apiBase}/api/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${tokens[person]}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if ((response.status === 503 || response.status === 429) && attempt < 5) {
      await sleep(2000 * attempt);
      continue;
    }
    if (!response.ok || payload?.success === false) {
      if (allow.includes(payload?.code)) return { error: payload.code };
      throw new Error(`${person} ${method} ${path} → ${response.status} ${text}`);
    }
    return payload?.result;
  }
}

// ── 사람·회사 ──────────────────────────────────────────────────────

/** key: [이름, 제공자] */
const PEOPLE = {
  own: ['한도윤', 'KAKAO'], co: ['서지민', 'KAKAO'], st1: ['김운영', 'KAKAO'], st2: ['박서준', 'APPLE'],
  st3: ['이지은', 'KAKAO'], st4: ['정우성', 'KAKAO'],
  t1: ['최민호', 'KAKAO'], t2: ['강동원', 'KAKAO'], t3: ['윤서연', 'APPLE'], t4: ['임재현', 'KAKAO'],
  t5: ['오하늘', 'KAKAO'], t6: ['백승호', 'KAKAO'], t7: ['최동욱', 'KAKAO'], t8: ['문태경', 'APPLE'],
  e0: ['송지환', 'KAKAO'], e1: ['양서희', 'KAKAO'], e2: ['노승철', 'KAKAO'],
  p0: ['허영민', 'APPLE'], p2: ['남궁현', 'KAKAO'],
  a0: ['류세아', 'KAKAO'], a1: ['진보람', 'KAKAO'], a2: ['탁성우', 'KAKAO'], a3: ['편지훈', 'APPLE'],
  g0: ['마동석', 'KAKAO'], g2: ['변요한', 'KAKAO'],
  n0: ['차은지', 'KAKAO'],
  ap1: ['정하늘', 'KAKAO'], ap2: ['한지우', 'APPLE'], ap3: ['윤도현', 'KAKAO'], ap4: ['서민재', 'KAKAO'], ap5: ['장예린', 'KAKAO'],
  wd1: ['임채원', 'KAKAO'],
  ps1: [null, 'KAKAO'], ps2: ['고은비', 'KAKAO'],
};

const COMPANIES = {
  main: { name: '오르빗공조', industry: 'HVAC', owner: 'own' },
  elec: { name: '한빛전기설비', industry: 'ELECTRICAL_ELECTRONICS', owner: 'e0' },
  plumb: { name: '바른배관', industry: 'PLUMBING', owner: 'p0' },
  appl: { name: '새봄가전서비스', industry: 'APPLIANCE_SERVICE', owner: 'a0' },
  fm: { name: '그린시설관리', industry: 'FACILITY_MANAGEMENT', owner: 'g0' },
  fresh: { name: '새싹설비', industry: 'OTHER', owner: 'n0' },
};

/** [사람, 회사, 희망 유형, 확정 유형] — 승인까지 마치는 참여 */
const JOINS = [
  ['co', 'main', 'STAFF', 'STAFF'], ['st1', 'main', 'STAFF', 'STAFF'], ['st2', 'main', 'STAFF', 'STAFF'],
  ['st3', 'main', 'STAFF', 'STAFF'], ['st4', 'main', 'TECHNICIAN', 'STAFF'],
  ['t1', 'main', 'TECHNICIAN', 'TECHNICIAN'], ['t2', 'main', 'TECHNICIAN', 'TECHNICIAN'], ['t3', 'main', 'TECHNICIAN', 'TECHNICIAN'],
  ['t4', 'main', 'TECHNICIAN', 'TECHNICIAN'], ['t5', 'main', 'TECHNICIAN', 'TECHNICIAN'], ['t6', 'main', 'STAFF', 'TECHNICIAN'],
  ['t7', 'main', 'TECHNICIAN', 'TECHNICIAN'], ['t8', 'main', 'TECHNICIAN', 'TECHNICIAN'],
  ['e1', 'elec', 'STAFF', 'STAFF'], ['e2', 'elec', 'TECHNICIAN', 'TECHNICIAN'], ['t1', 'elec', 'TECHNICIAN', 'TECHNICIAN'],
  ['st1', 'plumb', 'TECHNICIAN', 'TECHNICIAN'], ['p2', 'plumb', 'TECHNICIAN', 'TECHNICIAN'],
  ['a1', 'appl', 'STAFF', 'STAFF'], ['a2', 'appl', 'TECHNICIAN', 'TECHNICIAN'], ['a3', 'appl', 'TECHNICIAN', 'TECHNICIAN'],
  ['own', 'fm', 'STAFF', 'STAFF'], ['g2', 'fm', 'TECHNICIAN', 'TECHNICIAN'], ['t3', 'fm', 'TECHNICIAN', 'TECHNICIAN'],
];

// 유형 색상은 서버 프리셋 팔레트 8색(CategoryColor) 중 하나여야 한다
const STAFF_CATEGORIES = { main: [['관리자', '#EC4899'], ['배차 담당', '#3B82F6'], ['사무 지원', '#14B8A6'], ['현장 담당', '#F97316']] };
const TECH_CATEGORIES = {
  main: [['전문 기사', '#8B5CF6'], ['설치 기사', '#3B82F6'], ['A/S 기사', '#EAB308'], ['세척 기사', '#22C55E'], ['보조 기사', '#14B8A6']],
  elec: [['전기 기사', '#F97316']], appl: [['가전 기사', '#14B8A6']],
};
const WORK_TYPES = {
  main: [['설치', '#8B5CF6'], ['점검', '#3B82F6'], ['수리', '#EAB308'], ['세척', '#22C55E'], ['철거', '#EF4444']],
  elec: [['점검', '#3B82F6'], ['수리', '#EAB308'], ['설치', '#8B5CF6']],
  plumb: [['수리', '#EAB308'], ['점검', '#3B82F6']],
  appl: [['수리', '#EAB308'], ['세척', '#22C55E'], ['설치', '#8B5CF6']],
  fm: [['점검', '#3B82F6'], ['세척', '#22C55E'], ['수리', '#EAB308']],
};
const STAFF_CATEGORY_OF = { own: '관리자', co: '관리자', st1: '배차 담당', st2: '배차 담당', st3: '사무 지원' };
const TECH_CATEGORY_OF = {
  main: { t1: '전문 기사', t2: '설치 기사', t3: 'A/S 기사', t4: '설치 기사', t5: '세척 기사', t7: 'A/S 기사', t8: '설치 기사' },
  elec: { e2: '전기 기사' }, appl: { a2: '가전 기사' },
};

// ── 작업 재료 ───────────────────────────────────────────────────────

const TYPE_LABEL = { install: '설치', inspect: '점검', repair: '수리', clean: '세척' };
const WORK_NAMES = {
  install: ['거실 벽걸이 에어컨 설치', '사무실 천장형 냉난방기 설치', '실외기 거치대·실외기 설치', '가스보일러 교체 설치'],
  inspect: ['옥상 실외기 정기점검', '분전반 안전점검', '식당 시스템에어컨 점검', '정수기 필터 점검'],
  repair: ['싱크대 배수관 누수 수리', '벽걸이 에어컨 누수 수리', '드럼세탁기 배수 불량 수리', '실외기 팬 교체'],
  clean: ['벽걸이 에어컨 분해세척', '천장형 에어컨 세척', '주방 후드 세척', '드럼세탁기 통세척'],
};
const FEES = { install: [25, 65], inspect: [5, 12], repair: [8, 30], clean: [7, 18] };
const PARTS = {
  install: ['동배관 5m, 배관 커버 2개', '실외기 거치대 1식, 동배관 7m', '배수 호스 3m', '연도 1식, 가스 밸브 1개'],
  inspect: ['', '차단기 1개', '필터 1개', '정수 필터 4개'],
  repair: ['PVC 배수 이음관 1개', '드레인 호스 2m', '배수 펌프 1개', '실외기 팬 1개'],
  clean: ['', '세척 커버 1개', '탈지제 1L', '고무 패킹 1개'],
};
const NOTES = {
  install: '설치 후 시운전 30분, 냉방 정상 확인했습니다.',
  inspect: '전체 점검 완료. 이상 없음, 다음 점검은 6개월 뒤 권장드렸습니다.',
  repair: '원인 부품 교체 후 누수·동작 정상 확인했습니다.',
  clean: '분해 세척 후 재조립, 악취·곰팡이 제거 확인했습니다.',
};
/** [고객명, 전화, 우편번호, 기본주소, 상세주소] */
const CUSTOMERS = [
  ['김민지', '01023456781', '06236', '서울 강남구 테헤란로 152', '12층 1203호'],
  ['카페 온도', '0234567890', '05551', '서울 송파구 올림픽로 300', '1층'],
  ['박정훈', '01034567812', '03925', '서울 마포구 월드컵북로 396', '8층'],
  ['늘봄식당', '0225551234', '07335', '서울 영등포구 여의대로 108', '지하 1층'],
  ['이수진', '01045678123', '04763', '서울 성동구 왕십리로 222', '101동 1502호'],
  ['한결치과', '0226661212', '07803', '서울 강서구 공항대로 247', '4층'],
  ['최영호', '01056781234', '13529', '경기 성남시 분당구 판교역로 166', '7층 702호'],
  ['광교 필라테스', '0312223344', '16514', '경기 수원시 영통구 광교중앙로 140', '3층'],
  ['정다은', '01067812345', '10401', '경기 고양시 일산동구 중앙로 1275', '205동 803호'],
  ['송도 오피스', '0325556677', '21998', '인천 연수구 컨벤시아대로 165', '11층'],
  ['오세영', '01078123456', '03154', '서울 종로구 세종대로 175', '2층'],
  ['시청 앞 약국', '0227778899', '04524', '서울 중구 세종대로 110', '1층'],
  ['윤지아', '01081234567', '04320', '서울 용산구 한강대로 405', '15층'],
  ['반포 키즈카페', '0235559090', '06649', '서울 서초구 반포대로 58', '2층'],
  ['강하준', '01091234567', '08832', '서울 관악구 관악로 145', '3층'],
  ['장승배기 의원', '0228283030', '06928', '서울 동작구 장승배기로 161', '5층'],
  ['서예린', '01012345670', '05029', '서울 광진구 능동로 120', '학생회관 1층'],
  ['은평 베이커리', '0233334444', '03383', '서울 은평구 은평로 195', '1층'],
  ['문지호', '01022223333', '16835', '경기 용인시 수지구 포은대로 435', '302동 1101호'],
  ['안양 공방', '0314445555', '14055', '경기 안양시 동안구 시민대로 235', '2층'],
  ['배수아', '01033334444', '14548', '경기 부천시 길주로 210', '1층'],
  ['노란우산 어린이집', '0316667777', '13646', '경기 성남시 분당구 정자일로 95', '1층'],
];
const BAD_ADDRESS_CUSTOMER = ['류하은', '01055556666', '99999', '서울 어딘가구 없는길 999', '없는 동'];
const PAYMENTS = ['ON_SITE_CARD', 'ON_SITE_CASH', 'BANK_TRANSFER', 'INVOICE'];
const ACTUAL_OF = { ON_SITE_CARD: 'CREDIT_CARD', ON_SITE_CASH: 'CASH', BANK_TRANSFER: 'BANK_TRANSFER', INVOICE: 'INVOICE' };
const REJECTIONS = [
  ['SCHEDULE_CONFLICT', null], ['ALREADY_ASSIGNED', null], ['LOCATION_TOO_FAR', null], ['SCOPE_MISMATCH', null],
  ['OTHER', '해당 모델 부품이 단종이라 수리가 어렵습니다'],
];

/** 회사별 작업 사례. [사례, 개수] */
const PLAN = {
  main: [
    ['backlog', 4], ['backlog_stale', 3], ['backlog_rejected', 5], ['backlog_unassigned', 2],
    ['pending', 6], ['pending_delayed', 2], ['pending_reassigned', 2], ['pending_after_accept_reassigned', 1],
    ['accepted', 8], ['accepted_rescheduled', 2], ['accepted_delayed', 2], ['accepted_photo_replaced', 1], ['pending_conflict', 1],
    ['in_progress', 3], ['in_progress_requested', 2],
    ['completed', 18], ['completed_late', 4], ['completed_minimal', 2],
    ['canceled_registered', 1], ['canceled_pending', 1], ['canceled_accepted', 1], ['canceled_in_progress', 1], ['canceled_backlog', 1],
    ['work_type_deleted', 2],
  ],
  other: [['completed', 5], ['accepted', 2], ['pending', 1], ['in_progress', 1], ['backlog', 1], ['canceled_pending', 1]],
};

// ── 계정 ────────────────────────────────────────────────────────────

let phoneSeq = 0;
async function createAccount(key) {
  const [name, provider] = PEOPLE[key];
  const registeredAt = iso(at(-between(45, 60), '10:00'));
  const { rows: [row] } = await db.query('INSERT INTO accounts (registered_at) VALUES ($1) RETURNING id', [registeredAt]);
  const accountId = Number(row.id);
  await db.query('INSERT INTO oauth_credentials (account_id, provider, oauth_uid) VALUES ($1, $2, $3)',
    [accountId, provider, `seed-${provider.toLowerCase()}-${accountId}-${randomBytes(4).toString('hex')}`]);
  manifest.accounts[key] = accountId;
  tokens[key] = token(accountId);
  if (name && key !== 'ps1') {
    phoneSeq += 1;
    await api(key, 'PUT', `/profiles/${accountId}`, { name, phoneNumber: `0105${String(2010000 + phoneSeq * 37).padStart(7, '0')}` });
    if (key !== 'ps2') {
      await api(key, 'POST', `/profiles/${accountId}/terms-agreements`, {
        serviceTerms: true, privacyPolicy: true, marketing: rand() < 0.4,
      });
    }
  }
  return accountId;
}

/** 기기 세션은 실제 로그인으로만 생기므로 해시만 가진 행을 넣는다(원문이 없어 쓸 수 없는 세션). 사용 중·회전됨·만료 */
async function seedRefreshSessions() {
  const sha = () => createHash('sha256').update(randomBytes(32)).digest('hex');
  const keys = ['own', 'co', 'st1', 't1', 't2', 't3', 'e0', 'a0'];
  for (const [i, key] of keys.entries()) {
    const startedAt = Date.now() - between(1, 20) * DAY;
    const kind = i % 3;
    await db.query(`INSERT INTO refresh_sessions (id, account_id, token_hash, previous_token_hash, rotated_at, started_at, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
      randomUUID(), manifest.accounts[key], sha(), kind === 1 ? sha() : null, kind === 1 ? iso(Date.now() - 2 * HOUR) : null,
      iso(startedAt), iso(kind === 2 ? Date.now() - DAY : startedAt + 60 * DAY),
    ]);
  }
}

// ── 조직 ────────────────────────────────────────────────────────────

const participantsOf = {};
async function loadParticipants(company) {
  const owner = COMPANIES[company].owner;
  const { participants } = await api(owner, 'GET', `/organizations/${manifest.organizations[company]}/participants`);
  participantsOf[company] = participants;
  return participants;
}
function memberIdOf(company, key) {
  const accountId = manifest.accounts[key];
  const row = participantsOf[company].find(p => p.accountId === accountId);
  if (!row) throw new Error(`${company}에 ${key}가 없습니다`);
  return row.memberId;
}

const CHANNELS = ['COMPANY_CODE', 'JOIN_LINK', 'QR_CODE'];
async function requestJoin(key, company, desiredType, i) {
  return api(key, 'POST', '/participation-requests', {
    companyCode: manifest.companyCodes[company], desiredType, requestChannel: CHANNELS[i % 3],
  });
}

async function setupOrganizations() {
  for (const [company, spec] of Object.entries(COMPANIES)) {
    const created = await api(spec.owner, 'POST', '/organizations', { name: spec.name, industry: spec.industry });
    manifest.organizations[company] = created.organizationId;
    manifest.companyCodes[company] = created.companyCode;
  }
  for (const [company, list] of Object.entries(STAFF_CATEGORIES)) {
    manifest.categories[company] ??= {};
    for (const [name, color] of list) {
      const owner = COMPANIES[company].owner;
      const result = await api(owner, 'POST', `/organizations/${manifest.organizations[company]}/staff-categories`, { name, color });
      manifest.categories[company][`staff:${name}`] = result.categoryId;
    }
  }
  for (const [company, list] of Object.entries(TECH_CATEGORIES)) {
    manifest.categories[company] ??= {};
    for (const [name, color] of list) {
      const owner = COMPANIES[company].owner;
      const result = await api(owner, 'POST', `/organizations/${manifest.organizations[company]}/technician-categories`, { name, color });
      manifest.categories[company][`tech:${name}`] = result.categoryId;
    }
  }
  for (const [company, list] of Object.entries(WORK_TYPES)) {
    manifest.workTypes[company] = {};
    for (const [name, color] of list) {
      const owner = COMPANIES[company].owner;
      const result = await api(owner, 'POST', `/organizations/${manifest.organizations[company]}/work-types`, { name, color });
      manifest.workTypes[company][name] = result.workTypeId;
    }
  }
  for (const [i, [key, company, desired, confirmed]] of JOINS.entries()) {
    const request = await requestJoin(key, company, desired, i);
    const owner = COMPANIES[company].owner;
    const decision = await api(owner, 'POST', `/organizations/${manifest.organizations[company]}/participation-requests/approvals`, {
      approvals: [{ requestId: request.requestId, confirmedType: confirmed }],
    });
    if (decision.results[0].outcome !== 'APPROVED') throw new Error(`참여 승인 실패 ${key}→${company}: ${JSON.stringify(decision)}`);
  }
  for (const company of Object.keys(COMPANIES)) await loadParticipants(company);
  manifest.memberships = {};
  manifest.technicians = {};
  for (const [company, participants] of Object.entries(participantsOf)) {
    for (const p of participants) {
      const key = Object.keys(manifest.accounts).find(k => manifest.accounts[k] === p.accountId);
      (p.role === 'TECHNICIAN' ? manifest.technicians : manifest.memberships)[`${company}:${key}`] = p.memberId;
    }
  }
  const mainOrg = manifest.organizations.main;
  for (const [key, category] of Object.entries(STAFF_CATEGORY_OF)) {
    if (key === 'own' || key === 'co') continue; // 총관리자 지정 전에는 직원 소속이라 아래에서 함께 지정한다
    await api('own', 'PUT', `/organizations/${mainOrg}/staff-memberships/${memberIdOf('main', key)}/category`, {
      categoryId: manifest.categories.main[`staff:${category}`],
    });
  }
  await api('own', 'PUT', `/organizations/${mainOrg}/staff-memberships/${memberIdOf('main', 'co')}/category`, {
    categoryId: manifest.categories.main['staff:관리자'],
  });
  await api('own', 'PUT', `/organizations/${mainOrg}/owners/${memberIdOf('main', 'co')}`);
  for (const [company, map] of Object.entries(TECH_CATEGORY_OF)) {
    const owner = COMPANIES[company].owner;
    for (const [key, category] of Object.entries(map)) {
      await api(owner, 'PUT', `/organizations/${manifest.organizations[company]}/technicians/${memberIdOf(company, key)}/category`, {
        categoryId: manifest.categories[company][`tech:${category}`],
      });
    }
  }
  // 알림 설정: 분류마다 하나씩 끈 기사, 그 밖은 기본값(행 없음)
  await api('t2', 'PUT', '/notification-settings', { workAssignmentEnabled: false, scheduleChangeEnabled: true, workCancellationEnabled: true });
  await api('t4', 'PUT', '/notification-settings', { workAssignmentEnabled: true, scheduleChangeEnabled: false, workCancellationEnabled: true });
  await api('t6', 'PUT', '/notification-settings', { workAssignmentEnabled: true, scheduleChangeEnabled: true, workCancellationEnabled: false });
  await api('t1', 'PUT', '/notification-settings', { workAssignmentEnabled: true, scheduleChangeEnabled: true, workCancellationEnabled: true });
  // 가짜 토큰 기기: 발신은 받는 계정의 기기로만 가고 FCM이 거절해 실패로 끝난다
  for (const [key, platform] of [['t5', 'ANDROID']]) {
    const device = await api(key, 'POST', '/push-devices', { platform, token: `seed-invalid-fcm-${randomUUID()}` });
    manifest.pushDevices.push(device.pushDeviceId);
  }
  for (const name of ['시드 예시 사용자 1', '시드 예시 사용자 2', '시드 예시 사용자 3']) {
    const user = await api('own', 'POST', '/users', { displayName: name });
    manifest.appUsers.push(user.id);
  }
}

// ── 시각 사상 ───────────────────────────────────────────────────────

/** 실제 시각 매듭(b_k → T_k)으로 단조 증가 사상. 구간 안의 값은 다음 매듭 전까지 비율로 눌러 순서와 유일성을 지킨다 */
function knotMapper(knots) {
  const sorted = [...knots].sort((a, b) => a.real - b.real);
  return t => {
    if (t < sorted[0].real) return sorted[0].target - (sorted[0].real - t);
    let k = sorted.length - 1;
    while (sorted[k].real > t) k--;
    const cur = sorted[k];
    const next = sorted[k + 1];
    if (!next) return cur.target + (t - cur.real);
    const span = next.real - cur.real;
    const room = Math.max(1, next.target - cur.target - 1);
    return cur.target + (t - cur.real) * Math.min(1, room / span);
  };
}

/** 시드 범위 행의 시각 열을 사상한다. 각 항목: [테이블, 기본키, 시각 열들, WHERE, 값들] */
async function remapRows(specs, map, { from = -Infinity, to = Infinity } = {}) {
  for (const [table, pk, columns, where, values] of specs) {
    const { rows } = await db.query(`SELECT ${pk}, ${columns.join(', ')} FROM ${table} WHERE ${where}`, values);
    for (const row of rows) {
      const sets = [];
      const params = [row[pk]];
      for (const column of columns) {
        const value = row[column];
        if (!(value instanceof Date)) continue;
        const t = value.getTime();
        if (t < from || t > to) continue;
        params.push(iso(Math.round(map(t))));
        sets.push(`${column}=$${params.length}`);
      }
      if (sets.length) await db.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${pk}=$1`, params);
    }
  }
}

/** 시드 계정·회사 범위 전체(작업 제외)의 시각 열 */
function nonWorkSpecs() {
  const A = ids.accounts();
  const C = ids.organizations();
  return [
    ['profiles', 'account_id', ['signed_up_at', 'marketing_changed_at', 'withdrawn_at', 'created_at', 'updated_at'], 'account_id = ANY($1)', [A]],
    ['profile_terms_agreements', 'id', ['agreed_at', 'created_at', 'updated_at'], 'account_id = ANY($1)', [A]],
    ['accounts', 'id', ['closed_at'], 'id = ANY($1)', [A]],
    ['companies', 'id', ['created_at', 'updated_at'], 'id = ANY($1)', [C]],
    ['retired_company_codes', 'id', ['retired_at', 'created_at', 'updated_at'], 'company_id = ANY($1)', [C]],
    ['company_membership_category', 'id', ['deleted_at', 'created_at', 'updated_at'], 'company_id = ANY($1)', [C]],
    ['company_technician_category', 'id', ['deleted_at', 'created_at', 'updated_at'], 'company_id = ANY($1)', [C]],
    ['work_type', 'id', ['deleted_at', 'created_at', 'updated_at'], 'company_id = ANY($1)', [C]],
    ['company_memberships', 'id', ['joined_at', 'status_changed_at', 'created_at', 'updated_at'], 'company_id = ANY($1)', [C]],
    ['technician', 'id', ['joined_at', 'status_changed_at', 'created_at', 'updated_at'], 'company_id = ANY($1)', [C]],
    ['participation_requests', 'id', ['requested_at', 'decided_at', 'created_at', 'updated_at'], 'company_id = ANY($1)', [C]],
    ['notifications', 'id', ['notified_at', 'read_at', 'created_at', 'updated_at'], 'member_id = ANY($1) AND work_id IS NULL', [A]],
    ['notification_deliveries', 'id', ['next_attempt_at', 'sent_at', 'created_at', 'updated_at'],
      'recipient_account_id = ANY($1) AND notification_id IN (SELECT id FROM notifications WHERE work_id IS NULL)', [A]],
    ['notification_settings', 'id', ['created_at', 'updated_at'], 'member_id = ANY($1)', [A]],
    ['push_devices', 'id', ['registered_at', 'created_at', 'updated_at'], 'member_id = ANY($1)', [A]],
  ];
}

function workSpecs(workId) {
  return [
    ['work', 'id', ['registered_at', 'started_at', 'completed_at', 'cancelled_at', 'created_at', 'updated_at'], 'id = $1', [workId]],
    ['work_assignments', 'id', ['assigned_at', 'decided_at', 'ended_at', 'created_at', 'updated_at'], 'work_id = $1', [workId]],
    ['work_site_images', 'id', ['created_at', 'updated_at'], 'work_id = $1', [workId]],
    ['work_execution_images', 'id', ['created_at', 'updated_at'], 'work_id = $1', [workId]],
    ['uploaded_files', 'id', ['attached_at', 'created_at', 'updated_at'], 'owner_ref = $1', [`work:${workId}`]],
    ['notifications', 'id', ['notified_at', 'read_at', 'created_at', 'updated_at'], 'work_id = $1', [workId]],
    ['notification_deliveries', 'id', ['next_attempt_at', 'sent_at', 'created_at', 'updated_at'],
      'notification_id IN (SELECT id FROM notifications WHERE work_id = $1)', [workId]],
  ];
}

// ── 사진 ────────────────────────────────────────────────────────────

const imageCache = new Map();
function imageBytes(phase, type, variant) {
  const url = new URL(`${phase}/${type}-${String(variant).padStart(2, '0')}.jpg`, assetsUrl);
  if (!imageCache.has(url.href)) {
    if (!existsSync(url)) throw new Error(`이미지가 없습니다: ${url.pathname}`);
    imageCache.set(url.href, readFileSync(url));
  }
  return imageCache.get(url.href);
}

async function upload(person, path, bytes) {
  const ticket = await api(person, 'POST', path, { contentType: 'image/jpeg', sizeBytes: bytes.length });
  const response = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.requiredHeaders, body: bytes });
  if (!response.ok) throw new Error(`S3 업로드 실패 ${response.status} ${await response.text()}`);
  return ticket.fileId;
}

// ── 작업 진행 ───────────────────────────────────────────────────────

const busy = {}; // `${company}:${tech}` → [[start, end], ...] (목표 일정)
const SLOTS = ['09:00', '11:00', '13:30', '15:30', '17:30'];
const DURATIONS = [60, 90, 120];

function freeSlot(company, tech, days, when) {
  const key = `${company}:${tech}`;
  busy[key] ??= [];
  const now = Date.now();
  for (let tries = 0; tries < 200; tries++) {
    const day = pick(days);
    const start = at(day, pick(SLOTS));
    const minutes = pick(DURATIONS);
    const end = start + minutes * MIN;
    if (when === 'past' && end > now - 30 * MIN) continue;
    if (when === 'future' && start < now + 90 * MIN) continue;
    if (busy[key].some(([s, e]) => start < e && s < end)) continue;
    busy[key].push([start, end]);
    return { start, minutes };
  }
  throw new Error(`빈 일정이 없습니다: ${key} ${days}`);
}

let workSeq = 0;
function makeBase(company, kind) {
  workSeq += 1;
  const types = Object.keys(TYPE_LABEL).filter(t => (WORK_TYPES[company] ?? WORK_TYPES.main).some(([n]) => n === TYPE_LABEL[t]));
  const type = company === 'main' ? Object.keys(TYPE_LABEL)[workSeq % 4] : pick(types);
  const variant = 1 + (Math.floor(workSeq / 4) % 4);
  const customer = kind === 'backlog' && workSeq % 3 === 0 ? null : workSeq % 23 === 0 ? BAD_ADDRESS_CUSTOMER : CUSTOMERS[workSeq % CUSTOMERS.length];
  const [lo, hi] = FEES[type];
  return {
    company, kind, type, variant, customer, seq: workSeq, payment: PAYMENTS[Math.floor(workSeq / 3) % 4], fee: between(lo, hi) * 10_000,
    name: WORK_NAMES[type][variant - 1],
  };
}

const TECHS = {
  main: ['t1', 't2', 't3', 't4', 't5', 't6'], elec: ['e2', 't1'], plumb: ['st1', 'p2'], appl: ['a2', 'a3'], fm: ['g2', 't3'],
};
const REGISTRARS = { main: ['own', 'co', 'st1', 'st2', 'st3'], elec: ['e0', 'e1'], plumb: ['p0'], appl: ['a0', 'a1'], fm: ['g0', 'own'] };
let techCursor = 0;
const nextTech = (company, exclude = []) => {
  const list = TECHS[company].filter(t => !exclude.includes(t));
  techCursor += 1;
  return list[techCursor % list.length];
};

class Trace {
  constructor() { this.knots = []; }
  async step(targetMs, fn) {
    const real = await dbNow();
    const result = await fn();
    this.knots.push({ real, target: targetMs });
    await sleep(150); // 비동기 리스너(알림)가 같은 구간에 남도록
    return result;
  }
}

async function detail(person, company, workId) {
  return api(person, 'GET', `/organizations/${manifest.organizations[company]}/works/${workId}`);
}
const currentAssignment = d => [...d.assignments].reverse().find(a => a.result === 'PENDING' || a.result === 'ACCEPTED');

/**
 * 사례 하나를 끝까지 진행하고 시각을 사상한다.
 * 목표 일정 S, 소요 D, 사례별 사건 시각(registered → assigned → decided → started → requests → completed/cancelled)을 먼저 정하고,
 * 실제 일정은 API가 허용하는 시각(시작은 S-10분~S+D, 완료보고 요청은 S+D 이후)으로 잡아 진행한 뒤 일정은 ΔS만큼, 사건은 매듭으로 옮긴다.
 */
async function seedWork(spec) {
  const { company, kind } = spec;
  const org = manifest.organizations[company];
  const base = `/organizations/${org}/works`;
  const registrar = spec.registrar ?? pick(REGISTRARS[company]);
  const now = Date.now();
  let trace = new Trace();
  let cutoff = -Infinity; // 이 시각 이전 행은 이미 목표 시각으로 옮겼다
  const tech = spec.tech ?? nextTech(company);
  const techId = () => manifest.technicians[`${company}:${tech}`];

  const started = /in_progress|completed|canceled_in_progress/.test(kind);
  const scheduled = !/^backlog$|backlog_stale|canceled_registered|canceled_backlog|work_type_deleted/.test(kind) || kind === 'work_type_deleted' && spec.withSchedule;
  const when = /completed|delayed|in_progress_requested|canceled_in_progress/.test(kind) ? 'past'
    : kind === 'in_progress' ? 'now' : 'future';
  let slot = null;
  if (scheduled) {
    if (when === 'now') {
      const minutes = 120;
      slot = { start: now - between(20, 50) * MIN, minutes };
      busy[`${company}:${tech}`] ??= [];
      busy[`${company}:${tech}`].push([slot.start, slot.start + minutes * MIN]);
    } else if (kind === 'pending_conflict') {
      const taken = (busy[`${company}:${tech}`] ?? []).find(([s]) => s > now + 3 * HOUR);
      if (!taken) throw new Error(`겹칠 일정이 없습니다: ${company}:${tech}`);
      slot = { start: taken[0] + 30 * MIN, minutes: 90 };
    } else {
      const days = when === 'past'
        ? kind === 'in_progress_requested' ? [-1] : kind.includes('delayed') ? [-1, 0] : [-14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0]
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      slot = freeSlot(company, tech, spec.days ?? days, when);
    }
  }
  const S = slot?.start;
  const D = slot?.minutes ?? 90;
  const E = S === undefined ? undefined : S + D * MIN;
  // 사건 목표 시각
  const registeredAt = kind === 'backlog_stale' ? now - between(4, 6) * DAY - between(1, 8) * HOUR
    : S !== undefined ? Math.min(S - between(1, 4) * DAY + between(0, 8) * HOUR, now - 3 * HOUR)
      : now - between(2, 40) * HOUR;
  const t = {
    registered: registeredAt,
    assigned: registeredAt + between(5, 60) * MIN,
    decided: registeredAt + between(2, 8) * HOUR,
  };
  if (S !== undefined) {
    t.decided = Math.min(t.decided, S - 30 * MIN, now - 20 * MIN);
    t.assigned = Math.min(t.assigned, t.decided - 10 * MIN);
    t.started = S + between(-8, 15) * MIN;
    t.completed = kind === 'completed_late' ? E + between(40, 150) * MIN : E - between(0, 20) * MIN;
    if (t.completed <= t.started) t.completed = t.started + 30 * MIN;
  }
  if (kind === 'in_progress') t.started = now - between(5, 15) * MIN;
  // 뒤늦은 사건(20시간~1시간 전) 앞에 와야 하는 작업: 탈퇴할 기사의 수락 등
  if (spec.eventsBy) {
    t.decided = Math.min(t.decided, spec.eventsBy);
    t.assigned = Math.min(t.assigned, t.decided - 10 * MIN);
    t.registered = Math.min(t.registered, t.assigned - 30 * MIN);
  }

  const requests = kind === 'in_progress_requested' ? (spec.requests ?? 1) : kind === 'completed_late' ? 1 : 0;
  const c = spec.customer;
  const body = {
    name: spec.name,
    // local·dev는 작업 유형 확인이 임시 어댑터(DenyingWorkTypeAdapter)라 유형을 주면 SCHEDULE-014 → 등록 뒤 SQL로 채운다
    workTypeId: null,
    customer: c ? { name: c[0], phone: c[1], postalCode: c[2], address: c[3], addressDetail: c[4] } : null,
    payment: { fee: spec.fee, method: spec.payment },
    sitePhotoIds: [],
  };
  const sitePhotoCount = kind === 'completed_minimal' ? 0 : spec.seq % 5 === 0 ? 0 : spec.seq % 3 === 0 ? 2 : 1;
  if (sitePhotoCount) {
    body.sitePhotoIds.push(await upload(registrar, `/organizations/${org}/site-photo-uploads`, imageBytes('site', spec.type, spec.variant)));
    if (sitePhotoCount === 2) {
      body.sitePhotoIds.push(await upload(registrar, `/organizations/${org}/site-photo-uploads`, imageBytes('before', spec.type, spec.variant)));
    }
  }
  // 실제 일정: 시작해야 하는 작업은 지금 기준으로, 완료보고 요청이 있으면 종료를 지금 직후로(시작 창 S-10분~S+D 안에서 시작하고 S+D 뒤 요청)
  let realStart = S;
  if (started && kind !== 'in_progress') realStart = requests ? Date.now() - D * MIN + 25_000 : Date.now() + 2 * MIN;
  if (scheduled) {
    body.schedule = { technicianId: techId(), startTime: iso(realStart), expectedDurationMinutes: D, conflictConfirmed: true };
  }
  const created = await trace.step(t.registered, () => api(registrar, 'POST', base, body));
  if (!created.applied || !created.workId) throw new Error(`작업 등록 미적용 ${kind}: ${JSON.stringify(created)}`);
  const workId = created.workId;
  const workTypeId = kind === 'work_type_deleted' ? manifest.workTypes[company]['철거'] : manifest.workTypes[company]?.[TYPE_LABEL[spec.type]];
  if (workTypeId) await db.query('UPDATE work SET job_type_id = $2 WHERE id = $1', [workId, workTypeId]);
  const record = { workId, company, kind, registrar, tech: scheduled ? tech : null };
  manifest.works.push(record);

  const assignmentNumber = async () => currentAssignment(await detail(registrar, company, workId)).assignmentNumber;
  const accept = async (who, when) => {
    const n = await assignmentNumber();
    await trace.step(when, () => api(who, 'POST', `${base}/${workId}/acceptance`, { assignmentNumber: n }));
  };
  const reassign = async (who, newTech, startMs, when) => {
    const d = await detail(registrar, company, workId);
    const result = await trace.step(when, () => api(who, 'PUT', `${base}/${workId}/assignment`, {
      technicianId: manifest.technicians[`${company}:${newTech}`], startTime: iso(startMs), expectedDurationMinutes: D,
      conflictConfirmed: true, expectedVersion: d.version,
    }));
    if (!result.applied) throw new Error(`배정 변경 미적용 ${kind}: ${JSON.stringify(result)}`);
  };

  let finalTech = tech;
  switch (kind) {
    case 'backlog_rejected': {
      const [reason, note] = REJECTIONS[spec.index % REJECTIONS.length];
      const n = await assignmentNumber();
      await trace.step(t.decided, () => api(tech, 'POST', `${base}/${workId}/rejection`, { assignmentNumber: n, reason, note }));
      break;
    }
    case 'backlog_unassigned': {
      if (spec.index % 2) await accept(tech, t.decided);
      const d = await detail(registrar, company, workId);
      await trace.step(Math.min(t.decided + 3 * HOUR, now - 10 * MIN), () =>
        api(registrar, 'DELETE', `${base}/${workId}/assignment?expectedVersion=${d.version}`));
      break;
    }
    case 'pending_reassigned': {
      const other = nextTech(company, [tech]);
      busy[`${company}:${other}`] ??= [];
      busy[`${company}:${other}`].push([S, E]);
      await reassign(registrar, other, realStart, t.decided);
      finalTech = other;
      break;
    }
    case 'pending_after_accept_reassigned': {
      await accept(tech, t.decided);
      const other = nextTech(company, [tech]);
      busy[`${company}:${other}`] ??= [];
      busy[`${company}:${other}`].push([S, E]);
      await reassign(registrar, other, realStart, Math.min(t.decided + 5 * HOUR, now - 5 * MIN));
      finalTech = other;
      break;
    }
    case 'accepted_rescheduled': {
      await accept(tech, t.decided);
      const moved = realStart + DAY;
      busy[`${company}:${tech}`].push([S + DAY, E + DAY]);
      await reassign(registrar, tech, moved, Math.min(t.decided + 6 * HOUR, now - 5 * MIN));
      realStart = moved;
      break;
    }
    case 'accepted_photo_replaced': {
      await accept(tech, t.decided);
      const replacement = await upload(registrar, `/organizations/${org}/site-photo-uploads`, imageBytes('site', spec.type, (spec.variant % 4) + 1));
      await trace.step(Math.min(t.decided + 2 * HOUR, now - 5 * MIN), () =>
        api(registrar, 'PUT', `${base}/${workId}`, { ...body, schedule: undefined, sitePhotoIds: [replacement] }));
      break;
    }
    case 'accepted': case 'accepted_delayed': case 'canceled_accepted':
      await accept(tech, t.decided);
      break;
    default:
      break;
  }

  if (started) {
    await accept(tech, t.decided);
    const n = await assignmentNumber();
    await trace.step(t.started, () => api(tech, 'POST', `${base}/${workId}/start`, { assignmentNumber: n }));
    if (requests) {
      const wait = realStart + D * MIN - Date.now() + 1500;
      if (wait > 0) await sleep(wait);
      for (let i = 0; i < requests; i++) {
        if (i > 0) {
          // 같은 작업의 요청 간격 30분: 지금까지의 사건을 먼저 목표 시각(과거)으로 옮겨 마지막 요청을 30분 전보다 앞으로 보낸다
          await sleep(300);
          await remapRows(workSpecs(workId), knotMapper(trace.knots), { from: cutoff });
          const { rows } = await db.query('SELECT id FROM work_completion_report_requests WHERE work_id = $1 ORDER BY id', [workId]);
          for (const [j, row] of rows.entries()) {
            await db.query('UPDATE work_completion_report_requests SET requested_at=$2, created_at=$2, updated_at=$2 WHERE id=$1',
              [row.id, iso(E + (j + 1) * 35 * MIN)]);
          }
          cutoff = await dbNow();
          trace = new Trace();
        }
        await trace.step(E + (i + 1) * 35 * MIN, () => api(registrar, 'POST', `${base}/${workId}/completion-report-requests`));
      }
    }
    if (/completed/.test(kind)) {
      const before = kind === 'completed_minimal' ? [] : [
        await upload(tech, `${base}/${workId}/completion-photo-uploads`, imageBytes('before', spec.type, spec.variant)),
        await upload(tech, `${base}/${workId}/completion-photo-uploads`, imageBytes('site', spec.type, spec.variant)),
      ];
      const after = kind === 'completed_minimal' ? [] : [
        await upload(tech, `${base}/${workId}/completion-photo-uploads`, imageBytes('after', spec.type, spec.variant)),
      ];
      const actual = spec.seq % 7 === 0 ? 'INVOICE' : ACTUAL_OF[spec.payment];
      const completedAt = kind === 'completed_late' ? Math.max(t.completed, E + (requests + 1) * 35 * MIN + 10 * MIN) : t.completed;
      await trace.step(completedAt, () => api(tech, 'POST', `${base}/${workId}/completion-report`, {
        assignmentNumber: n, beforePhotoIds: before, afterPhotoIds: after,
        usedParts: kind === 'completed_minimal' ? null : PARTS[spec.type][spec.variant - 1] || null,
        workNote: kind === 'completed_minimal' ? null : NOTES[spec.type],
        actualFee: kind === 'completed_minimal' ? null : spec.fee + (spec.seq % 5 === 0 ? 20_000 : 0), actualPaymentMethod: actual,
      }));
    }
  }

  const cancel = { canceled_registered: ['DUPLICATE_REGISTRATION', null], canceled_backlog: ['OTHER', '고객이 다른 업체에 맡겼다고 연락'],
    canceled_pending: ['CUSTOMER_REQUEST', null], canceled_accepted: ['TECHNICIAN_ISSUE', null], canceled_in_progress: ['OTHER', '현장 전원 공사로 작업 중단, 재등록 예정'] }[kind];
  if (cancel) {
    const cancelAt = started ? t.started + 25 * MIN : S !== undefined ? Math.min(t.decided + 2 * HOUR, now - 5 * MIN) : t.registered + 3 * HOUR;
    await trace.step(cancelAt, () => api(registrar, 'POST', `${base}/${workId}/cancellation`, { reason: cancel[0], note: cancel[1] ?? undefined }));
  }

  if (workTypeId && kind === 'accepted_photo_replaced') await db.query('UPDATE work SET job_type_id = $2 WHERE id = $1', [workId, workTypeId]);
  // 시각 사상: 일정은 ΔS, 사건은 매듭
  await sleep(300);
  if (trace.knots.length) await remapRows(workSpecs(workId), knotMapper(trace.knots), { from: cutoff });
  if (S !== undefined && realStart !== undefined) {
    const deltaS = (kind === 'accepted_rescheduled' ? S + DAY : S) - realStart;
    if (deltaS !== 0) {
      await db.query('UPDATE work SET scheduled_start_at = scheduled_start_at + $2 * interval \'1 millisecond\' WHERE id = $1', [workId, deltaS]);
      await db.query('UPDATE work_assignments SET scheduled_start_at = scheduled_start_at + $2 * interval \'1 millisecond\' WHERE work_id = $1', [workId, deltaS]);
    }
  }
  if (requests) {
    const { rows } = await db.query('SELECT id FROM work_completion_report_requests WHERE work_id = $1 ORDER BY id', [workId]);
    for (const [i, row] of rows.entries()) {
      const when = iso(E + (i + 1) * 35 * MIN);
      await db.query('UPDATE work_completion_report_requests SET requested_at=$2, created_at=$2, updated_at=$2 WHERE id=$1', [row.id, when]);
    }
  }
  record.tech = scheduled ? finalTech : null;
  return record;
}

// ── 사례 목록 ───────────────────────────────────────────────────────

function buildSpecs() {
  const specs = [];
  for (const [company, plan] of [['main', PLAN.main], ...['elec', 'plumb', 'appl', 'fm'].map(c => [c, PLAN.other])]) {
    for (const [kind, count] of plan) {
      for (let index = 0; index < count; index++) {
        const spec = { ...makeBase(company, kind), index };
        if (kind === 'in_progress_requested') spec.requests = index + 1;
        if (kind === 'work_type_deleted') spec.withSchedule = index === 0;
        if (kind === 'pending_conflict') spec.tech = 't1'; // 같은 기사의 수락 일정과 겹치게
        if (company === 'main' && kind === 'accepted' && index === 0) spec.tech = 't1';
        if (company === 'main' && /completed/.test(kind) && index === 0) Object.assign(spec, { tech: 't7', days: [-14, -10, -6, -3] }); // 비활성화될 기사의 이력
        specs.push(spec);
      }
    }
  }
  return specs;
}

// ── 뒤늦은 사건(조직·계정) ─────────────────────────────────────────

async function lateEvents() {
  const mainOrg = manifest.organizations.main;
  // 유형 이름 변경·삭제(작업 유형 삭제는 그 유형을 쓰던 작업의 유형을 비운다)
  await api('own', 'PUT', `/organizations/${mainOrg}/staff-categories/${manifest.categories.main['staff:사무 지원']}`, { name: '사무 지원팀', color: '#14B8A6' });
  await api('own', 'DELETE', `/organizations/${mainOrg}/staff-categories/${manifest.categories.main['staff:현장 담당']}`);
  await api('own', 'DELETE', `/organizations/${mainOrg}/technician-categories/${manifest.categories.main['tech:보조 기사']}`);
  await api('own', 'DELETE', `/organizations/${mainOrg}/work-types/${manifest.workTypes.main['철거']}`);
  // 회사 코드 재발급
  const rotated = await api('e0', 'POST', `/organizations/${manifest.organizations.elec}/company-code`);
  manifest.companyCodes.elec = rotated.companyCode;
  // 비활성화: 이력만 남은 기사, 등록 이력이 있는 직원
  await api('own', 'POST', `/organizations/${mainOrg}/technicians/${memberIdOf('main', 't7')}/deactivation`);
  await api('own', 'POST', `/organizations/${mainOrg}/staff-memberships/${memberIdOf('main', 'st3')}/deactivation`);
  // 마케팅 동의 변경
  await api('t4', 'POST', `/profiles/${manifest.accounts.t4}/marketing-consents`, { agreed: true });
  // 참여 요청: 대기(경로 3종)·거절·취소
  const ap = {};
  for (const [i, [key, type]] of [['ap1', 'TECHNICIAN'], ['ap2', 'STAFF'], ['ap3', 'TECHNICIAN'], ['ap4', 'TECHNICIAN'], ['ap5', 'STAFF']].entries()) {
    ap[key] = await requestJoin(key, 'main', type, i);
  }
  await api('own', 'POST', `/organizations/${mainOrg}/participation-requests/rejections`, {
    requestIds: [ap.ap4.requestId], reason: '현재 기사 모집이 마감되었습니다',
  });
  await api('ap5', 'POST', `/participation-requests/${ap.ap5.requestId}/cancel`);
  // 탈퇴: 수락한 작업이 있는 기사(배정이 ACCOUNT_WITHDRAWN으로 끝나 대기함으로), 소속 없는 계정
  await api('t8', 'POST', `/profiles/${manifest.accounts.t8}/withdrawals`, { reason: '다른 지역으로 이사합니다' });
  await api('wd1', 'POST', `/profiles/${manifest.accounts.wd1}/withdrawals`, {});
}

async function seedWithdrawnTechnicianWork() {
  // t8: 지난 완료 1건 + 앞으로의 수락 1건(탈퇴 때 대기함으로 돌아감)
  await seedWork({ ...makeBase('main', 'completed'), tech: 't8', index: 0, days: [-9, -5, -2] });
  await seedWork({ ...makeBase('main', 'accepted'), tech: 't8', index: 0, eventsBy: Date.now() - 22 * HOUR });
}

// ── 끝난 상태만 두는 행 ─────────────────────────────────────────────

async function finishTerminalRows() {
  const A = ids.accounts();
  // 연결 해제 재시도(실제 카카오·애플 호출)는 남기지 않는다
  await sleep(3000);
  const unlinks = await db.query('DELETE FROM provider_unlinks WHERE account_id = ANY($1)', [A]);
  // 실제 기기가 없어 자연히 생기지 않는 "발송 성공"을 끝난 행 몇 개로 만든다
  const sent = await db.query(`UPDATE notification_deliveries SET status='SENT', attempts=1, last_error=NULL,
      provider_message_id='projects/orbit-seed/messages/' || id, sent_at=next_attempt_at, updated_at=next_attempt_at
    WHERE id IN (SELECT id FROM notification_deliveries WHERE recipient_account_id = ANY($1) AND status IN ('SKIPPED','FAILED')
      ORDER BY id LIMIT 6)`, [A]);
  return { unlinksRemoved: unlinks.rowCount, deliveriesSent: sent.rowCount };
}

async function readSomeNotifications() {
  for (const key of ['own', 'co', 'st1', 't1', 't2', 't3', 'e0', 'a0']) {
    const page = await api(key, 'GET', '/notifications?page=0&size=100');
    for (const [i, n] of page.notifications.entries()) {
      if (i < 2 || n.read) continue; // 최근 2건은 안 읽음으로
      if (rand() < 0.65) await api(key, 'PUT', `/notifications/${n.id}/read`);
    }
  }
}

// ── 대조표 ──────────────────────────────────────────────────────────

async function report() {
  const A = ids.accounts();
  const C = ids.organizations();
  const q = async (sql, values) => (await db.query(sql, values)).rows;
  const out = {};
  out.tables = Object.fromEntries((await q(`
    SELECT 'accounts' t, count(*)::int n FROM accounts WHERE id = ANY($1)
    UNION ALL SELECT 'oauth_credentials', count(*) FROM oauth_credentials WHERE account_id = ANY($1)
    UNION ALL SELECT 'refresh_sessions', count(*) FROM refresh_sessions WHERE account_id = ANY($1)
    UNION ALL SELECT 'apple_refresh_tokens', count(*) FROM apple_refresh_tokens WHERE account_id = ANY($1)
    UNION ALL SELECT 'provider_unlinks', count(*) FROM provider_unlinks WHERE account_id = ANY($1)
    UNION ALL SELECT 'profiles', count(*) FROM profiles WHERE account_id = ANY($1)
    UNION ALL SELECT 'profile_terms_agreements', count(*) FROM profile_terms_agreements WHERE account_id = ANY($1)
    UNION ALL SELECT 'app_user', count(*) FROM app_user WHERE id = ANY($3)
    UNION ALL SELECT 'companies', count(*) FROM companies WHERE id = ANY($2)
    UNION ALL SELECT 'retired_company_codes', count(*) FROM retired_company_codes WHERE company_id = ANY($2)
    UNION ALL SELECT 'company_membership_category', count(*) FROM company_membership_category WHERE company_id = ANY($2)
    UNION ALL SELECT 'company_technician_category', count(*) FROM company_technician_category WHERE company_id = ANY($2)
    UNION ALL SELECT 'work_type', count(*) FROM work_type WHERE company_id = ANY($2)
    UNION ALL SELECT 'company_memberships', count(*) FROM company_memberships WHERE company_id = ANY($2)
    UNION ALL SELECT 'technician', count(*) FROM technician WHERE company_id = ANY($2)
    UNION ALL SELECT 'participation_requests', count(*) FROM participation_requests WHERE company_id = ANY($2)
    UNION ALL SELECT 'work', count(*) FROM work WHERE company_id = ANY($2)
    UNION ALL SELECT 'work_assignments', count(*) FROM work_assignments WHERE work_id IN (SELECT id FROM work WHERE company_id = ANY($2))
    UNION ALL SELECT 'work_site_images', count(*) FROM work_site_images WHERE work_id IN (SELECT id FROM work WHERE company_id = ANY($2))
    UNION ALL SELECT 'work_execution_images', count(*) FROM work_execution_images WHERE work_id IN (SELECT id FROM work WHERE company_id = ANY($2))
    UNION ALL SELECT 'work_completion_report_requests', count(*) FROM work_completion_report_requests WHERE work_id IN (SELECT id FROM work WHERE company_id = ANY($2))
    UNION ALL SELECT 'uploaded_files', count(*) FROM uploaded_files WHERE organization_id = ANY($2)
    UNION ALL SELECT 'notifications', count(*) FROM notifications WHERE member_id = ANY($1)
    UNION ALL SELECT 'notification_settings', count(*) FROM notification_settings WHERE member_id = ANY($1)
    UNION ALL SELECT 'notification_deliveries', count(*) FROM notification_deliveries WHERE recipient_account_id = ANY($1)
    UNION ALL SELECT 'push_devices', count(*) FROM push_devices WHERE member_id = ANY($1)
  `, [A, C, manifest.appUsers])).map(r => [r.t, r.n]));
  const group = async (label, sql, values = [C]) => { out[label] = Object.fromEntries((await q(sql, values)).map(r => [r.k, r.n])); };
  await group('work.status', 'SELECT status k, count(*)::int n FROM work WHERE company_id = ANY($1) GROUP BY 1');
  await group('work.cancel_reason', 'SELECT cancel_reason k, count(*)::int n FROM work WHERE company_id = ANY($1) AND cancel_reason IS NOT NULL GROUP BY 1');
  await group('work.payment_method', 'SELECT payment_method k, count(*)::int n FROM work WHERE company_id = ANY($1) GROUP BY 1');
  await group('work.actual_payment_method', 'SELECT actual_payment_method k, count(*)::int n FROM work WHERE company_id = ANY($1) AND actual_payment_method IS NOT NULL GROUP BY 1');
  await group('work.coordinates', "SELECT CASE WHEN customer_latitude IS NULL THEN 'none' ELSE 'some' END k, count(*)::int n FROM work WHERE company_id = ANY($1) GROUP BY 1");
  await group('work.job_type', "SELECT CASE WHEN job_type_id IS NULL THEN 'none' ELSE 'some' END k, count(*)::int n FROM work WHERE company_id = ANY($1) GROUP BY 1");
  await group('work.delayed(파생)', `SELECT status k, count(*)::int n FROM work WHERE company_id = ANY($1) AND status IN ('PENDING_ACCEPT','ACCEPTED','IN_PROGRESS')
    AND scheduled_start_at + expected_duration < now() GROUP BY 1`);
  await group('assignment.result', 'SELECT result k, count(*)::int n FROM work_assignments WHERE work_id IN (SELECT id FROM work WHERE company_id = ANY($1)) GROUP BY 1');
  await group('assignment.rejection_reason', 'SELECT rejection_reason k, count(*)::int n FROM work_assignments WHERE rejection_reason IS NOT NULL AND work_id IN (SELECT id FROM work WHERE company_id = ANY($1)) GROUP BY 1');
  await group('assignment.end_reason', 'SELECT end_reason k, count(*)::int n FROM work_assignments WHERE end_reason IS NOT NULL AND work_id IN (SELECT id FROM work WHERE company_id = ANY($1)) GROUP BY 1');
  await group('execution_images.type', 'SELECT image_type k, count(*)::int n FROM work_execution_images WHERE work_id IN (SELECT id FROM work WHERE company_id = ANY($1)) GROUP BY 1');
  await group('uploaded_files.status', 'SELECT status || \':\' || purpose k, count(*)::int n FROM uploaded_files WHERE organization_id = ANY($1) GROUP BY 1');
  await group('notifications.type', 'SELECT type k, count(*)::int n FROM notifications WHERE member_id = ANY($1) GROUP BY 1', [A]);
  await group('notifications.status', "SELECT status || CASE WHEN is_hidden THEN ':hidden' ELSE '' END k, count(*)::int n FROM notifications WHERE member_id = ANY($1) GROUP BY 1", [A]);
  await group('deliveries.status', 'SELECT status k, count(*)::int n FROM notification_deliveries WHERE recipient_account_id = ANY($1) GROUP BY 1', [A]);
  await group('profiles.status', 'SELECT status k, count(*)::int n FROM profiles WHERE account_id = ANY($1) GROUP BY 1', [A]);
  await group('oauth.provider', 'SELECT provider k, count(*)::int n FROM oauth_credentials WHERE account_id = ANY($1) GROUP BY 1', [A]);
  await group('participation.status', "SELECT status || ':' || request_channel k, count(*)::int n FROM participation_requests WHERE company_id = ANY($1) GROUP BY 1");
  await group('memberships.status', "SELECT CASE WHEN is_owner THEN 'OWNER' ELSE 'STAFF' END || ':' || status k, count(*)::int n FROM company_memberships WHERE company_id = ANY($1) GROUP BY 1");
  await group('technician.status', 'SELECT status k, count(*)::int n FROM technician WHERE company_id = ANY($1) GROUP BY 1');
  await group('companies.industry', 'SELECT industry_code k, count(*)::int n FROM companies WHERE id = ANY($1) GROUP BY 1');
  await group('categories.deleted', `SELECT 'staff:' || is_deleted k, count(*)::int n FROM company_membership_category WHERE company_id = ANY($1) GROUP BY 1
    UNION ALL SELECT 'tech:' || is_deleted, count(*)::int FROM company_technician_category WHERE company_id = ANY($1) GROUP BY 1
    UNION ALL SELECT 'work_type:' || is_deleted, count(*)::int FROM work_type WHERE company_id = ANY($1) GROUP BY 1`);
  await group('settings', `SELECT (work_assignment_enabled::int::text || schedule_change_enabled::int::text || work_cancellation_enabled::int::text) k, count(*)::int n
    FROM notification_settings WHERE member_id = ANY($1) GROUP BY 1`, [A]);
  // 범위 밖 오염 확인: 실데이터에 시드 흔적이 없어야 한다
  out.guard = (await q(`SELECT
      (SELECT count(*)::int FROM company_memberships WHERE member_id = ANY($1) AND NOT company_id = ANY($2)) AS foreign_memberships,
      (SELECT count(*)::int FROM technician WHERE member_id = ANY($1) AND NOT company_id = ANY($2)) AS foreign_technicians,
      (SELECT count(*)::int FROM notifications WHERE member_id = ANY($1) AND NOT company_id = ANY($2)) AS foreign_notifications`, [A, C]))[0];
  return out;
}

// ── 되돌리기 ────────────────────────────────────────────────────────

async function rollback() {
  if (!existsSync(manifestUrl)) throw new Error(`기록 파일이 없습니다: ${manifestUrl.pathname}`);
  const saved = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  const A = Object.values(saved.accounts);
  const C = Object.values(saved.organizations);
  if (!A.length && !C.length) throw new Error('기록 파일에 식별자가 없습니다');
  await db.query('BEGIN');
  const steps = [
    ['notification_deliveries', 'recipient_account_id = ANY($1)', [A]],
    ['notifications', 'member_id = ANY($1)', [A]],
    ['notification_settings', 'member_id = ANY($1)', [A]],
    ['push_devices', 'member_id = ANY($1)', [A]],
    ['work_execution_images', 'work_id IN (SELECT id FROM work WHERE company_id = ANY($1))', [C]],
    ['work_site_images', 'work_id IN (SELECT id FROM work WHERE company_id = ANY($1))', [C]],
    ['work_completion_report_requests', 'work_id IN (SELECT id FROM work WHERE company_id = ANY($1))', [C]],
    ['work_assignments', 'work_id IN (SELECT id FROM work WHERE company_id = ANY($1))', [C]],
    ['work', 'company_id = ANY($1)', [C]],
    ['uploaded_files', 'organization_id = ANY($1)', [C]],
    ['participation_requests', 'company_id = ANY($1) OR member_id = ANY($2)', [C, A]],
    ['technician', 'company_id = ANY($1)', [C]],
    ['company_memberships', 'company_id = ANY($1)', [C]],
    ['work_type', 'company_id = ANY($1)', [C]],
    ['company_technician_category', 'company_id = ANY($1)', [C]],
    ['company_membership_category', 'company_id = ANY($1)', [C]],
    ['retired_company_codes', 'company_id = ANY($1)', [C]],
    ['companies', 'id = ANY($1)', [C]],
    ['profile_terms_agreements', 'account_id = ANY($1)', [A]],
    ['profiles', 'account_id = ANY($1)', [A]],
    ['provider_unlinks', 'account_id = ANY($1)', [A]],
    ['apple_refresh_tokens', 'account_id = ANY($1)', [A]],
    ['refresh_sessions', 'account_id = ANY($1)', [A]],
    ['oauth_credentials', 'account_id = ANY($1)', [A]],
    ['accounts', 'id = ANY($1)', [A]],
    ['app_user', 'id = ANY($1)', [saved.appUsers ?? []]],
  ];
  try {
    for (const [table, where, values] of steps) {
      const result = await db.query(`DELETE FROM ${table} WHERE ${where}`, values);
      log(`삭제 ${table}: ${result.rowCount}`);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
  renameSync(manifestUrl, new URL(`.seed-dev.${target}.rolled-back.json`, root));
  log('되돌리기 완료. S3 객체(media/·incoming/)는 남아 있습니다.');
}

// ── 실행 ────────────────────────────────────────────────────────────

async function main() {
  await db.connect();
  if (args.rollback) return rollback();
  if (args.report) {
    Object.assign(manifest, JSON.parse(readFileSync(manifestUrl, 'utf8')));
    const summary = await report();
    writeFileSync(new URL(`.seed-dev.${target}.report.json`, root), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    return undefined;
  }
  if (existsSync(manifestUrl)) {
    throw new Error(`이미 시드한 기록이 있습니다(${manifestUrl.pathname}). 먼저 --rollback 하세요`);
  }
  const { rows: [{ count }] } = await db.query("SELECT count(*)::int count FROM oauth_credentials WHERE oauth_uid LIKE 'seed-%'");
  if (count) throw new Error(`기록 파일 없이 시드 계정 ${count}개가 남아 있습니다. 확인 후 정리하세요`);

  log(`대상 ${target} (${config.apiBase})`);
  // 1) 계정과 조직 준비 → 45~21일 전으로
  const setupFrom = await dbNow();
  for (const key of Object.keys(PEOPLE)) await createAccount(key);
  saveManifest();
  await setupOrganizations();
  await seedRefreshSessions();
  saveManifest();
  const setupTo = await dbNow();
  await remapRows(nonWorkSpecs(), t => at(-45, '09:00') + (t - setupFrom) * ((at(-21, '18:00') - at(-45, '09:00')) / Math.max(1, setupTo - setupFrom)),
    { from: setupFrom, to: setupTo });
  log(`계정 ${Object.keys(manifest.accounts).length} · 회사 ${Object.keys(manifest.organizations).length} 준비`);

  // 2) 작업
  const specs = buildSpecs();
  for (const [i, spec] of specs.entries()) {
    const record = await seedWork(spec);
    if ((i + 1) % 10 === 0) { saveManifest(); log(`작업 ${i + 1}/${specs.length} (${record.kind})`); }
  }
  await seedWithdrawnTechnicianWork();
  // 발급만 하고 연결하지 않은 사진(PENDING)
  const pendingFile = await upload('st1', `/organizations/${manifest.organizations.main}/site-photo-uploads`, imageBytes('site', 'repair', 1));
  manifest.pendingUploads.push(pendingFile);
  saveManifest();
  log(`작업 ${manifest.works.length}건 완료`);

  // 3) 뒤늦은 사건 → 20시간~1시간 전으로
  const lateFrom = await dbNow();
  await lateEvents();
  for (const key of ['t3', 't6']) {
    const device = await api(key, 'POST', '/push-devices', { platform: key === 't3' ? 'IOS' : 'ANDROID', token: `seed-fcm-${randomUUID()}` });
    manifest.pushDevices.push(device.pushDeviceId);
  }
  const lateTo = await dbNow();
  const lateMap = t => Date.now() - 20 * HOUR + (t - lateFrom) * ((19 * HOUR) / Math.max(1, lateTo - lateFrom));
  await remapRows(nonWorkSpecs(), lateMap, { from: lateFrom, to: lateTo });
  // 탈퇴로 끝난 배정·대기함 반환도 같은 구간으로
  const withdrawnWork = manifest.works.filter(w => w.tech === 't8').map(w => w.workId);
  for (const workId of withdrawnWork) await remapRows(workSpecs(workId), lateMap, { from: lateFrom, to: lateTo });
  saveManifest();

  // 4) 끝난 상태만 두는 행, 읽음
  const terminal = await finishTerminalRows();
  await readSomeNotifications();
  saveManifest();
  log(`정리: ${JSON.stringify(terminal)}`);

  const summary = await report();
  writeFileSync(new URL(`.seed-dev.${target}.report.json`, root), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  log(`완료. 기록 ${manifestUrl.pathname}`);
}

try {
  await main();
} finally {
  // 중간에 실패해도 그때까지 만든 식별자를 남겨 --rollback이 지울 수 있게 한다(되돌리기·대조표 실행은 기록을 쓰지 않는다)
  if (!args.rollback && !args.report && Object.keys(manifest.accounts).length) saveManifest();
  await db.end();
}
