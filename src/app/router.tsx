import { type ComponentType, lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AppLayout from '@/app/layouts/AppLayout';
import PublicLayout from '@/app/layouts/PublicLayout';
import RequireAuth from '@/app/RequireAuth';

/** 섹션별 코드 분할. 한 섹션의 오류가 다른 섹션 화면을 깨뜨리지 않도록 lazy로 불러온다. */
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(load);
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: lazyPage(() => import('@/pages/onboarding/LandingPage')) },
      { path: '/login', element: lazyPage(() => import('@/pages/onboarding/LoginPage')) },
      { path: '/onboarding/*', element: lazyPage(() => import('@/pages/onboarding/OnboardingRoutes')) },
    ],
  },
  {
    // 앱 화면은 로그인 상태에서만 연다. 로그아웃 상태면 RequireAuth가 /login으로 보낸다.
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/timetable/*', element: lazyPage(() => import('@/pages/timetable')) },
      { path: '/tasks/*', element: lazyPage(() => import('@/pages/tasks')) },
      { path: '/board/*', element: lazyPage(() => import('@/pages/board')) },
      { path: '/org/*', element: lazyPage(() => import('@/pages/org')) },
      { path: '/notifications/*', element: lazyPage(() => import('@/pages/notifications')) },
      { path: '/mypage/*', element: lazyPage(() => import('@/pages/mypage')) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
