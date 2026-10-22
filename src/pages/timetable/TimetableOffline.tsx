import { Button, Icon, StateMessage } from '@/design-system';
import { useAppStore } from '@/data/store';

import styles from './TimetableOffline.module.css';

/**
 * 타임테이블 네트워크 연결 실패(1338:6564, 서버에 닿지 못함). 제목 아래 오류 카드(1338:6566)만 그린다.
 * '작업 등록으로' → 새 작업 등록 모달(시안 프레임 이름 '작업 등록'), '다시 시도' → 온라인으로 바꿔 격자를 다시 그린다.
 */
export default function TimetableOffline({ onRegister }: { onRegister: () => void }) {
  const setNetwork = useAppStore((s) => s.setNetwork);
  return (
    <div className={styles.card}>
      <StateMessage
        icon={<Icon name="wifi-off-circle" />}
        title="네트워크 연결 실패"
        description={'요청을 처리하는 중 네트워크 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.'}
        actions={
          <>
            <Button variant="outline" style={{ width: 130 }} onClick={onRegister}>
              작업 등록으로
            </Button>
            <Button icon="refresh" style={{ width: 133 }} onClick={() => setNetwork('online')}>
              다시 시도
            </Button>
          </>
        }
      />
    </div>
  );
}
