import { useMemo } from 'react';

import { Button, Dialog, Field } from '@/design-system';
import type { ID, Member } from '@/data/types';

import { ListSelect } from '../components/ListSelect';
import dialogStyles from '../dialog.module.css';
import styles from './OwnerDialogs.module.css';

export interface OwnerAssignDialogProps {
  open: boolean;
  /** 지정할 수 있는 직원(현재 총관리자 제외) */
  candidates: Member[];
  value: ID | null;
  onChange: (memberId: ID) => void;
  onClose: () => void;
  onConfirm: () => void;
}

/** 총관리자 지정 — 직원 선택 열림 2232:9741 · 선택 완료 2232:10017 */
export function OwnerAssignDialog({ open, candidates, value, onChange, onClose, onConfirm }: OwnerAssignDialogProps) {
  const options = useMemo(() => candidates.map((m) => ({ value: m.id, label: m.name })), [candidates]);
  return (
    <Dialog
      className={dialogStyles.dialog}
      open={open}
      onClose={onClose}
      title="총관리자 지정"
      description={
        // 첫 줄이 515px에 거의 꽉 차(시안 511px) Chrome에서 줄바꿈되지 않도록 시안 줄바꿈만 쓴다.
        <span className={styles.lines}>
          {'지정된 직원은 모든 조직 설정, 인력 관리, 작업 삭제 권한을 갖습니다.\n지정 전 책임 범위를 반드시 확인하십시오.'}
        </span>
      }
      descriptionTone="muted"
      headerGap={16}
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
            취소
          </Button>
          <Button style={{ width: 129 }} disabled={!value} onClick={onConfirm}>
            지정 확정
          </Button>
        </>
      }
    >
      <Field label="직원 선택" labelStyle="modal" htmlFor="owner-candidate">
        <ListSelect id="owner-candidate" variant="owner" value={value} options={options} onChange={onChange} />
      </Field>
    </Dialog>
  );
}

export interface OwnerReleaseDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** 총관리자 지정 해제 확인 2232:10293 */
export function OwnerReleaseDialog({ open, onClose, onConfirm }: OwnerReleaseDialogProps) {
  return (
    <Dialog
      className={dialogStyles.dialog}
      open={open}
      onClose={onClose}
      title="총관리자 지정 해제 확인"
      description={'해당 직원의 총관리자 권한이 즉시 해제됩니다.\n해제 후에는 조직 설정 및 인력 관리에 접근할 수 없습니다.'}
      descriptionTone="muted"
      headerGap={16}
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
            취소
          </Button>
          <Button variant="danger-soft" style={{ width: 129 }} onClick={onConfirm}>
            해제 확정
          </Button>
        </>
      }
    >
      <p className={styles.notice}>발주사에 총관리자가 최소 1명 이상 유지되어야 합니다.</p>
    </Dialog>
  );
}
