import { useEffect, useState } from 'react';

import { useApiPending } from '@/api/pending';

import styles from './PendingSpinner.module.css';

/** 짧은 요청에서 스피너가 깜빡이지 않도록 이만큼 기다려도 응답이 없을 때만 보인다. */
const SHOW_DELAY_MS = 300;

/**
 * API 응답을 기다리는 동안 캔버스 가운데에 띄우는 회색 스피너. 화면 조작은 막지 않는다.
 * 대기 수는 src/api/pending.ts가 http 클라이언트에서 센다.
 */
export default function PendingSpinner() {
  const pending = useApiPending();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  if (!visible) return null;
  return (
    <div className={styles.layer}>
      <span className={styles.spinner} role="status" aria-label="불러오는 중" />
    </div>
  );
}
