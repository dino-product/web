import { useEffect, useState } from 'react';

import { Button, Dialog, Field, TextArea } from '@/design-system';
import { type JoinRequest, MEMBER_KIND_LABEL } from '@/mocks/types';

import dialogStyles from '../dialog.module.css';
import styles from './RejectDialog.module.css';

export interface RejectDialogProps {
  open: boolean;
  /** 거절할 참여 요청(행 거절 1건 또는 선택 일괄 거절) */
  targets: JoinRequest[];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * 승인 거절 모달(Figma 사유 미입력 2008:25656 · 입력 중 2008:26090). 사유를 입력해야 '거절'이 활성화된다(시안 미입력 상태 50%).
 * 시안 문구는 1명 기준이라 여러 명이면 '○○ 님 외 N명의 참여 요청'으로 바꿔 쓴다.
 */
export function RejectDialog({ open, targets, onClose, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const first = targets[0];
  const subject = !first
    ? ''
    : targets.length === 1
      ? `${first.name} 님의 ${MEMBER_KIND_LABEL[first.desiredKind]} 참여 요청을`
      : `${first.name} 님 외 ${targets.length - 1}명의 참여 요청을`;

  return (
    <Dialog
      className={dialogStyles.dialog}
      open={open}
      onClose={onClose}
      title="참여 요청을 거절할까요?"
      description={`${subject} 거절합니다.\n신청자는 현재 회사 코드로 다시 요청할 수 있어요.`}
      descriptionTone="muted"
      headerGap={12}
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
            닫기
          </Button>
          <Button style={{ width: 95 }} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            거절
          </Button>
        </>
      }
    >
      <Field label="거절 사유" labelSuffix="(선택)" labelStyle="title" htmlFor="reject-reason">
        <TextArea
          id="reject-reason"
          className={styles.reason}
          placeholder="신청자에게 전달할 사유를 입력하세요."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
    </Dialog>
  );
}
