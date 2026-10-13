import clsx from 'clsx';
import { useMemo } from 'react';

import { Button, Dialog, Field } from '@/design-system';
import { OptionSelect } from '@/features/task-register/OptionSelect';
import {
  DURATION_OPTIONS,
  START_TIME_OPTIONS,
  withCurrentOption,
} from '@/features/task-register/scheduleOptions';
import { formatDuration, formatTimeRange } from '@/lib/format';
import { useActiveTechnicians } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import type { HourMinute, ID, Task } from '@/mocks/types';

import styles from './AssignDialogs.module.css';

/** 격자에 놓은 칸에서 계산한 배정 값(배정 확인 모달에서 고칠 수 있다) */
export interface AssignDraft {
  taskId: ID;
  technicianId: ID;
  startTime: HourMinute;
  durationMinutes: number;
}

interface AssignConfirmDialogProps {
  draft: AssignDraft | null;
  onChange: (draft: AssignDraft) => void;
  onCancel: () => void;
  onConfirm: (draft: AssignDraft) => void;
}

/** 배정 확인 1325:8954 — 담당기사·시작 시간·예상 소요시간 확인·수정 후 '배정 확정' */
export function AssignConfirmDialog({ draft, onChange, onCancel, onConfirm }: AssignConfirmDialogProps) {
  const technicians = useActiveTechnicians();
  const technicianOptions = useMemo(() => technicians.map((m) => ({ value: m.id, label: m.name })), [technicians]);
  const duration = draft ? String(draft.durationMinutes) : null;
  const durationOptions = useMemo(
    () => withCurrentOption(DURATION_OPTIONS, duration, duration ? formatDuration(Number(duration)) : ''),
    [duration],
  );

  return (
    <Dialog
      open={draft !== null}
      onClose={onCancel}
      className={styles.dialog}
      tone="success"
      title="배정 확인"
      description={'대기함 작업을 놓은 칸의 기사 · 시간으로 배정합니다.\n값을 확인 · 수정한 뒤 확정하세요.'}
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onCancel}>
            취소
          </Button>
          <Button style={{ width: 130 }} onClick={() => draft && onConfirm(draft)}>
            배정 확정
          </Button>
        </>
      }
    >
      {draft && (
        <div className={styles.fields}>
          <Field label="담당기사" labelStyle="modal">
            <OptionSelect
              appearance="dialog"
              aria-label="담당기사"
              value={draft.technicianId}
              options={technicianOptions}
              onChange={(technicianId) => onChange({ ...draft, technicianId })}
            />
          </Field>
          <Field label="시작 시간" labelStyle="modal">
            <OptionSelect
              appearance="dialog"
              aria-label="시작 시간"
              value={draft.startTime}
              options={START_TIME_OPTIONS}
              onChange={(startTime) => onChange({ ...draft, startTime })}
            />
          </Field>
          <Field label="예상 소요시간" labelStyle="modal">
            <OptionSelect
              appearance="dialog"
              aria-label="예상 소요시간"
              value={duration}
              options={durationOptions}
              onChange={(value) => onChange({ ...draft, durationMinutes: Number(value) })}
            />
          </Field>
        </div>
      )}
    </Dialog>
  );
}

interface ConflictDialogProps {
  open: boolean;
  conflicts: Task[];
  onCancel: () => void;
  onConfirm: () => void;
}

/** 일정 충돌 경고 1325:10373 — 같은 기사·시간대의 기존 작업을 보여 주고 '충돌 확인 후 배치' */
export function ConflictDialog({ open, conflicts, onCancel, onConfirm }: ConflictDialogProps) {
  const members = useAppStore((s) => s.members);
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      className={clsx(styles.dialog, styles.oddHeight)}
      tone="danger"
      title="일정 충돌 경고"
      description="동일 기사 · 시간대에 이미 다른 작업이 배치되어 있습니다."
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onCancel}>
            취소
          </Button>
          <Button style={{ width: 151 }} onClick={onConfirm}>
            충돌 확인 후 배치
          </Button>
        </>
      }
    >
      <div className={styles.conflicts}>
        {conflicts.map((task) => (
          <div key={task.id} className={styles.conflict}>
            <span className={clsx('t-caption-s-medium', styles.existingChip)}>기존</span>
            <div className={styles.conflictTexts}>
              <p className={clsx('t-body-m-medium', styles.conflictTitle)}>{task.title}</p>
              <p className={clsx('t-body-s-medium', styles.conflictTechnician)}>
                {members.find((m) => m.id === task.technicianId)?.name ?? ''}
              </p>
            </div>
            <span className={clsx('t-body-m-medium', styles.conflictTime)}>
              {task.startTime && task.durationMinutes != null ? formatTimeRange(task.startTime, task.durationMinutes, '-') : ''}
            </span>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

/** 변경된 정보입니다 1325:11695 — 확인을 누르면 최신 정보로 격자를 다시 그린다 */
export function StaleDialog({ open, onConfirm }: { open: boolean; onConfirm: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onConfirm}
      className={clsx(styles.dialog, styles.oddHeight)}
      tone="notice"
      title="변경된 정보입니다"
      descriptionTone="regular"
      // 시안 문구(1325:12205)의 줄바꿈 두 곳(U+2028)을 그대로 옮긴다.
      description={
        '다른 사용자가 이 작업을 먼저 변경했습니다.\n확인을 누르면 최신 정보로 격자를 다시 불러옵니다. 입력하던 값은\n유지되지 않습니다.'
      }
      actions={
        <Button style={{ width: 97 }} onClick={onConfirm}>
          확인
        </Button>
      }
    />
  );
}
