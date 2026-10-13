import { isTypeNameTaken } from '@/mocks/selectors';
import type { ID, TypeCategory, TypeItem } from '@/mocks/types';

/** 하위 탭 쿼리 값(?tab=employee|technician|work) ↔ 유형 분류 */
export type TypesTab = 'employee' | 'technician' | 'work';

export const TAB_CATEGORY: Record<TypesTab, TypeCategory> = {
  employee: 'EMPLOYEE',
  technician: 'TECHNICIAN',
  work: 'WORK',
};

export const TYPES_TABS: readonly TypesTab[] = ['employee', 'technician', 'work'];

export function parseTypesTab(value: string | null): TypesTab {
  return TYPES_TABS.includes(value as TypesTab) ? (value as TypesTab) : 'employee';
}

/** Figma 1924:15045 입력 도움말(Gray400). 글자 수가 맞지 않으면 같은 문구를 오류 색으로 보여 준다. */
export const NAME_HELP = '2~10자를 입력해주세요';
/** Figma 2008:34224 · 1924:14345 중복 오류(Warning/1) */
export const NAME_DUPLICATE = '조직 내 이름이 중복됩니다.';

export const NAME_MIN = 2;
export const NAME_MAX = 10;

/** 유형 이름 검사. 통과하면 null, 아니면 화면에 보일 오류 문구(시안 문구 그대로). */
export function validateTypeName(
  types: TypeItem[],
  category: TypeCategory,
  name: string,
  exceptTypeId?: ID,
): string | null {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) return NAME_HELP;
  if (isTypeNameTaken(types, category, trimmed, exceptTypeId)) return NAME_DUPLICATE;
  return null;
}
