import clsx from 'clsx';
import { type ReactNode, useState } from 'react';

import type { TermsDocumentDto } from '@/api/types';

import styles from './TermsLink.module.css';
import TermsViewerDialog from './TermsViewerDialog';

interface TermsLinkProps {
  type: TermsDocumentDto['type'];
  /** 버튼 이름(스크린리더). 예: '서비스 이용약관 보기' */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * 약관 본문 보기 버튼. 약관 항목 오른쪽 화살표·로그인 안내 문구의 '이용약관'처럼 시안에 있는 자리에 쓰고,
 * 누르면 약관 본문 모달(TermsViewerDialog)을 연다.
 */
export default function TermsLink({ type, label, className, children }: TermsLinkProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={clsx(styles.link, className)} aria-label={label} onClick={() => setOpen(true)}>
        {children}
      </button>
      <TermsViewerDialog type={type} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
