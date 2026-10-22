import clsx from 'clsx';

import { Button, Icon, StateMessage } from '@/design-system';
import { useAppStore } from '@/data/store';

import styles from './BoardOffline.module.css';

/** 진행 보드 네트워크 연결 실패(1472:7414). '다시 시도' → 온라인으로 바꿔 보드를 다시 그린다. */
export default function BoardOffline() {
  const setNetwork = useAppStore((s) => s.setNetwork);

  return (
    <div className={styles.page}>
      <h1 className={clsx('t-title-s', styles.title)}>진행 보드</h1>
      <div className={styles.card}>
        <StateMessage
          icon={<Icon name="wifi-off-circle" />}
          title="네트워크 연결 실패"
          description={'요청을 처리하는 중 네트워크 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.'}
          actions={
            <Button icon="refresh" onClick={() => setNetwork('online')}>
              다시 시도
            </Button>
          }
        />
      </div>
    </div>
  );
}
