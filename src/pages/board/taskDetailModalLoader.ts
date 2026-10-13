import { type ComponentType, lazy } from 'react';

import type { TaskDetailModalProps } from '@/features/task-detail/TaskDetailModal';

/**
 * tasks 담당 공용 작업 상세 모달(@/features/task-detail/TaskDetailModal)을 따로 불러온다.
 * - 모달 코드에 문제가 있어도 보드 목록은 그대로 그려진다(오류는 상세 라우트를 열 때 라우터 오류 화면으로 드러난다).
 * - 보드가 열릴 때 미리 불러 두고, 불러온 뒤에는 Suspense 없이 바로 그린다
 *   (React가 Suspense 내용 표시를 최대 300ms 늦추기 때문에 행을 누른 직후 모달이 늦게 뜨는 것을 막는다).
 */
type ModalModule = typeof import('@/features/task-detail/TaskDetailModal');

let pending: Promise<ModalModule> | null = null;
let loadedModal: ComponentType<TaskDetailModalProps> | null = null;

function loadTaskDetailModal(): Promise<ModalModule> {
  pending ??= import('@/features/task-detail/TaskDetailModal').then(
    (mod) => {
      loadedModal = mod.default;
      return mod;
    },
    (error: unknown) => {
      pending = null; // 다음 시도에서 다시 불러온다
      throw error;
    },
  );
  return pending;
}

/** 아직 불러오지 않았을 때 쓰는 lazy 컴포넌트(Suspense 안에서 그린다) */
export const LazyTaskDetailModal = lazy(loadTaskDetailModal);

/** 이미 불러온 모달 컴포넌트. 없으면 null */
export function getLoadedTaskDetailModal(): ComponentType<TaskDetailModalProps> | null {
  return loadedModal;
}

/** 미리 불러오기. 실패는 여기서 삼키고 상세 라우트를 열 때 드러난다. */
export function preloadTaskDetailModal(): void {
  loadTaskDetailModal().catch(() => undefined);
}
