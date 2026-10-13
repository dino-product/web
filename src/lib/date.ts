/**
 * Asia/Seoul(UTC+9, 서머타임 없음) 기준 날짜·시간 순수 함수.
 * 브라우저 시간대와 관계없이 같은 결과를 낸다. 현재 시각이 필요한 함수는 `now`(epoch ms)를 인자로 받고
 * 기본값으로 `clockNow()`(앱 시계)를 쓴다. 날짜는 'YYYY-MM-DD', 시각은 'HH:mm', 일시는 '+09:00' 오프셋 ISO 문자열이다.
 */
import type { HourMinute, IsoDate, IsoDateTime } from '@/mocks/types';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
/** 하루(ms) */
export const DAY_MS = 24 * 60 * MINUTE_MS;
/** 하루(분) */
export const MINUTES_PER_DAY = 24 * 60;

/** 요일 한 글자. 인덱스 0 = 일요일 */
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** epoch ms·Date·ISO 문자열 중 하나 */
export type DateInput = IsoDateTime | number | Date;

/** Asia/Seoul 기준으로 나눈 일시 구성 요소. month는 1–12, weekday는 0(일)–6(토) */
export interface KstParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * 시연 시각(URL 쿼리 `?time=HH:mm`, Asia/Seoul). 앱의 현재 시각을 오늘 그 시각으로 옮기고 시간은 그대로 흐른다.
 * 시드·'방금 전' 같은 상대 시각·보고 미제출 판단·타임테이블 현재 시각선이 모두 이 시계를 쓴다.
 * 시나리오처럼 sessionStorage(`orbit:time`)에 남아 같은 탭에서 유지되고, `?reset=1` 또는 `?time=real`로 실제 시각으로 돌아간다.
 * 예: 오후에 작업중 상세(Figma 785:4522, 종료 예정 전)를 보려면 `?time=10:30`.
 */
const TIME_STORAGE_KEY = 'orbit:time';

function parseClockTime(value: string | null): HourMinute | null {
  const match = value ? /^(\d{1,2}):(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? `${pad2(hour)}:${pad2(minute)}` : null;
}

function readClockOffset(): number {
  if (typeof window === 'undefined') return 0;
  let time: HourMinute | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('time');
    if (params.get('reset') === '1' || query === 'real') window.sessionStorage.removeItem(TIME_STORAGE_KEY);
    const fromQuery = parseClockTime(query);
    if (fromQuery) window.sessionStorage.setItem(TIME_STORAGE_KEY, fromQuery);
    time = fromQuery ?? (query === 'real' ? null : parseClockTime(window.sessionStorage.getItem(TIME_STORAGE_KEY)));
  } catch {
    // 저장소를 쓸 수 없으면 쿼리 값만 쓴다.
    time = parseClockTime(new URLSearchParams(window.location.search).get('time'));
  }
  if (!time) return 0;
  const real = Date.now();
  return startOfDayMs(toIsoDate(real)) + hmToMinutes(time) * MINUTE_MS - real;
}

const CLOCK_OFFSET_MS = readClockOffset();

/** 앱의 현재 시각(epoch ms). 시연 시각 쿼리가 없으면 Date.now()와 같다. */
export function clockNow(): number {
  return Date.now() + CLOCK_OFFSET_MS;
}

/** 입력을 epoch ms로 바꾼다. ISO 문자열은 오프셋을 포함해야 한다(시드·스토어가 만드는 값은 모두 '+09:00'). */
export function toEpochMs(input: DateInput): number {
  if (typeof input === 'number') return input;
  if (input instanceof Date) return input.getTime();
  return Date.parse(input);
}

/** 입력 시각의 Asia/Seoul 기준 연·월·일·시·분·초·요일 */
export function toKstParts(input: DateInput): KstParts {
  const shifted = new Date(toEpochMs(input) + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(),
  };
}

/** epoch ms·Date를 '+09:00' 오프셋 ISO 일시로 바꾼다. 예: '2026-10-13T09:30:00+09:00' */
export function toIsoDateTime(input: DateInput): IsoDateTime {
  const p = toKstParts(input);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}+09:00`;
}

/** 현재 일시(ISO, '+09:00') */
export function nowIso(now: number = clockNow()): IsoDateTime {
  return toIsoDateTime(now);
}

/** 입력 시각의 Asia/Seoul 날짜 'YYYY-MM-DD' */
export function toIsoDate(input: DateInput): IsoDate {
  const p = toKstParts(input);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** 입력 시각의 Asia/Seoul 시각 'HH:mm' */
export function toHourMinute(input: DateInput): HourMinute {
  const p = toKstParts(input);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** 오늘 날짜(Asia/Seoul) 'YYYY-MM-DD' */
export function today(now: number = clockNow()): IsoDate {
  return toIsoDate(now);
}

/** 'YYYY-MM-DD'를 숫자로 나눈다. month는 1–12 */
export function parseIsoDate(date: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

/** 날짜의 Asia/Seoul 자정(epoch ms) */
export function startOfDayMs(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date);
  return Date.UTC(year, month - 1, day) - KST_OFFSET_MS;
}

/** 날짜에 일수를 더한다(음수면 뺀다). 예: addDays('2026-10-31', 1) → '2026-11-01' */
export function addDays(date: IsoDate, days: number): IsoDate {
  return toIsoDate(startOfDayMs(date) + days * DAY_MS);
}

/** 두 날짜 사이의 일수(to − from). 예: diffDays('2026-10-10', '2026-10-13') → 3 */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((startOfDayMs(to) - startOfDayMs(from)) / DAY_MS);
}

/** 날짜의 요일 번호. 0 = 일요일 */
export function weekdayOf(date: IsoDate): number {
  return toKstParts(startOfDayMs(date)).weekday;
}

/** 날짜의 요일 한 글자. 예: '수' */
export function weekdayLabel(date: IsoDate): string {
  return WEEKDAY_LABELS[weekdayOf(date)];
}

/** 날짜가 오늘(Asia/Seoul)인지 */
export function isToday(date: IsoDate, now: number = clockNow()): boolean {
  return date === today(now);
}

/** 날짜와 'HH:mm'을 합친 ISO 일시. 예: ('2026-10-13', '09:00') → '2026-10-13T09:00:00+09:00' */
export function combineDateTime(date: IsoDate, time: HourMinute): IsoDateTime {
  return `${date}T${time}:00+09:00`;
}

/** 날짜와 'HH:mm'을 epoch ms로 바꾼다. 24:00 이후 값(예: '25:00')도 다음 날로 계산한다. */
export function dateTimeToMs(date: IsoDate, time: HourMinute): number {
  return startOfDayMs(date) + hmToMinutes(time) * MINUTE_MS;
}

/** 'HH:mm' → 자정부터의 분. 예: '13:30' → 810 */
export function hmToMinutes(hm: HourMinute): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/** 자정부터의 분 → 'HH:mm'. 하루를 넘거나 음수면 24시간 안으로 감는다. 예: 810 → '13:30', 1500 → '01:00' */
export function minutesToHm(minutes: number): HourMinute {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
}

/** 'HH:mm'에 분을 더한다. 예: ('09:00', 120) → '11:00' */
export function addMinutesToHm(hm: HourMinute, minutes: number): HourMinute {
  return minutesToHm(hmToMinutes(hm) + minutes);
}

/** 현재 시각의 자정부터 분(Asia/Seoul). 타임테이블 현재 시각선 위치 계산용 */
export function nowMinutes(now: number = clockNow()): number {
  const p = toKstParts(now);
  return p.hour * 60 + p.minute + p.second / 60;
}

/** 날짜가 속한 달의 1일 'YYYY-MM-01' */
export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

/** 두 날짜가 같은 달(Asia/Seoul)인지 */
export function isSameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}
