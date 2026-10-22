import { type ReactNode, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAppStore } from '@/data/store';

/**
 * 로그인한 사용자만 앱 화면(사이드바 레이아웃)을 보게 한다. 로그아웃 상태면 /login으로 바꿔 보낸다.
 * 공개 경로('/', '/login', '/onboarding/*')는 이 가드 밖에 있다.
 * - 로그아웃 상태로 앱 경로에 들어오면 돌아올 경로를 location.state.from에 담는다(로그인 후 그 경로로 간다).
 * - 앱 화면을 보던 중 로그아웃·탈퇴하면 돌아올 경로를 담지 않는다(다시 로그인하면 기본 화면 /timetable).
 *   로그아웃 버튼의 이동과 이 가드의 이동이 겹쳐도 같은 결과가 되게 한다.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const loggedIn = useAppStore((s) => s.session.loggedIn);
  const location = useLocation();
  // 이 가드가 처음 그려질 때의 로그인 여부. 로그인 상태로 시작했다가 false가 되면 사용자가 로그아웃한 것이다.
  const [enteredLoggedIn] = useState(loggedIn);
  if (!loggedIn) {
    const state = enteredLoggedIn ? undefined : { from: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={state} />;
  }
  return children;
}
