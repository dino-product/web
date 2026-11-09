import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { selectCurrentMembership } from '@/data/selectors';
import { useAppStore } from '@/data/store';

/**
 * 총관리자 전용 화면(조직 설정 /org/*) 가드. 현재 발주사에서 직원이면 타임테이블로 보낸다.
 * 서버는 발주사 정보·회사 코드·참여 인원·승인 대기·유형 변경·관리자 지정을 모두 총관리자만 허용한다(ORGANIZATION-003).
 * 소속을 아직 읽지 못했으면(새로고침 직후) 역할을 모르므로 그대로 그린다. 읽은 뒤 직원이면 그때 보낸다.
 */
export default function RequireOwner({ children }: { children: ReactNode }) {
  const role = useAppStore((s) => selectCurrentMembership(s)?.role);
  if (role === 'STAFF') return <Navigate to="/timetable" replace />;
  return children;
}
