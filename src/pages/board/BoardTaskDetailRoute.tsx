import { Suspense, useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

import { today } from '@/lib/date';
import { isScheduledStatus, useTask } from '@/mocks/selectors';

import { getLoadedTaskDetailModal, LazyTaskDetailModal } from './taskDetailModalLoader';

/**
 * /board/:taskId — 진행 보드 위 작업 상세 모달(1892:12847). 뒤로가기 라벨 '진행 보드', 닫으면 /board.
 * 작업 취소 모달(2490:13502)은 작업 상세 모달이 '작업 취소'로 연다(상세를 숨기고 취소 모달만 표시).
 * 보드 표에 나오는 작업(오늘의 배정됨·작업전·작업중·완료)만 연다. 없는 작업, 취소된 작업(취소 후 보드에서 빠짐),
 * 등록(대기함) 작업(상세 시안 없음 — 작업 목록도 같은 기준), 오늘이 아닌 작업은 보드로 돌아간다.
 */
export default function BoardTaskDetailRoute() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const task = useTask(taskId);
  // 보드에서 연 상세는 이전 기록(보드)으로 돌아가 브라우저 뒤로가기로 모달이 다시 열리지 않게 하고,
  // 주소로 바로 연 상세는 보드로 바꿔 보낸다.
  const handleClose = useCallback(() => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/board', { replace: true });
  }, [location.key, navigate]);
  // 마운트할 때 한 번 정한다. 도중에 바꾸면 모달이 다시 마운트돼 탭·취소 모달 상태가 사라진다.
  const [LoadedModal] = useState(getLoadedTaskDetailModal);

  if (!taskId || !task || !isScheduledStatus(task.status) || task.date !== today()) {
    return <Navigate to="/board" replace />;
  }
  if (LoadedModal) return <LoadedModal taskId={taskId} backLabel="진행 보드" layout="board" onClose={handleClose} />;
  return (
    <Suspense fallback={null}>
      <LazyTaskDetailModal taskId={taskId} backLabel="진행 보드" layout="board" onClose={handleClose} />
    </Suspense>
  );
}
