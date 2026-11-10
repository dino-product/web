import clsx from 'clsx';
import { useState } from 'react';

import { Button, Checkbox, Dialog, Icon } from '@/design-system';

import styles from './TermsAgreementDialog.module.css';

type TermKey = 'service' | 'privacy' | 'marketing';

const TERMS: { key: TermKey; label: string; required: boolean }[] = [
  { key: 'service', label: '[필수] 서비스 이용약관 동의', required: true },
  { key: 'privacy', label: '[필수] 개인정보 처리방침 동의', required: true },
  { key: 'marketing', label: '[선택] 마케팅 정보 수신 동의', required: false },
];

const NONE_CHECKED: Record<TermKey, boolean> = { service: false, privacy: false, marketing: false };
const ALL_CHECKED: Record<TermKey, boolean> = { service: true, privacy: true, marketing: true };

export interface TermsAgreementDialogProps {
  open: boolean;
  /** X(닫기)·Esc */
  onClose: () => void;
  /** '동의하고 계속하기' — 마케팅 수신 동의 여부를 넘긴다 */
  onAgree: (marketingAgreed: boolean) => void;
}

/**
 * 서비스 이용약관 동의 모달(Figma 1453:7505). 첫 사용자가 카카오 로그인한 직후 로그인 화면 위에 뜬다.
 * - 처음에는 모두 미선택. '전체 동의'가 개별 항목을 함께 켜고 끈다(시안은 모두 선택된 상태).
 * - 필수 항목을 모두 선택해야 '동의하고 계속하기'가 활성화된다(비활성은 DS Button disabled 모양).
 * - 항목 오른쪽 화살표는 약관 본문 시안이 없어 동작하지 않는다.
 */
export default function TermsAgreementDialog({ open, onClose, onAgree }: TermsAgreementDialogProps) {
  const [checked, setChecked] = useState<Record<TermKey, boolean>>(NONE_CHECKED);
  const allChecked = TERMS.every((term) => checked[term.key]);
  const requiredChecked = TERMS.every((term) => !term.required || checked[term.key]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="서비스 이용약관 동의"
      description="계속하려면 아래 약관에 동의해주세요"
      descriptionTone="subtle"
      headerGap={16}
      bodyGap={16}
      showClose
      width={519}
      actions={
        <Button variant="accent" fullWidth disabled={!requiredChecked} onClick={() => onAgree(checked.marketing)}>
          동의하고 계속하기
        </Button>
      }
    >
      <div className={styles.body}>
        <div className={styles.allRow}>
          <Checkbox
            checked={allChecked}
            onChange={(event) => setChecked(event.target.checked ? ALL_CHECKED : NONE_CHECKED)}
            gap={12}
            label="전체 동의"
            labelClassName={clsx('t-body-s-bold', styles.allLabel)}
          />
        </div>
        <ul className={styles.list}>
          {TERMS.map((term) => (
            <li key={term.key} className={styles.item}>
              <Checkbox
                checked={checked[term.key]}
                onChange={(event) => setChecked((prev) => ({ ...prev, [term.key]: event.target.checked }))}
                gap={8}
                label={term.label}
                labelClassName={clsx('t-body-xs-regular', styles.itemLabel)}
              />
              <Icon name="chevron-right" size={26} color="var(--color-gray-400)" />
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
