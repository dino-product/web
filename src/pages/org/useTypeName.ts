import { useType } from '@/data/selectors';
import type { ID } from '@/data/types';

/** 유형 미지정·삭제 시 표기('유형 없음' — 유형 삭제 확인 모달 2008:27365 문구) */
export const NO_TYPE_LABEL = '유형 없음';

/** 인력·작업 유형 이름. 삭제된 유형도 이름을 찾고, 없으면 '유형 없음' */
export function useTypeName(typeId: ID | null | undefined): string {
  const type = useType(typeId);
  return type?.name ?? NO_TYPE_LABEL;
}
