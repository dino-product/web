/**
 * 데이터 계층 공용 상수. 스토어·변환·셀렉터가 같은 값을 쓰도록 한곳에 둔다.
 * 선택지 목록은 Figma 시안에 보이는 값을 기준으로 하며, 서버 코드와의 짝은 src/data/mappers.ts에 있다.
 */
import type { TypeColor } from '@/data/types';

/** 작업 상태 변경 이력(TaskHistoryEntry.label) 문구. Figma 작업 상세 '상태 변경 이력' 표기 기준 */
export const HISTORY_LABEL = {
  registered: '작업 등록됨',
  assigned: '배정 알림 발송됨',
  accepted: '기사 수락',
  rejected: '기사 거절',
  started: '작업 시작',
  reported: '완료 보고 제출',
  canceled: '작업 취소',
  rescheduled: '일정 변경',
  unassigned: '배정 해제',
  edited: '작업 정보 수정',
  reportRequested: '완료 보고 요청',
} as const;

/** 작업 취소 사유(Figma 작업 취소 모달 드롭다운). '기타'는 상세 사유 입력 */
export const CANCEL_REASONS = ['고객 요청', '기사 사정', '중복 등록', '기타'] as const;

/** 결제 방식. '현장 결제'는 Figma 작업 상세 값, 나머지는 types.ts 예시 값 */
export const PAYMENT_METHODS = ['현장 결제', '계좌 이체', '카드 결제'] as const;

/** 업종(Figma 발주사 정보 업종 드롭다운 1908:13162) */
export const INDUSTRIES = ['전기·전자', '냉난방 설비', '배관·설비', '가전 A/S', '종합 시설관리', '기타'] as const;

/** 작업 유형 색상 기본 순서. addType이 색을 받지 못하면 아직 안 쓴 색을 이 순서로 고른다. */
export const TYPE_COLOR_ORDER: readonly TypeColor[] = ['PURPLE', 'BLUE', 'YELLOW', 'GREEN', 'PINK', 'RED', 'BROWN', 'GRAY'];

/** 작업 등록 모달의 사진 첨부 최대 장수(Figma '이미지를 첨부하세요 (최대 6장)') */
export const MAX_SITE_PHOTOS = 6;
