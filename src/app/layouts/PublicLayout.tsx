import { Outlet } from 'react-router-dom';

/** 사이드바 없는 화면(랜딩·로그인·온보딩). 내부 스크롤 영역을 가진다. */
export default function PublicLayout() {
  return (
    <div style={{ height: 'var(--app-height)', overflowY: 'auto', overflowX: 'hidden' }}>
      <Outlet />
    </div>
  );
}
