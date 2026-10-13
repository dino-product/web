/**
 * 작업 목록 섹션 진입점(/tasks/*).
 * - /tasks: 작업 목록
 * - /tasks/:taskId: 작업 목록 + 작업 상세 모달(뒤로가기 '작업 목록으로', 닫으면 /tasks)
 * 목록은 라우트 밖에 한 번만 그려 상세 모달을 열고 닫아도 필터·페이지가 유지된다.
 */
import { useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

import TaskDetailModal from '@/features/task-detail/TaskDetailModal';
import { selectTaskById } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';

import TaskListPage from './TaskListPage';

export default function TasksSection() {
  return (
    <>
      <TaskListPage />
      <Routes>
        <Route index element={null} />
        <Route path=":taskId" element={<TaskDetailRoute />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </>
  );
}

/** 등록·취소 작업은 상세 시안이 없으므로 목록으로 돌려보낸다. */
function TaskDetailRoute() {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAppStore((s) => selectTaskById(s, taskId)?.status);
  // 목록에서 연 상세는 이전 기록(목록)으로 돌아가 브라우저 뒤로가기로 모달이 다시 열리지 않게 하고,
  // 주소로 바로 연 상세는 목록으로 바꿔 보낸다.
  const handleClose = useCallback(() => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/tasks', { replace: true });
  }, [location.key, navigate]);

  if (!status || status === 'REGISTERED' || status === 'CANCELED') return <Navigate to="/tasks" replace />;
  return <TaskDetailModal taskId={taskId} backLabel="작업 목록으로" onClose={handleClose} />;
}
