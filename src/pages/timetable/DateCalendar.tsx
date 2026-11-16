import clsx from 'clsx';
import { useState } from 'react';

import { Icon } from '@/design-system';
import { WEEKDAY_LABELS, addDays, isSameMonth, parseIsoDate, startOfMonth, today, weekdayOf } from '@/lib/date';
import type { IsoDate } from '@/data/types';

import styles from './DateCalendar.module.css';

/** 6주(42칸) 고정 — 달마다 달력 높이가 바뀌지 않게 한다 */
const CELL_COUNT = 42;

interface DateCalendarProps {
  /** 현재 선택된 날짜. 처음 열 때 이 날짜가 속한 달을 보여 준다 */
  value: IsoDate;
  onSelect: (date: IsoDate) => void;
}

/**
 * 타임테이블 날짜 선택 달력(시안 없음 — 드롭다운 패널 모양·토큰으로 구성).
 * 일요일 시작 6주 격자이며, 앞뒤 달 날짜도 눌러 고를 수 있다.
 */
export default function DateCalendar({ value, onSelect }: DateCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(value));
  const todayDate = today();
  const { year, month: monthNumber } = parseIsoDate(month);
  const gridStart = addDays(month, -weekdayOf(month));
  const days = Array.from({ length: CELL_COUNT }, (_, i) => addDays(gridStart, i));

  return (
    <div className={styles.calendar} role="dialog" aria-label="날짜 선택">
      <div className={styles.header}>
        <button
          type="button"
          className={clsx(styles.monthButton, styles.prev)}
          aria-label="이전 달"
          onClick={() => setMonth(startOfMonth(addDays(month, -1)))}
        >
          <Icon name="chevron-right" size={24} />
        </button>
        <span className={clsx('t-body-s-semibold', styles.monthLabel)} aria-live="polite">
          {year}년 {monthNumber}월
        </span>
        <button
          type="button"
          className={styles.monthButton}
          aria-label="다음 달"
          onClick={() => setMonth(startOfMonth(addDays(month, 31)))}
        >
          <Icon name="chevron-right" size={24} />
        </button>
      </div>
      <div className={styles.grid}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={clsx('t-caption-m-medium', styles.weekday)}>
            {label}
          </span>
        ))}
        {days.map((day) => {
          const selected = day === value;
          return (
            <button
              key={day}
              type="button"
              className={clsx(
                't-body-xs-medium',
                styles.day,
                !isSameMonth(day, month) && styles.outside,
                day === todayDate && styles.today,
                selected && styles.selected,
              )}
              aria-pressed={selected}
              aria-current={day === todayDate ? 'date' : undefined}
              onClick={() => onSelect(day)}
            >
              {parseIsoDate(day).day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
