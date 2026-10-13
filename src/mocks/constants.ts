/**
 * 목업 데이터 계층 공용 상수. 스토어·시드·셀렉터가 같은 값을 쓰도록 한곳에 둔다.
 * 선택지 목록은 Figma 시안에 보이는 값을 기준으로 하고, 시안에 없는 값은 주석에 근거를 적는다.
 */
import type { TypeColor } from '@/mocks/types';

/** 로그인 사용자 Member ID(오르빗) */
export const CURRENT_USER_ID = 'm-me';

/** 기본 발주사 ID('OO건설') */
export const PRIMARY_COMPANY_ID = 'c-1';
/** 두 번째 발주사 ID('협력 발주사', ?companies=2일 때만 존재) */
export const PARTNER_COMPANY_ID = 'c-2';

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

/**
 * 상태별 시연용 고정 작업 ID(시드). 대응 Figma 프레임은 docs/data-layer.md §4 참고.
 * data=empty 시나리오에서는 존재하지 않는다.
 */
export const DEMO_TASK_IDS = {
  /** 배정됨(PENDING_ACCEPT) — 작업 상세 '아직 작업이 수락되지 않았어요' */
  pending: 't-demo-pending',
  /** 작업전(ACCEPTED) — 이민준 기사 '냉장고 수리', 수락 완료 알림(n-04)과 연결 */
  accepted: 't-demo-accepted',
  /** 작업중(IN_PROGRESS) */
  inProgress: 't-demo-in-progress',
  /** 작업중 + 지연 배지 */
  delayed: 't-demo-delayed',
  /** 완료(COMPLETED) — 완료 보고·첨부 파일 6장 */
  completed: 't-demo-completed',
  /** 작업중인데 종료 예정 시각이 지났고 보고 없음(어제 작업) — '기사에게 요청 보내기' */
  noReport: 't-demo-no-report',
  /** 등록 + 거절 배지(김태훈 기사, 사유 '일정 중복') */
  rejected: 't-demo-rejected',
  /** 오늘 13:00–15:00 이철호 기사 '세탁기 설치' — 같은 칸에 놓으면 일정 충돌 경고 */
  conflict: 't-demo-conflict',
  /** 대기함 '인덕션 교체'(등록 3일 경과) — 타임테이블 '변경된 정보입니다' 모달 재현용 후보 */
  stale: 't-demo-stale',
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
