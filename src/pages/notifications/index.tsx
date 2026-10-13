import { Navigate, Route, Routes } from 'react-router-dom';

import NotificationDetailPage from './NotificationDetailPage';
import NotificationsPage from './NotificationsPage';

/** 알림창 섹션 진입점(/notifications/*). */
export default function NotificationsSection() {
  return (
    <Routes>
      <Route index element={<NotificationsPage />} />
      <Route path=":notificationId" element={<NotificationDetailPage />} />
      <Route path="*" element={<Navigate to="/notifications" replace />} />
    </Routes>
  );
}
