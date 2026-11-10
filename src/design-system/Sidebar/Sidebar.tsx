import clsx from 'clsx';
import { type MouseEvent, useRef, useState } from 'react';

import { Avatar } from '../Avatar/Avatar';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { Logo } from '../Logo/Logo';
import { Popover } from '../Popover/Popover';
import styles from './Sidebar.module.css';

export type SidebarMenuKey = 'timetable' | 'tasks' | 'board' | 'org' | 'notifications' | 'mypage';

interface MenuItemDef {
  key: SidebarMenuKey;
  label: string;
  icon: IconName;
}

const TOP_MENU: MenuItemDef[] = [
  { key: 'timetable', label: '타임테이블', icon: 'calendar' },
  { key: 'tasks', label: '작업 목록', icon: 'list' },
  { key: 'board', label: '진행 보드', icon: 'board' },
  { key: 'org', label: '조직 설정', icon: 'users' },
];

const BOTTOM_MENU: MenuItemDef[] = [
  { key: 'notifications', label: '알림함', icon: 'bell' },
  { key: 'mypage', label: '마이페이지', icon: 'user' },
];

export interface SidebarCompanyItem {
  id: string;
  name: string;
  /** 역할 표기. 예: '총 관리자', '직원' */
  roleLabel: string;
}

export interface SidebarProps {
  /** 선택된 메뉴(현재 경로의 섹션). 없으면 null */
  active: SidebarMenuKey | null;
  /** 메뉴별 이동 경로 */
  hrefs: Record<SidebarMenuKey, string>;
  /** 메뉴 클릭 시 호출(새 탭 열기 등 수정 키를 누른 클릭은 브라우저 기본 동작) */
  onNavigate: (href: string) => void;
  /** 사용자 카드 이름(18/700 흰색) */
  userName: string;
  /** 현재 발주사에서의 역할 표기(16/500 Primary100). 예: '총 관리자' */
  roleLabel: string;
  /** 현재 발주사 이름(16/500 흰색 60%) */
  companyName: string;
  /** 소속 발주사 목록. 2곳 이상이면 사용자 카드가 발주사 전환 팝오버를 연다 */
  companies: SidebarCompanyItem[];
  currentCompanyId: string | null;
  onSwitchCompany: (companyId: string) => void;
  onLogout: () => void;
  /** 검색 입력값(입력만 가능, 검색 결과 시안 없음) */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  className?: string;
}

/**
 * Figma `SIde bar` 536:2553(활성 메뉴별 6변형) · 소속 발주사 2곳 이상 1921:10813/1921:11040.
 * 319px, Primary 배경. 로고(24,34) · 검색(23,110 274x54) · 메뉴(23,188, 68px 간격 8) ·
 * 아래쪽: 구분선 2px(흰색 12%) → 10 → 알림함·마이페이지 → 8 → 사용자 카드 68px → 아래 여백 62.
 */
export function Sidebar({
  active,
  hrefs,
  onNavigate,
  userName,
  roleLabel,
  companyName,
  companies,
  currentCompanyId,
  onSwitchCompany,
  onLogout,
  searchValue,
  onSearchChange,
  className,
}: SidebarProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const multiCompany = companies.length > 1;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    onNavigate(href);
  };

  const renderItem = (item: MenuItemDef, bottom: boolean) => {
    const isActive = item.key === active;
    return (
      <a
        key={item.key}
        href={hrefs[item.key]}
        aria-current={isActive ? 'page' : undefined}
        className={clsx(styles.item, bottom && styles.itemBottom, isActive && styles.active)}
        onClick={(event) => handleClick(event, hrefs[item.key])}
      >
        <Icon name={item.icon} size={28} color={bottom ? 'var(--color-gray-0)' : 'var(--color-gray-50)'} />
        <span>{item.label}</span>
      </a>
    );
  };

  const userTexts = (
    <span className={styles.userTexts}>
      <span className={styles.userName}>{userName}</span>
      <span className={styles.userMeta}>
        <span className={styles.userRole}>{`${roleLabel}  · `}</span>
        <span className={styles.userCompany}>{companyName}</span>
      </span>
    </span>
  );

  return (
    <aside className={clsx(styles.sidebar, className)}>
      <div className={styles.logoRow}>
        <Logo variant="lockup" color="var(--color-gray-0)" />
      </div>

      <label className={styles.search}>
        <Icon name="search" size={28} color="var(--color-gray-600)" />
        <input
          className={styles.searchInput}
          type="search"
          placeholder="검색"
          aria-label="검색"
          value={searchValue}
          onChange={onSearchChange ? (event) => onSearchChange(event.target.value) : undefined}
        />
      </label>

      <nav className={styles.menu} aria-label="주 메뉴">
        {TOP_MENU.map((item) => renderItem(item, false))}
      </nav>

      <div className={styles.bottom}>
        <hr className={styles.divider} />
        <nav className={styles.menu} aria-label="계정 메뉴">
          {BOTTOM_MENU.map((item) => renderItem(item, true))}
        </nav>

        <div ref={cardRef} className={styles.userCard}>
          {multiCompany ? (
            <button
              type="button"
              className={styles.userCardButton}
              aria-haspopup="menu"
              aria-expanded={switcherOpen}
              onClick={() => setSwitcherOpen((v) => !v)}
            >
              <span className={styles.userInfo}>
                <Avatar variant="user" size={50} />
                {userTexts}
              </span>
              <Icon name="selector" size={30} color="var(--color-support-sidebar-icon)" />
            </button>
          ) : (
            <>
              <span className={styles.userInfo}>
                <Avatar variant="user" size={50} />
                {userTexts}
              </span>
              <button
                type="button"
                className={styles.logoutButton}
                aria-label="로그아웃"
                onClick={onLogout}
              >
                <Icon name="logout" size={32.1} color="var(--color-support-sidebar-icon)" />
              </button>
            </>
          )}
        </div>
      </div>

      {multiCompany && (
        <Popover
          open={switcherOpen}
          anchorRef={cardRef}
          onClose={() => setSwitcherOpen(false)}
          placement="top-start"
          offset={12}
          matchWidth
        >
          <div className={styles.switcher} role="menu" aria-label="발주사 전환">
            <div className={styles.switcherHeader}>발주사 전환</div>
            {companies.map((company) => {
              const current = company.id === currentCompanyId;
              return (
                <button
                  key={company.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  className={clsx(styles.company, current && styles.companyCurrent)}
                  onClick={() => {
                    setSwitcherOpen(false);
                    if (!current) onSwitchCompany(company.id);
                  }}
                >
                  <span className={styles.companyInfo}>
                    <Avatar variant="initial" size={36} text={company.name} />
                    <span className={styles.companyTexts}>
                      <span className={styles.companyName}>{company.name}</span>
                      <span className={styles.companyRole}>{company.roleLabel}</span>
                    </span>
                  </span>
                  {current && <Icon name="check" size={24} color="var(--color-primary)" />}
                </button>
              );
            })}
            <button
              type="button"
              role="menuitem"
              className={styles.switcherLogout}
              onClick={() => {
                setSwitcherOpen(false);
                onLogout();
              }}
            >
              <Icon name="logout" size={24} color="var(--color-gray-400)" />
              로그아웃
            </button>
          </div>
        </Popover>
      )}
    </aside>
  );
}
