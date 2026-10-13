/**
 * '변경된 정보입니다'(1325:11695) 재현용 결정적 트리거.
 *
 * 시드 작업 t-demo-stale(대기함 '인덕션 교체')을 처음 배정 확정(일정 충돌을 거치면 '충돌 확인 후 배치')할 때,
 * 저장 직전에 다른 사용자(등록자 김운영)가 먼저 담당기사를 김민수로 지정한 것으로 처리한다(버전 충돌).
 * 사용자가 놓은 배정은 반영하지 않고 모달을 띄우며, 확인을 누르면 그때 다른 사용자의 변경을 반영해(applyConcurrentEdit)
 * 최신 상태(대기함 카드 '김민수')로 다시 그린다. 모달이 떠 있는 동안 격자·대기함은 이전 상태 그대로다.
 * 같은 페이지 로드에서 두 번째부터는 정상 배정된다. 새로고침하면 시드와 함께 처음 상태로 돌아간다.
 *
 * 스토어에 '다른 사용자' 처리자로 이력을 남기는 액션이 없어 useAppStore.setState로 이 작업 하나만 바꾼다.
 */
import { nowIso } from '@/lib/date';
import { DEMO_TASK_IDS, HISTORY_LABEL } from '@/mocks/constants';
import { SEED_MEMBER_IDS } from '@/mocks/seed';
import { useAppStore } from '@/mocks/store';

let triggered = false;

/** 이 배정에서 '변경된 정보입니다'를 띄워야 하는지 */
export function isStaleAssignment(taskId: string): boolean {
  if (triggered || taskId !== DEMO_TASK_IDS.stale) return false;
  return useAppStore.getState().tasks.some((t) => t.id === taskId && t.status === 'REGISTERED');
}

/** 다른 사용자의 먼저 들어온 변경을 반영한다(담당기사 김민수 지정, 이력 '작업 정보 수정' · 김운영). */
export function applyConcurrentEdit(taskId: string): void {
  triggered = true;
  const at = nowIso();
  useAppStore.setState((s) => {
    const editor = s.members.find((m) => m.id === SEED_MEMBER_IDS.kimUnyeong)?.name ?? null;
    return {
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              technicianId: SEED_MEMBER_IDS.kimMinsu,
              updatedAt: at,
              history: [...t.history, { at, label: HISTORY_LABEL.edited, actor: editor }],
            }
          : t,
      ),
    };
  });
}
