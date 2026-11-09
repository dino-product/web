import clsx from 'clsx';
import { type ReactNode, useEffect, useState } from 'react';

import { profileApi } from '@/api/endpoints';
import type { TermsDocumentDto } from '@/api/types';

import styles from './TermsLink.module.css';

type TermsType = TermsDocumentDto['type'];
type TermsUrls = Partial<Record<TermsType, string>>;

/** 시행 중인 약관 본문 주소(GET /terms). 한 번 읽어 둔다. 읽지 못하면 다음에 다시 읽는다 */
let termsUrls: Promise<TermsUrls> | null = null;

function loadTermsUrls(): Promise<TermsUrls> {
  termsUrls ??= profileApi
    .terms()
    .then(({ terms }) => Object.fromEntries(terms.map((t) => [t.type, t.url])) as TermsUrls)
    .catch((error: unknown) => {
      termsUrls = null;
      console.warn(`[api] 약관 목록 실패: ${error instanceof Error ? error.message : String(error)}`);
      return {};
    });
  return termsUrls;
}

interface TermsLinkProps {
  type: TermsType;
  /** 링크 이름(스크린리더). 예: '서비스 이용약관 보기' */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * 약관 본문(텍스트)을 새 탭으로 여는 링크. 약관 항목 오른쪽 화살표·로그인 안내 문구의 '이용약관'처럼 시안에 있는 자리에 쓴다.
 * 주소를 읽기 전이거나 읽지 못하면 링크 없이 그대로 그린다.
 */
export default function TermsLink({ type, label, className, children }: TermsLinkProps) {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    let alive = true;
    void loadTermsUrls().then((urls) => {
      if (alive) setUrl(urls[type]);
    });
    return () => {
      alive = false;
    };
  }, [type]);

  if (!url) return <span className={clsx(styles.link, className)}>{children}</span>;
  return (
    <a className={clsx(styles.link, className)} href={url} target="_blank" rel="noreferrer" aria-label={label}>
      {children}
    </a>
  );
}
