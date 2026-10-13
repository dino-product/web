/**
 * 테스트 시나리오(URL 쿼리) 읽기. 화면에 보이는 전환 UI 없이 쿼리로만 상태를 바꾼다(docs/ui-plan.md §7).
 *
 * - 지원 쿼리: role=owner|staff, data=default|empty, network=online|offline, companies=1|2, user=existing|new, reset=1
 * - 앱 시작 시 한 번 읽어 sessionStorage('orbit:scenario')에 저장된 값과 병합하고 다시 저장한다.
 *   같은 탭에서는 쿼리 없이 새로고침해도 유지된다. reset=1이면 저장값을 지우고 기본값에서 다시 시작한다
 *   (같은 URL의 다른 쿼리는 reset 뒤에 적용).
 * - 잘못된 값은 무시한다. sessionStorage를 쓸 수 없는 환경에서도 쿼리 값으로 동작한다.
 */
import type { Scenario } from '@/mocks/types';

/** sessionStorage 키 */
export const SCENARIO_STORAGE_KEY = 'orbit:scenario';

/** 쿼리가 없을 때의 기본 시나리오: 총관리자, 기본 데이터, 온라인, 발주사 1곳, 기존 사용자 */
export const DEFAULT_SCENARIO: Scenario = {
  role: 'owner',
  data: 'default',
  network: 'online',
  companies: 1,
  user: 'existing',
};

type ScenarioPatch = Partial<Scenario>;

function parseRole(value: unknown): Scenario['role'] | undefined {
  return value === 'owner' || value === 'staff' ? value : undefined;
}

function parseData(value: unknown): Scenario['data'] | undefined {
  return value === 'default' || value === 'empty' ? value : undefined;
}

function parseNetwork(value: unknown): Scenario['network'] | undefined {
  return value === 'online' || value === 'offline' ? value : undefined;
}

function parseCompanies(value: unknown): Scenario['companies'] | undefined {
  if (value === 1 || value === '1') return 1;
  if (value === 2 || value === '2') return 2;
  return undefined;
}

function parseUser(value: unknown): Scenario['user'] | undefined {
  return value === 'existing' || value === 'new' ? value : undefined;
}

/** 쿼리·저장값 어디서 왔든 알려진 키와 올바른 값만 남긴다. */
function sanitize(source: Record<string, unknown>): ScenarioPatch {
  const patch: ScenarioPatch = {};
  const role = parseRole(source.role);
  const data = parseData(source.data);
  const network = parseNetwork(source.network);
  const companies = parseCompanies(source.companies);
  const user = parseUser(source.user);
  if (role) patch.role = role;
  if (data) patch.data = data;
  if (network) patch.network = network;
  if (companies) patch.companies = companies;
  if (user) patch.user = user;
  return patch;
}

function readStored(): ScenarioPatch {
  try {
    const raw = window.sessionStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? sanitize(parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeStored(scenario: Scenario | null): void {
  try {
    if (scenario) window.sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
    else window.sessionStorage.removeItem(SCENARIO_STORAGE_KEY);
  } catch {
    // 저장소를 쓸 수 없어도 이번 실행은 쿼리 값으로 동작한다.
  }
}

/**
 * URL 쿼리와 sessionStorage를 병합한 시나리오를 돌려주고 저장한다. 스토어 초기화 때 한 번 호출한다.
 * @param search 기본값은 현재 location.search. 예: '?role=staff&companies=2'
 */
export function readScenario(search: string = typeof window === 'undefined' ? '' : window.location.search): Scenario {
  const params = new URLSearchParams(search);
  const fromQuery = sanitize(Object.fromEntries(params.entries()));
  const reset = params.get('reset') === '1';
  const stored = reset ? {} : readStored();
  const scenario: Scenario = { ...DEFAULT_SCENARIO, ...stored, ...fromQuery };

  const hasQueryValues = Object.keys(fromQuery).length > 0;
  if (reset && !hasQueryValues) writeStored(null);
  else if (reset || hasQueryValues) writeStored(scenario);
  return scenario;
}
