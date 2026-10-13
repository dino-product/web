import { Button, Dialog, Field, InfoBox } from '@/design-system';
import type { ID } from '@/mocks/types';

import { TypeSelect, type TypeSelectOption } from './TypeSelect';

/**
 * 유형 설정 확인 모달 4종. 버튼 너비·간격·문구는 Figma 그대로.
 * - delete: 유형 삭제 확인 2008:27365(카드 1951:24074)
 * - deactivate: 직원 활성화 확인 2008:32360(카드 2008:27931) — 직원유형 '비활성화'
 * - activate: 기사 활성화 확인 2008:32588(카드 2008:32812) — 기사유형 '활성화'
 * - change: 기사유형 변경 2008:33958(카드 2008:34182) — 기사유형 '비활성화'
 */
export type TypeDialogKind = 'delete' | 'deactivate' | 'activate' | 'change';

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTypeDialog({ open, onClose, onConfirm }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="유형 삭제 확인"
      headerGap={12}
      descriptionTone="muted"
      description={"이 유형을 삭제하면 해당 유형으로 지정된 모든 직원·작업이\n'유형 없음'으로 변경됩니다."}
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
            취소
          </Button>
          <Button variant="danger-soft" style={{ width: 95 }} onClick={onConfirm}>
            삭제
          </Button>
        </>
      }
    >
      <InfoBox>삭제된 유형은 복구할 수 없습니다.</InfoBox>
    </Dialog>
  );
}

export function DeactivateTypeDialog({ open, onClose, onConfirm }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="직원 활성화 확인"
      headerGap={16}
      descriptionTone="muted"
      description="비활성화하면 해당 직원은 로그인과 소속이 차단됩니다."
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
            취소
          </Button>
          <Button variant="danger-soft" style={{ width: 125 }} onClick={onConfirm}>
            비활성화
          </Button>
        </>
      }
    />
  );
}

export function ActivateTypeDialog({ open, onClose, onConfirm }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="기사 활성화 확인"
      headerGap={16}
      descriptionTone="muted"
      description="활성화하면 해당 기사가 다시 로그인하고 작업을 배정받을 수 있습니다."
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
            취소
          </Button>
          <Button style={{ width: 110 }} onClick={onConfirm}>
            활성화
          </Button>
        </>
      }
    />
  );
}

interface ChangeTypeDialogProps extends ConfirmProps {
  options: TypeSelectOption<ID>[];
  value: ID | null;
  onChange: (typeId: ID) => void;
}

export function ChangeTechnicianTypeDialog({ open, onClose, onConfirm, options, value, onChange }: ChangeTypeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="기사유형 변경"
      headerGap={16}
      descriptionTone="muted"
      description="변경할 기사유형을 선택하세요."
      actions={
        <>
          <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
            취소
          </Button>
          <Button style={{ width: 125 }} onClick={onConfirm}>
            변경하기
          </Button>
        </>
      }
    >
      <Field label="기사 유형" labelStyle="title">
        <TypeSelect aria-label="기사 유형" value={value} options={options} onChange={onChange} />
      </Field>
    </Dialog>
  );
}
