import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Sidebar, type SidebarCompanyItem, type SidebarMenuKey } from '@/design-system';
import { selectCurrentCompany, selectCurrentMembership, selectCurrentUser } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import { COMPANY_ROLE_LABEL } from '@/data/types';

const MENU_HREF: Record<SidebarMenuKey, string> = {
  timetable: '/timetable',
  tasks: '/tasks',
  board: '/board',
  org: '/org/company',
  notifications: '/notifications',
  mypage: '/mypage',
};

/** 현재 경로의 섹션 → 선택 메뉴. /org/* 는 조직 설정. */
function activeMenu(pathname: string): SidebarMenuKey | null {
  const section = pathname.split('/')[1];
  switch (section) {
    case 'timetable':
      return 'timetable';
    case 'tasks':
      return 'tasks';
    case 'board':
      return 'board';
    case 'org':
      return 'org';
    case 'notifications':
      return 'notifications';
    case 'mypage':
      return 'mypage';
    default:
      return null;
  }
}

/**
 * 사이드바(319px 고정) + 본문 레이아웃. 본문은 --app-height 높이의 내부 스크롤 영역이다.
 * 사이드바는 스토어 계약(selectCurrentUser·selectCurrentCompany·selectCurrentMembership, memberships, logout, switchCompany)으로 연결한다.
 */
export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore(selectCurrentUser);
  const company = useAppStore(selectCurrentCompany);
  const membership = useAppStore(selectCurrentMembership);
  const memberships = useAppStore((s) => s.memberships);
  const currentCompanyId = useAppStore((s) => s.session.currentCompanyId);
  const logout = useAppStore((s) => s.logout);
  const switchCompany = useAppStore((s) => s.switchCompany);
  const [search, setSearch] = useState('');

  const companies = useMemo<SidebarCompanyItem[]>(
    () => memberships.map((m) => ({ id: m.companyId, name: m.companyName, roleLabel: COMPANY_ROLE_LABEL[m.role] })),
    [memberships],
  );

  const handleNavigate = useCallback((href: string) => navigate(href), [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div style={{ display: 'flex', height: 'var(--app-height)' }}>
      <Sidebar
        active={activeMenu(location.pathname)}
        hrefs={MENU_HREF}
        onNavigate={handleNavigate}
        userName={user?.name ?? ''}
        roleLabel={membership ? COMPANY_ROLE_LABEL[membership.role] : ''}
        companyName={company?.name ?? membership?.companyName ?? ''}
        companies={companies}
        currentCompanyId={currentCompanyId}
        onSwitchCompany={switchCompany}
        onLogout={handleLogout}
        searchValue={search}
        onSearchChange={setSearch}
      />
      <main style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
