import { useCallback } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Button, type UnderlineTab, UnderlineTabs } from '@/design-system';
import { useJoinRequestCount } from '@/data/selectors';
import { useOrganizationSync } from '@/data/sync';

import { ApprovalModal } from './modals/ApprovalModal';
import { JoinCodeModal } from './modals/JoinCodeModal';
import styles from './OrgLayout.module.css';

type OrgTab = 'company' | 'members' | 'types' | 'admin';

const TABS: UnderlineTab<OrgTab>[] = [
  { key: 'company', label: '발주사 정보' },
  { key: 'members', label: '인력관리' },
  // Figma Component 11·12는 47px 탭(y=0)이라 라벨이 1px 위, 막대가 1px 아래에 있다.
  { key: 'types', label: '유형 설정', tall: true },
  { key: 'admin', label: '관리자 설정', tall: true },
];

/** 우측 상단 버튼으로 여는 모달. URL 쿼리 ?modal= 로 열림 상태를 둔다(직접 진입·검증용). */
export type OrgModal = 'code' | 'approvals';

function currentTab(pathname: string): OrgTab {
  if (pathname.endsWith('/members')) return 'members';
  if (pathname.endsWith('/types')) return 'types';
  return 'company';
}

/**
 * 조직 설정 레이아웃(Figma 570:2409·1951:19161 공통): 제목 '조직 설정'(349,32), 밑줄 탭(349,107),
 * 인력관리·유형 설정 탭에서만 우측 상단 '회사 코드 관리'·'승인대기 N'(1576,104). 탭 본문은 탭 막대 아래(y=154)부터 그린다.
 * '관리자 설정' 탭은 대응 프레임이 없어 표시만 한다(눌러도 이동 없음).
 */
export default function OrgLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  useOrganizationSync();
  const pendingCount = useJoinRequestCount();
  const tab = currentTab(pathname);
  const modalParam = searchParams.get('modal');
  const modal: OrgModal | null = modalParam === 'code' || modalParam === 'approvals' ? modalParam : null;
  const showActions = tab === 'members' || tab === 'types';

  const setModal = useCallback(
    (next: OrgModal | null) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next) params.set('modal', next);
          else params.delete('modal');
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const closeModal = useCallback(() => setModal(null), [setModal]);

  const changeTab = (key: OrgTab) => {
    if (key === 'admin' || key === tab) return;
    navigate(`/org/${key}`);
  };

  /** 회사 코드 관리 '인력관리로 돌아가기' */
  const backToMembers = useCallback(() => {
    if (tab === 'members') closeModal();
    else navigate('/org/members', { replace: true });
  }, [tab, closeModal, navigate]);

  return (
    <div className={styles.page}>
      <h1 className={`t-title-s ${styles.title}`}>조직 설정</h1>
      <div className={styles.header}>
        <UnderlineTabs tabs={TABS} value={tab} onChange={changeTab} aria-label="조직 설정" />
        {showActions && (
          <div className={styles.actions}>
            <Button variant="outline" icon="qr-code" iconSize={24} onClick={() => setModal('code')}>
              회사 코드 관리
            </Button>
            <Button icon="mail" iconSize={24} dot={pendingCount > 0} onClick={() => setModal('approvals')}>
              승인대기 {pendingCount}
            </Button>
          </div>
        )}
      </div>
      <Outlet />
      {showActions && (
        <>
          <JoinCodeModal open={modal === 'code'} onClose={closeModal} onBackToMembers={backToMembers} />
          <ApprovalModal open={modal === 'approvals'} onClose={closeModal} />
        </>
      )}
    </div>
  );
}
