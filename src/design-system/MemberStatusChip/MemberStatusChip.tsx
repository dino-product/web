import { MEMBER_STATUS_LABEL, type MemberStatus } from '@/data/types';

import { Chip } from '../Chip/Chip';

export interface MemberStatusChipProps {
  status: MemberStatus;
  className?: string;
}

/** Figma `Component 15` 570:2977 — 활성화(#4f3bfe 12% / #4f3bfe) · 비활성화(Gray100 / Gray700), 높이 30, 16/500 */
export function MemberStatusChip({ status, className }: MemberStatusChipProps) {
  return (
    <Chip tone={status === 'ACTIVE' ? 'active' : 'inactive'} className={className}>
      {MEMBER_STATUS_LABEL[status]}
    </Chip>
  );
}
