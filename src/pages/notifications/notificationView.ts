import { HISTORY_LABEL } from '@/mocks/constants';
import type { NotificationType } from '@/mocks/types';

/**
 * 알림창 행의 유형 라벨 색(1921:9287). 신규 배정 #4a4193은 변수가 아닌 Figma 고정값이다.
 * 수락 완료는 Figma에서 오늘 묶음 Accepted/1, 어제 묶음 #0967ff로 달라 변수인 Accepted/1로 통일했다.
 */
export const TYPE_LABEL_COLOR: Record<NotificationType, string> = {
  ASSIGNED: '#4a4193',
  SCHEDULE_CHANGED: 'var(--color-delayed-1)',
  CANCELED: 'var(--color-warning-1)',
  ACCEPTED: 'var(--color-accepted-1)',
  REJECTED: 'var(--color-warning-1)',
  REPORTED: 'var(--color-gray-900)',
};

/**
 * 알림 상세 제목과 '작업 정보' 마지막 행(사건 일시) 이름.
 * - 작업 취소: 1807:6719('작업 취소됨' · '취소 일시')
 * - 수락 완료: 1834:5562('작업 배정됨' · '수락 일시', docs/data-layer.md의 n-04 ↔ 1834:5562 연결)
 * - 신규 배정: 같은 시안의 제목 '작업 배정됨' + '배정 일시'
 * - 일정 변경·작업 거절·완료 보고: 시안이 없어 같은 형식(작업 ~됨 · ~ 일시)으로 만든 문구
 */
export const DETAIL_COPY: Record<NotificationType, { title: string; timeLabel: string }> = {
  CANCELED: { title: '작업 취소됨', timeLabel: '취소 일시' },
  ACCEPTED: { title: '작업 배정됨', timeLabel: '수락 일시' },
  ASSIGNED: { title: '작업 배정됨', timeLabel: '배정 일시' },
  SCHEDULE_CHANGED: { title: '일정 변경됨', timeLabel: '변경 일시' },
  REJECTED: { title: '작업 거절됨', timeLabel: '거절 일시' },
  REPORTED: { title: '완료 보고됨', timeLabel: '보고 일시' },
};

/**
 * 알림 상세 '처리 이력' 표기(1807:6719 · 1834:5562). 작업 이력(HISTORY_LABEL) 중 시안에 표기가 있는 사건은 시안 표기로,
 * '기사 거절'은 같은 형식('작업 수락'·'작업 취소')과 알림 유형 라벨에 맞춰 '작업 거절'로 쓴다. 나머지는 HISTORY_LABEL 그대로.
 * 시안의 '배정 대기'는 옛 상태 표기라 새 표기 '배정됨'으로 쓴다(디자이너 전달사항 2026.10.08).
 */
const HISTORY_DISPLAY: Record<string, string> = {
  [HISTORY_LABEL.registered]: '작업 등록',
  [HISTORY_LABEL.assigned]: '배정됨',
  [HISTORY_LABEL.accepted]: '작업 수락',
  [HISTORY_LABEL.rejected]: '작업 거절',
  [HISTORY_LABEL.canceled]: '작업 취소',
};

export function historyDisplayLabel(label: string): string {
  return HISTORY_DISPLAY[label] ?? label;
}
