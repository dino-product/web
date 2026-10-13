import { Navigate, Route, Routes } from 'react-router-dom';

import BoardPage from './BoardPage';
import BoardTaskDetailRoute from './BoardTaskDetailRoute';

/**
 * 진행 보드 섹션 진입점(/board/*).
 * - /board: 진행 보드(560:2831), 목록 없음(2043:35796, ?data=empty), 네트워크 실패(1472:7414, ?network=offline)
 * - /board/:taskId: 보드 위 작업 상세 모달(1892:12847). 작업 취소 모달(2490:13502)은 작업 상세 모달이 연다.
 * BoardPage를 레이아웃 라우트로 두어 상세 모달을 열고 닫아도 탭 선택이 유지된다.
 */
export default function BoardSection() {
  return (
    <Routes>
      <Route element={<BoardPage />}>
        <Route index element={null} />
        <Route path=":taskId" element={<BoardTaskDetailRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}
