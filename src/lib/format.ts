/**
 * 화면 표시용 포맷 순수 함수(Asia/Seoul 기준). 예시 문자열은 Figma 시안 표기를 따른다.
 * 현재 시각이 필요한 함수는 `now`(epoch ms)를 인자로 받고 기본값으로 `clockNow()`(앱 시계, lib/date.ts)를 쓴다.
 */
import {
  clockNow,
  type DateInput,
  diffDays,
  hmToMinutes,
  minutesToHm,
  parseIsoDate,
  toEpochMs,
  toIsoDate,
  toKstParts,
  today,
  weekdayLabel,
} from '@/lib/date';
import type { HourMinute, IsoDate } from '@/data/types';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 타임테이블 날짜. 예: '2026-10-21' → '2026. 10.21 (수)' */
export function formatTimetableDate(date: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  return `${year}. ${pad2(month)}.${pad2(day)} (${weekdayLabel(date)})`;
}

/** 진행 보드 날짜. 오늘이면 '(오늘)', 아니면 요일. 예: '2026년 12월 18일 (오늘)', '2026년 12월 19일 (토)' */
export function formatBoardDate(date: IsoDate, now: number = clockNow()): string {
  const { year, month, day } = parseIsoDate(date);
  const suffix = date === today(now) ? '오늘' : weekdayLabel(date);
  return `${year}년 ${month}월 ${day}일 (${suffix})`;
}

/** 'YYYY년 M월 D일'. 예: '2024년 1월 15일' */
export function formatKoreanDate(date: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  return `${year}년 ${month}월 ${day}일`;
}

/** 'YYYY년 M월 D일 HH:mm'(알림 상세 일시). 예: '2024년 1월 15일 14:30' */
export function formatKoreanDateTime(at: DateInput): string {
  const p = toKstParts(at);
  return `${p.year}년 ${p.month}월 ${p.day}일 ${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** 'M월 D일 (요일)'. 예: '1월 23일 (목)' */
export function formatMonthDayWeekday(date: IsoDate): string {
  const { month, day } = parseIsoDate(date);
  return `${month}월 ${day}일 (${weekdayLabel(date)})`;
}

/** 'M월 D일 (요일) HH:mm'(종료 예정 시각 등). 예: '1월 23일 (목) 11:00' */
export function formatMonthDayWeekdayTime(date: IsoDate, time: HourMinute): string {
  return `${formatMonthDayWeekday(date)} ${time}`;
}

/** 'MM{sep}DD'. 예: ('2026-09-24') → '09-24', ('2026-09-26', '/') → '09/26', ('2026-10-01', '.') → '10.01' */
export function formatMonthDay(date: IsoDate, separator = '-'): string {
  const { month, day } = parseIsoDate(date);
  return `${pad2(month)}${separator}${pad2(day)}`;
}

/** 'YYYY.MM.DD'. 예: '2026.09.30' */
export function formatDateDot(date: IsoDate): string {
  return date.replaceAll('-', '.');
}

/** 시간 범위. 예: ('09:00', 120) → '09:00 - 11:00', ('13:00', 120, '-') → '13:00-15:00' */
export function formatTimeRange(start: HourMinute, durationMinutes: number, separator = ' - '): string {
  return `${start}${separator}${minutesToHm(hmToMinutes(start) + durationMinutes)}`;
}

/**
 * 작업의 예정 시간 표시. 시작 시각·소요 시간이 모두 있으면 범위, 시작 시각만 있으면 시각, 없으면 null.
 * 예: '09:00 - 11:00'
 */
export function formatTaskTime(
  task: { startTime: HourMinute | null; durationMinutes: number | null },
  separator = ' - ',
): string | null {
  if (!task.startTime) return null;
  if (task.durationMinutes == null) return task.startTime;
  return formatTimeRange(task.startTime, task.durationMinutes, separator);
}

/** 소요 시간. 예: 120 → '2시간', 90 → '1시간 30분', 30 → '30분' */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/**
 * 지난 시간(최근 수정일 등). 1분 미만 '방금 전', 1시간 미만 'N분 전', 하루 미만 'N시간 전',
 * 30일 미만 'N일 전', 1년 미만 'N개월 전', 그 이상 'N년 전'. 미래 시각은 '방금 전'.
 */
export function formatRelativeTime(at: DateInput, now: number = clockNow()): string {
  const diffMs = now - toEpochMs(at);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

/** 등록 후 지난 날짜 수(달력 기준, 당일 0). 예: '등록 3일 경과' */
export function formatElapsedSinceRegistered(createdAt: DateInput, now: number = clockNow()): string {
  return `등록 ${Math.max(0, diffDays(toIsoDate(createdAt), today(now)))}일 경과`;
}

/** 상세 날짜. 예: '2025-01-23' → '2025-01-23(목)' */
export function formatDetailDate(date: IsoDate): string {
  return `${date}(${weekdayLabel(date)})`;
}

/** 상세 일시. 예: ('2025-01-23', '09:00') → '2025-01-23(목) 09:00' */
export function formatDetailDateTime(date: IsoDate, time: HourMinute): string {
  return `${formatDetailDate(date)} ${time}`;
}

/** 상태 변경 이력 일시. 예: '2025-01-23 08:45' */
export function formatHistoryDateTime(at: DateInput): string {
  const p = toKstParts(at);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** 참여일 등 날짜. 예: '2026-02-28' */
export function formatJoinDate(at: DateInput): string {
  return toIsoDate(at);
}

/** 오전·오후 12시간제 시각. 예: '15:15' → '오후 03:15', '00:30' → '오전 12:30' */
export function formatAmPmTime(hm: HourMinute): string {
  const minutes = hmToMinutes(hm);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? '오전' : '오후'} ${pad2(h12)}:${pad2(m)}`;
}

/** 문장 속 시각. 예: '14:00' → '오후 2시', '09:30' → '오전 9시 30분' */
export function formatKoreanHour(hm: HourMinute): string {
  const minutes = hmToMinutes(hm);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? '오전' : '오후'} ${h12}시${m ? ` ${m}분` : ''}`;
}

/** 알림 시각. 오늘이면 '오후 03:15', 이전이면 'MM.DD HH:mm'(예: '10.01 15:15') */
export function formatNotificationTime(at: DateInput, now: number = clockNow()): string {
  const p = toKstParts(at);
  const hm = `${pad2(p.hour)}:${pad2(p.minute)}`;
  if (toIsoDate(at) === today(now)) return formatAmPmTime(hm);
  return `${pad2(p.month)}.${pad2(p.day)} ${hm}`;
}

/** 알림 묶음 제목. 오늘 '오늘', 어제 '어제', 그 이전 'YYYY.MM.DD'(예: '2026.09.30') */
export function formatNotificationGroup(at: DateInput, now: number = clockNow()): string {
  const date = toIsoDate(at);
  const days = diffDays(date, today(now));
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  return formatDateDot(date);
}

/** 천 단위 쉼표. 예: 120000 → '120,000' */
export function formatNumber(value: number): string {
  const [int, frac] = String(Math.abs(value)).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

/** 금액. 예: 120000 → '120,000원' */
export function formatPrice(won: number): string {
  return `${formatNumber(won)}원`;
}

/**
 * 전화번호 하이픈 표기. 숫자만 골라 입력 중인 값도 단계적으로 맞춘다.
 * 예: '01012345678' → '010-1234-5678', '0101234' → '010-1234', '0212345678' → '02-1234-5678'
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 파일 크기. 예: 523000 → '511KB', 2400000 → '2.3MB' */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)}MB`;
}

const REPORT_PARTS_MARKER = '\n\n[사용 부품]\n';

/**
 * 완료 보고 본문(TaskReport.content)을 '작업 메모'와 '사용 부품'으로 나눈다.
 * 본문 규칙: `${메모}\n\n[사용 부품]\n${부품}`. 표시가 없으면 전체가 메모, 부품은 ''.
 */
export function splitReportContent(content: string): { memo: string; parts: string } {
  const index = content.indexOf(REPORT_PARTS_MARKER);
  if (index === -1) return { memo: content, parts: '' };
  return { memo: content.slice(0, index), parts: content.slice(index + REPORT_PARTS_MARKER.length) };
}

/** splitReportContent의 반대. 작업 메모와 사용 부품을 TaskReport.content 한 문자열로 합친다. */
export function joinReportContent(memo: string, parts: string): string {
  return parts ? `${memo}${REPORT_PARTS_MARKER}${parts}` : memo;
}
