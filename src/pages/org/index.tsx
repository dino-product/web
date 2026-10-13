import { Navigate, Route, Routes } from 'react-router-dom';

import CompanyInfoPage from './company/CompanyInfoPage';
import MemberHistoryPage from './members/MemberHistoryPage';
import MembersPage from './members/MembersPage';
import OrgLayout from './OrgLayout';
import TypesPage from './types/TypesPage';

/**
 * 조직 설정 섹션(/org/*).
 * - /org → /org/company
 * - /org/company 발주사 정보, /org/members 인력관리, /org/types 유형 설정(org-types 담당) — 조직 설정 레이아웃(제목·탭·우측 상단 버튼)
 * - /org/members/:memberId 기사 작업이력(레이아웃 없음, 상단 경로 '기사 관리 / 작업이력')
 * - 회사 코드 관리·승인대기 모달은 ?modal=code|approvals (인력관리·유형 설정 탭)
 */
export default function OrgSection() {
  return (
    <Routes>
      <Route index element={<Navigate to="/org/company" replace />} />
      <Route element={<OrgLayout />}>
        <Route path="company" element={<CompanyInfoPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="types" element={<TypesPage />} />
      </Route>
      <Route path="members/:memberId" element={<MemberHistoryPage />} />
      <Route path="*" element={<Navigate to="/org/company" replace />} />
    </Routes>
  );
}
