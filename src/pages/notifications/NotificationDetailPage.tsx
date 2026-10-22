import clsx from 'clsx';
import { type CSSProperties, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/design-system';
import { formatKoreanDateTime } from '@/lib/format';
import { selectMemberById, selectNotificationById, selectTaskById } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import { useTaskDetailSync } from '@/data/sync';
import { TASK_STATUS_LABEL } from '@/data/types';

import styles from './NotificationDetailPage.module.css';
import { DETAIL_COPY, historyDisplayLabel } from './notificationView';

/** 취소 시안(1807:6719)의 아이콘·상태 글자 색(ant-design:close-circle-filled, '취소됨') — 변수 아닌 Figma 고정값 */
const CANCEL_RED = '#f00013';

/**
 * 알림 상세(/notifications/:notificationId).
 * - 작업 취소 알림: 1807:6719(취소 상세 포함, 삭제 버튼 없음)
 * - 그 밖의 알림: 1834:5562 형태(삭제 → deleteNotification 후 알림창). 작업 거절만 취소 시안의 빨간 X 아이콘·색을 쓴다.
 * 작업 정보·처리 이력은 알림에 연결된 작업의 현재 값이다.
 */
export default function NotificationDetailPage() {
  const { notificationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const notification = useAppStore((s) => selectNotificationById(s, notificationId));
  const task = useAppStore((s) => selectTaskById(s, notification?.taskId));
  const technician = useAppStore((s) => selectMemberById(s, task?.technicianId));
  const markRead = useAppStore((s) => s.markNotificationRead);
  const deleteNotification = useAppStore((s) => s.deleteNotification);
  const loaded = useAppStore((s) => s.tasksLoaded && s.notificationsLoaded);
  useTaskDetailSync(notification?.taskId);

  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? '';
  const listHref = `/notifications${listSearch}`;

  // 주소로 바로 들어온 경우에도 상세를 연 것으로 보고 읽음 처리한다.
  useEffect(() => {
    if (notification && !notification.read) markRead(notification.id);
  }, [notification, markRead]);

  // 주소로 바로 열면 알림·작업 목록을 읽은 뒤에 판단한다.
  if (!loaded) return null;
  if (!notification || !task) return <Navigate to="/notifications" replace />;

  const isCancelNotice = notification.type === 'CANCELED';
  // 취소·거절은 취소 시안(빨강), 그 밖은 1834:5562(Accepted/1) 색을 쓴다. 작업이 취소됐으면 상태·마지막 이력도 빨강.
  const negative = isCancelNotice || notification.type === 'REJECTED';
  const redState = negative || task.status === 'CANCELED';
  const copy = DETAIL_COPY[notification.type];
  const eventAt = formatKoreanDateTime(notification.createdAt);
  const accentStyle = {
    '--accent': redState ? 'var(--color-warning-1)' : 'var(--color-accepted-1)',
  } as CSSProperties;

  const handleDelete = () => {
    navigate(listHref, { replace: true });
    deleteNotification(notification.id);
  };

  const rows: { label: string; value: string; color?: string }[] = [
    {
      label: '상태',
      value: TASK_STATUS_LABEL[task.status],
      color: redState ? CANCEL_RED : 'var(--color-accepted-1)',
    },
    { label: '작업명', value: task.title },
    { label: '담당 기사', value: technician?.name ?? '미정' },
    { label: copy.timeLabel, value: eventAt },
  ];

  return (
    <div className={styles.page}>
      <Link to={listHref} className={styles.back}>
        <Icon name="chevron-right" size={28} color="var(--color-gray-800)" className={styles.backIcon} />
        <span className={`t-body-s-medium ${styles.backLabel}`}>알림함</span>
      </Link>

      {!isCancelNotice && (
        <Button variant="outline" className={styles.deleteButton} onClick={handleDelete}>
          삭제
        </Button>
      )}

      <header className={styles.header}>
        <div className={styles.titleRow}>
          {negative ? (
            <Icon name="close-circle-fill" size={28} color={CANCEL_RED} />
          ) : (
            <Icon name="check-circle-fill" size={28} color="var(--color-accepted-1)" />
          )}
          <h1 className={`t-body-xl-bold ${styles.title}`}>{copy.title}</h1>
        </div>
        <p className={`t-body-xs-medium ${styles.subtitle}`}>
          {task.title} · {eventAt}
        </p>
      </header>

      <div className={styles.divider} />

      <div className={styles.body}>
        <div className={styles.info}>
          <section className={styles.section}>
            <h2 className={`t-body-l-bold ${styles.sectionTitle}`}>작업 정보</h2>
            <dl className={styles.table}>
              {rows.map((row) => (
                <div key={row.label} className={styles.row}>
                  <dt className={styles.rowLabel}>{row.label}</dt>
                  <dd className={styles.rowValue} style={row.color ? { color: row.color } : undefined}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          {isCancelNotice && (
            <section className={styles.section}>
              <h2 className={`t-body-l-bold ${styles.sectionTitle}`}>취소 상세</h2>
              <p className={`t-body-xs-medium ${styles.cancelBox}`}>
                {"해당 작업은 등록자에 의해 취소되었습니다.\n작업이 취소되면 기사 앱에도 '취소'로 표시되며, 다시 활성화되지 않습니다."}
              </p>
            </section>
          )}
        </div>

        <section className={styles.historyCard} style={accentStyle}>
          <h2 className={`t-body-l-bold ${styles.historyTitle}`}>처리 이력</h2>
          <ol className={styles.timeline}>
            {task.history.map((entry, index) => (
              <li
                key={`${index}-${entry.at}`}
                className={clsx(styles.entry, index === task.history.length - 1 && styles.current)}
              >
                <span className={`t-body-s-bold ${styles.entryLabel}`}>{historyDisplayLabel(entry.label)}</span>
                <span className={`t-body-xs-medium ${styles.entryMeta}`}>
                  {formatKoreanDateTime(entry.at)}
                  {entry.actor ? ` · ${entry.actor}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
