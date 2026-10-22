/**
 * 작업 취소 확인 모달(Figma 785:7691, 1282:2614, 1282:3338, 1282:4048, 1282:4401). 담당: tasks 섹션.
 * 사용처: 작업 상세 모달의 '작업 취소'(작업 목록·진행 보드).
 *
 * 취소 사유(필수)를 고르면 '작업 취소'가 활성화된다. '기타'는 상세 사유를 입력해야 활성화된다(1282:4048 비활성, 1282:4401 활성).
 * 확정하면 cancelTask(사유, 상세 사유) 후 onCanceled(없으면 onClose)를 부른다.
 */
import { useId, useState } from 'react';

import { Button, Dialog, Field, TextArea } from '@/design-system';
import { useAppStore } from '@/data/store';

import { type CancelReason, CancelReasonSelect } from './CancelReasonSelect';
import styles from './TaskCancelModal.module.css';

export interface TaskCancelModalProps {
  taskId: string;
  open: boolean;
  onClose: () => void;
  onCanceled?: () => void;
}

export default function TaskCancelModal(props: TaskCancelModalProps) {
  // 열 때마다 입력을 비우도록 닫히면 내용을 언마운트한다.
  if (!props.open) return null;
  return <CancelDialog {...props} />;
}

function CancelDialog({ taskId, onClose, onCanceled }: TaskCancelModalProps) {
  const cancelTask = useAppStore((s) => s.cancelTask);
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [detail, setDetail] = useState('');
  const selectId = useId();

  const isOther = reason === '기타';
  const canSubmit = reason !== null && (!isOther || detail.trim().length > 0);

  const submit = () => {
    if (!reason || !canSubmit) return;
    cancelTask(taskId, reason, isOther ? detail.trim() : '');
    (onCanceled ?? onClose)();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      className={styles.dialog}
      tone="cancel"
      title="작업 취소 확인"
      // 옛 상태 표기 '취소됨'은 새 표기 '취소'로(디자이너 전달사항 2026.10.08). 따옴표 모양은 시안 그대로.
      description={'이 작업을 취소하면 담당 기사 앱에 ‘취소\'로 표시됩니다.\n이 작업을 취소하시겠습니까?'}
      actions={
        <>
          <Button variant="ghost" style={{ width: 97 }} onClick={onClose}>
            닫기
          </Button>
          <Button variant="danger-soft" style={{ width: 120 }} disabled={!canSubmit} onClick={submit}>
            작업 취소
          </Button>
        </>
      }
    >
      <Field label="취소 사유 (필수)" labelStyle="modal" htmlFor={selectId}>
        <CancelReasonSelect id={selectId} value={reason} onChange={setReason} />
        {isOther && (
          <TextArea
            className={styles.detail}
            height={126}
            placeholder="상세 사유를 입력하세요"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            aria-label="상세 사유"
          />
        )}
      </Field>
    </Dialog>
  );
}
