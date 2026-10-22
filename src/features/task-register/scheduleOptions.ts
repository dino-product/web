/**
 * 시작 시간·예상 소요 시간 선택지. 새 작업 등록 모달(1282:7973)과 타임테이블 배정 확인 모달(1325:8954)이 함께 쓴다.
 * 격자 배치 단위가 30분이라 두 선택지 모두 30분 간격이다.
 */
import { minutesToHm } from '@/lib/date';
import { formatDuration } from '@/lib/format';
import type { HourMinute } from '@/data/types';

export interface ScheduleOption<T extends string = string> {
  value: T;
  label: string;
}

/** 30분 단위(분) */
export const SLOT_MINUTES = 30;

/** 시작 시간 00:00 – 23:30(30분 간격) */
export const START_TIME_OPTIONS: ScheduleOption<HourMinute>[] = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, i) => {
  const hm = minutesToHm(i * SLOT_MINUTES);
  return { value: hm, label: hm };
});

/** 시작 시간 패널을 처음 열 때 보여 줄 시각(격자 첫 화면과 같은 09:00) */
export const START_TIME_SCROLL_HINT: HourMinute = '09:00';

/** 예상 소요 시간 30분 – 8시간(30분 간격). 값은 분(문자열) */
export const DURATION_OPTIONS: ScheduleOption[] = Array.from({ length: 16 }, (_, i) => {
  const minutes = (i + 1) * SLOT_MINUTES;
  return { value: String(minutes), label: formatDuration(minutes) };
});

/** 목록에 없는 현재 값(예: 45분)도 고를 수 있게 선택지에 끼워 넣는다. */
export function withCurrentOption(options: ScheduleOption[], value: string | null, label: string): ScheduleOption[] {
  if (value === null || options.some((o) => o.value === value)) return options;
  return [...options, { value, label }].sort((a, b) => Number(a.value) - Number(b.value));
}
