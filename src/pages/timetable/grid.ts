/**
 * 타임테이블 격자 치수(Figma 443:1156). 1시간 = 156px(10분 칸 26px x 6), 행 = 111px(블록 110 + 아래선 1).
 * 시간 축은 00:00–24:00(1시간 간격, 24시간 표기)이고 처음에는 시안 첫 칸인 09:00이 왼쪽에 오도록 스크롤한다.
 */
import { SLOT_MINUTES } from '@/features/task-register/scheduleOptions';

export const HOUR_WIDTH = 156;
export const TEN_MINUTE_WIDTH = 26;
export const AXIS_HOURS = 24;
export const AXIS_WIDTH = HOUR_WIDTH * AXIS_HOURS;
export const INITIAL_SCROLL_HOUR = 9;

export const ROW_HEIGHT = 111;
export const BLOCK_HEIGHT = 110;
export const HEADER_HEIGHT = 60;
export const DRIVER_COLUMN_WIDTH = 184;
/** 기사 0명일 때 왼쪽 열(1834:10567 Frame 221)은 오른쪽 선을 포함해 185px */
export const EMPTY_DRIVER_COLUMN_WIDTH = 185;

/** 한 화면에 보이는 행 수. 격자 프레임 최대 높이 837 = 60 + 111 x 7 */
export const VISIBLE_ROWS = 7;
export const GRID_MAX_HEIGHT = HEADER_HEIGHT + ROW_HEIGHT * VISIBLE_ROWS;

/** 본문 너비 1547 = 격자 + 40 + 대기함(295, 접힘 90) */
export const CONTENT_WIDTH = 1547;
export const CONTENT_GAP = 40;
export const PANEL_WIDTH = 295;
export const PANEL_COLLAPSED_WIDTH = 90;

export const MINUTES_PER_DAY = 24 * 60;

/** 자정부터 분 → 격자 x(px) */
export function minutesToX(minutes: number): number {
  return (minutes / 60) * HOUR_WIDTH;
}

/** 소요 시간(분) → 블록 너비(px) */
export function durationToWidth(minutes: number): number {
  return (minutes / 60) * HOUR_WIDTH;
}

/**
 * 격자 x(px) → 30분 단위 시작 시각(분). floor는 포인터가 있는 칸, round는 가장 가까운 칸(블록 이동).
 * 하루 범위 안(00:00–23:30)으로 맞춘다.
 */
export function xToSlotMinutes(x: number, mode: 'floor' | 'round'): number {
  const minutes = (x / HOUR_WIDTH) * 60;
  const slots = mode === 'floor' ? Math.floor(minutes / SLOT_MINUTES) : Math.round(minutes / SLOT_MINUTES);
  return Math.min(Math.max(slots * SLOT_MINUTES, 0), MINUTES_PER_DAY - SLOT_MINUTES);
}

/** 기사 0명 안내 카드(1834:11068, 512x300) 위치. 시안은 접힌 격자(1417)에서 x=475, y=268 */
export const EMPTY_CARD_WIDTH = 512;
export const EMPTY_CARD_HEIGHT = 300;
export function emptyCardPosition(gridWidth: number, gridHeight: number): { left: number; top: number } {
  return {
    left: (gridWidth - EMPTY_CARD_WIDTH) / 2 + 22.5,
    top: Math.floor((gridHeight - EMPTY_CARD_HEIGHT) / 2),
  };
}
