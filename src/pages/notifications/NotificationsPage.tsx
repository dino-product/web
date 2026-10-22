import clsx from 'clsx';
import { Fragment, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { FilterChips, Icon, StateMessage } from '@/design-system';
import { formatNotificationGroup, formatNotificationTime } from '@/lib/format';
import { useNotifications, useUnreadNotificationCount } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import { useNotificationsSync } from '@/data/sync';
import { type AppNotification, NOTIFICATION_TYPE_LABEL } from '@/data/types';

import styles from './NotificationsPage.module.css';
import { TYPE_LABEL_COLOR } from './notificationView';

type Filter = 'all' | 'unread';

interface NotificationGroup {
  label: string;
  items: AppNotification[];
}

/** 최신순 알림을 '오늘'·'어제'·'YYYY.MM.DD' 묶음으로 나눈다. */
function groupByDay(notifications: AppNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  for (const notification of notifications) {
    const label = formatNotificationGroup(notification.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(notification);
    else groups.push({ label, items: [notification] });
  }
  return groups;
}

/**
 * 알림창(1921:9287, 긴 목록 1921:9425, 알림 없음 2053:9689).
 * - 전체·안 읽음 필터는 URL 쿼리(?filter=unread)로 둔다.
 * - 행을 누르면 읽음 처리 후 알림 상세(/notifications/:id)로 간다. 작업 취소 알림도 상세(1807:6719)로 간다.
 */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter: Filter = params.get('filter') === 'unread' ? 'unread' : 'all';
  useNotificationsSync();
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const markRead = useAppStore((s) => s.markNotificationRead);

  const groups = useMemo(
    () => groupByDay(filter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter],
  );

  const changeFilter = (next: Filter) => {
    setParams(next === 'unread' ? { filter: 'unread' } : {}, { replace: true });
  };

  const open = (notification: AppNotification) => {
    markRead(notification.id);
    navigate(`/notifications/${notification.id}`, { state: { listSearch: filter === 'unread' ? '?filter=unread' : '' } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`t-title-s ${styles.title}`}>알림창</h1>
        <FilterChips<Filter>
          className={styles.filters}
          aria-label="알림 필터"
          items={[
            { key: 'all', label: '전체' },
            { key: 'unread', label: `안 읽음 ${unreadCount}` },
          ]}
          value={filter}
          onChange={changeFilter}
        />
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <StateMessage
            icon={<Icon name="bell-circle" />}
            title="아직 받은 알림이 없어요"
            description="작업 배정, 일정 변경, 수락 · 거절 같은 소식이 생기면 여기에 표시돼요"
          />
        </div>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section key={group.label} className={styles.group}>
              <h2 className={`t-body-s-semibold ${styles.groupLabel}`}>{group.label}</h2>
              <ul className={styles.rows}>
                {group.items.map((notification, index) => (
                  <Fragment key={notification.id}>
                    {index > 0 && <li className={styles.divider} aria-hidden />}
                    <li>
                      <button
                        type="button"
                        className={clsx(styles.row, !notification.read && styles.unread)}
                        onClick={() => open(notification)}
                      >
                        <span className={styles.texts}>
                          <span
                            className="t-body-xs-medium"
                            style={{ color: TYPE_LABEL_COLOR[notification.type] }}
                          >
                            {NOTIFICATION_TYPE_LABEL[notification.type]}
                          </span>
                          <span className={`t-body-s-medium ${styles.message}`}>{notification.message}</span>
                        </span>
                        <span className={`t-body-s-medium ${styles.time}`}>{formatNotificationTime(notification.createdAt)}</span>
                      </button>
                    </li>
                  </Fragment>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
