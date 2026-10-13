import { Navigate, Route, Routes } from 'react-router-dom';

import MyPage from './MyPage';
import WithdrawPage from './WithdrawPage';

/** 마이페이지 섹션 진입점(/mypage/*). */
export default function MyPageSection() {
  return (
    <Routes>
      <Route index element={<MyPage />} />
      <Route path="withdraw" element={<WithdrawPage />} />
      <Route path="*" element={<Navigate to="/mypage" replace />} />
    </Routes>
  );
}
