import { Navigate, Route, Routes } from 'react-router-dom';

import CompanyStep from './CompanyStep';
import ProfileStep from './ProfileStep';
import TypesStep from './TypesStep';

/**
 * /onboarding/* 하위 라우트(공개 경로).
 * - profile: 1 프로필 등록(1453:12438) · company: 2 발주사 생성(1453:14801) · types: 3 유형 설정(1894:8760)
 * - 그 밖의 경로는 profile로 보낸다.
 */
export default function OnboardingRoutes() {
  return (
    <Routes>
      <Route path="profile" element={<ProfileStep />} />
      <Route path="company" element={<CompanyStep />} />
      <Route path="types" element={<TypesStep />} />
      <Route index element={<Navigate to="/onboarding/profile" replace />} />
      <Route path="*" element={<Navigate to="/onboarding/profile" replace />} />
    </Routes>
  );
}
