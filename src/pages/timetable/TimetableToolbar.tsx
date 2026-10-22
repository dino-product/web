import clsx from 'clsx';

import { Button, FilterSelect, Icon } from '@/design-system';
import { formatTimetableDate } from '@/lib/format';
import type { ID, IsoDate, TypeItem } from '@/data/types';

import nextIcon from './assets/date-next.svg';
import prevIcon from './assets/date-prev.svg';
import styles from './TimetableToolbar.module.css';

export type TimetableMode = 'view' | 'edit';

interface TypeFilterProps {
  label: string;
  types: TypeItem[];
  value: ID | null;
  onChange: (typeId: ID | null) => void;
  editing: boolean;
}

/**
 * 유형 필터(Select 449:2597). 선택지가 없으면 DS FilterSelect가 빈 옵션 패널을 열지 않는다.
 */
function TypeFilter({ label, types, value, onChange, editing }: TypeFilterProps) {
  return (
    <FilterSelect
      label={label}
      options={types.map((t) => ({ value: t.id, label: t.name }))}
      value={value}
      onChange={onChange}
      disabled={editing}
      className={clsx(editing && styles.filterEditing)}
    />
  );
}

interface TimetableToolbarProps {
  date: IsoDate;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  mode: TimetableMode;
  onModeChange: (mode: TimetableMode) => void;
  technicianTypes: TypeItem[];
  technicianTypeId: ID | null;
  onTechnicianTypeChange: (typeId: ID | null) => void;
  workTypes: TypeItem[];
  workTypeId: ID | null;
  onWorkTypeChange: (typeId: ID | null) => void;
  onRegister: () => void;
}

/**
 * 타임테이블 툴바(945:6342 + 443:1270). 날짜 이동·오늘·보기/편집 토글·필터·새 작업 등록.
 * 편집 모드(1038:4233)에서는 날짜 이동·오늘·필터가 50% 흐려지고 동작하지 않으며, 안내 칩이 붙는다.
 * 필터 라벨은 시안 문구('일반 기사', '점검')가 기본이고, 유형을 고르면 그 이름을 보여 준다(다시 고르면 해제).
 */
export default function TimetableToolbar({
  date,
  onPrevDate,
  onNextDate,
  onToday,
  mode,
  onModeChange,
  technicianTypes,
  technicianTypeId,
  onTechnicianTypeChange,
  workTypes,
  workTypeId,
  onWorkTypeChange,
  onRegister,
}: TimetableToolbarProps) {
  const editing = mode === 'edit';
  const technicianTypeName = technicianTypes.find((t) => t.id === technicianTypeId)?.name;
  const workTypeName = workTypes.find((t) => t.id === workTypeId)?.name;

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <div className={clsx(styles.dateGroup, editing && styles.dimmed)}>
          <div className={clsx(styles.dateNav, editing && styles.dateNavEditing)}>
            <button type="button" className={styles.navButton} aria-label="이전 날짜" disabled={editing} onClick={onPrevDate}>
              <img src={prevIcon} alt="" width={42} height={50} />
            </button>
            <span className={clsx('t-body-s-medium', styles.dateText)}>{formatTimetableDate(date)}</span>
            <button type="button" className={styles.navButton} aria-label="다음 날짜" disabled={editing} onClick={onNextDate}>
              <img src={nextIcon} alt="" width={42} height={50} />
            </button>
          </div>
          <button type="button" className={styles.today} disabled={editing} onClick={onToday}>
            <span className={clsx('t-body-s-semibold', styles.todayLabel)}>오늘</span>
          </button>
        </div>
        <span className={styles.divider} aria-hidden />
        <div className={styles.modeToggle} role="group" aria-label="보기 모드">
          <button
            type="button"
            className={clsx(styles.modeButton, !editing && styles.viewActive)}
            aria-pressed={!editing}
            onClick={() => onModeChange('view')}
          >
            <Icon name="lock" size={24} />
            보기
          </button>
          <button
            type="button"
            className={clsx(styles.modeButton, editing && styles.editActive)}
            aria-pressed={editing}
            onClick={() => onModeChange('edit')}
          >
            <Icon name="edit" size={24} />
            편집
          </button>
        </div>
        {editing && <span className={styles.editHint}>편집 중 · 카드를 드래그해서 편집할 수 있어요</span>}
      </div>

      <div className={styles.right}>
        <TypeFilter
          label={technicianTypeName ?? '일반 기사'}
          types={technicianTypes}
          value={technicianTypeId}
          onChange={onTechnicianTypeChange}
          editing={editing}
        />
        <TypeFilter
          label={workTypeName ?? '점검'}
          types={workTypes}
          value={workTypeId}
          onChange={onWorkTypeChange}
          editing={editing}
        />
        {/* 443:1273 Button{Property 1=Icon} — 아이콘 28과 글자 간격 10(DS Icon-Filled는 8) */}
        <Button icon="plus" style={{ gap: 10 }} onClick={onRegister}>
          새 작업 등록
        </Button>
      </div>
    </div>
  );
}
