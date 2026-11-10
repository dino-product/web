import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';

import { profileApi } from '@/api/endpoints';
import type { TermsDocumentDto } from '@/api/types';
import { Button, Dialog, Icon, StateMessage } from '@/design-system';

import styles from './TermsViewerDialog.module.css';

type TermsType = TermsDocumentDto['type'];

const TERMS_TITLE: Record<TermsType, string> = {
  SERVICE: '서비스 이용약관',
  PRIVACY: '개인정보 수집·이용 동의서',
  MARKETING: '마케팅 정보 수신 동의서',
  PRIVACY_POLICY: '개인정보처리방침',
};

/** 시행 중인 약관 본문 주소(GET /terms). 한 번 읽어 두고, 실패하면 다음에 다시 읽는다 */
let termsUrls: Promise<Partial<Record<TermsType, string>>> | null = null;
/** 읽어 온 약관 본문(주소별). 실패하면 지워서 다음에 다시 읽는다 */
const termsTexts = new Map<string, Promise<string>>();

function loadTermsUrls() {
  termsUrls ??= profileApi
    .terms()
    .then(({ terms }) => Object.fromEntries(terms.map((t) => [t.type, t.url])))
    .catch((error: unknown) => {
      termsUrls = null;
      throw error;
    });
  return termsUrls;
}

/**
 * 약관 본문은 웹과 같은 출처(배포 CloudFront의 /terms/)의 UTF-8 텍스트다. 로컬 개발 서버는 출처가 달라 CORS에 막히므로
 * 경로만 남겨 vite 프록시(/terms → dev 웹)로 읽는다.
 */
function fetchableUrl(url: string): string {
  const parsed = new URL(url, window.location.origin);
  return import.meta.env.DEV && parsed.origin !== window.location.origin ? parsed.pathname : parsed.href;
}

function loadTermsText(type: TermsType): Promise<string> {
  return loadTermsUrls().then((urls) => {
    const url = urls[type];
    if (!url) throw new Error(`약관 주소 없음: ${type}`);
    let text = termsTexts.get(url);
    if (!text) {
      text = fetch(fetchableUrl(url)).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      });
      termsTexts.set(url, text);
      text.catch(() => termsTexts.delete(url));
    }
    return text;
  });
}

type ViewState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; text: string };

export interface TermsViewerDialogProps {
  type: TermsType;
  open: boolean;
  onClose: () => void;
}

/**
 * 약관 본문 모달(DS Dialog). 시안이 없어 약관 동의 모달(1453:7505)처럼 제목 + 닫기(X)를 두고,
 * 본문은 서버 GET /terms가 알려 준 텍스트를 줄바꿈 그대로 스크롤 상자에 보여 준다.
 * 약관 동의 모달 위에 겹쳐 뜨므로 Esc는 이 모달만 닫는다.
 */
export default function TermsViewerDialog({ type, open, onClose }: TermsViewerDialogProps) {
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState({ status: 'loading' });
    loadTermsText(type).then(
      (text) => alive && setState({ status: 'ready', text }),
      (error: unknown) => {
        console.warn(`[terms] 약관 본문 실패(${type}): ${error instanceof Error ? error.message : String(error)}`);
        if (alive) setState({ status: 'error' });
      },
    );
    return () => {
      alive = false;
    };
  }, [open, type, attempt]);

  // 아래 모달(약관 동의)의 Esc 처리보다 먼저 잡아 이 모달만 닫는다(Modal은 defaultPrevented면 무시한다).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={TERMS_TITLE[type]}
      showClose
      width={720}
      actions={
        <Button variant="accent" onClick={onClose}>
          확인
        </Button>
      }
    >
      <div className={styles.body}>
        {state.status === 'ready' ? (
          <p className={styles.text}>{state.text}</p>
        ) : state.status === 'error' ? (
          <StateMessage
            variant="list"
            className={styles.centered}
            icon={<Icon name="alert-circle-fill" size={46} color="var(--color-gray-400)" />}
            title="약관을 불러오지 못했습니다"
            actions={
              <Button variant="outline" onClick={retry}>
                다시 시도
              </Button>
            }
          />
        ) : (
          <p className={clsx(styles.loading, styles.centered)} role="status">
            약관을 불러오는 중입니다
          </p>
        )}
      </div>
    </Dialog>
  );
}
