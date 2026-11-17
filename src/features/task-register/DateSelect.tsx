import clsx from 'clsx';
import { useRef, useState } from 'react';

import { Icon, Popover } from '@/design-system';
import { formatTimetableDate } from '@/lib/format';
import type { IsoDate } from '@/data/types';
import DateCalendar from '@/pages/timetable/DateCalendar';

import selectStyles from './OptionSelect.module.css';
import styles from './DateSelect.module.css';

export interface DateSelectProps {
  value: IsoDate;
  onChange: (date: IsoDate) => void;
  id?: string;
}

/**
 * 새 작업 등록 작업 날짜. 선택 상자(OptionSelect register)와 같은 모양에 'YYYY.MM.DD (요일)'과 달력 아이콘을 두고,
 * 누르면 아래에 타임테이블과 같은 달력(DateCalendar)이 열려 연·월·일을 고른다. 열리면 테두리를 Primary로 강조한다.
 */
export function DateSelect({ value, onChange, id }: DateSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={clsx(selectStyles.trigger, selectStyles.register, open && styles.open)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={clsx(selectStyles.value, styles.value)}>{formatTimetableDate(value)}</span>
        <Icon name="calendar" size={24} color="var(--color-gray-900)" />
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)}>
        <DateCalendar
          value={value}
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </Popover>
    </>
  );
}
