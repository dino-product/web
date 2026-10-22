import clsx from 'clsx';
import { useRef } from 'react';

import { Icon, IconButton } from '@/design-system';
import type { ID, TypeCategory, TypeItem } from '@/data/types';

import { RowButton } from './RowButton';
import { TypeMenuPanel, TypeMoreMenu } from './TypeMoreMenu';
import { TypeNameField } from './TypeNameField';
import styles from './TypeTable.module.css';

/** 수정하기로 연 인라인 편집(1924:15037) */
export interface TypeEdit {
  name: string;
  error: string | null;
}

/** 새 유형 추가로 만든 저장 전 행(1924:15089) */
export interface TypeDraft {
  key: string;
  category: TypeCategory;
  name: string;
  error: string | null;
}

export interface TypeTableProps {
  category: TypeCategory;
  types: TypeItem[];
  edits: Record<ID, TypeEdit>;
  drafts: TypeDraft[];
  /** 더보기 메뉴가 열린 유형 */
  menuTypeId: ID | null;
  /** 확인 모달을 띄운 유형 — 시안처럼 모달 뒤에 메뉴를 그대로 남겨 둔다(2008:27365) */
  frozenMenuTypeId: ID | null;
  onStartEdit: (type: TypeItem) => void;
  onEditChange: (typeId: ID, name: string) => void;
  onEditCancel: (typeId: ID) => void;
  onEditSave: (typeId: ID) => void;
  onDraftChange: (key: string, name: string) => void;
  onDraftRemove: (key: string) => void;
  onDraftSave: (key: string) => void;
  onAdd: () => void;
  onMenuOpen: (typeId: ID) => void;
  onMenuClose: () => void;
  onToggleActive: (type: TypeItem) => void;
  onDelete: (type: TypeItem) => void;
}

/**
 * 유형 목록 표(Figma 1924:15032). 머리줄 1547x55(Gray50, radius 14) 아래로
 * 일반 행 76 · 편집/새 행 101(아래 Gray100 1px), 마지막에 '새 유형 추가' 행 76.
 * 목록이 비면 머리줄 아래 80px에 가운데 '새 유형 추가' 버튼(1924:16328).
 */
export function TypeTable(props: TypeTableProps) {
  const { category, types, edits, drafts, onAdd } = props;
  const isEmpty = types.length === 0 && drafts.length === 0;

  if (isEmpty) {
    return (
      <div className={styles.emptyTable}>
        <TypeTableHeader category={category} />
        <button type="button" className={clsx('t-body-m-medium', styles.emptyAdd)} onClick={onAdd}>
          <Icon name="plus" size={28} color="var(--color-gray-600)" />새 유형 추가
        </button>
      </div>
    );
  }

  return (
    <div className={styles.table}>
      <TypeTableHeader category={category} />
      <ul className={styles.body}>
        {types.map((type) => {
          const edit = edits[type.id];
          return edit ? (
            <li key={type.id} className={clsx(styles.row, styles.formRow)}>
              <div className={styles.field}>
                <TypeNameField
                  value={edit.name}
                  error={edit.error}
                  onChange={(name) => props.onEditChange(type.id, name)}
                  onSubmit={() => props.onEditSave(type.id)}
                  onCancel={() => props.onEditCancel(type.id)}
                  aria-label="유형 이름"
                />
              </div>
              <div className={styles.editActions}>
                <RowButton width={63} onClick={() => props.onEditCancel(type.id)}>
                  취소
                </RowButton>
                <RowButton variant="primary" width={128} onClick={() => props.onEditSave(type.id)}>
                  변경사항 저장
                </RowButton>
              </div>
            </li>
          ) : (
            <TypeViewRow key={type.id} type={type} {...props} />
          );
        })}
        {drafts.map((draft) => (
          <li key={draft.key} className={clsx(styles.row, styles.formRow)}>
            <div className={styles.field}>
              <TypeNameField
                value={draft.name}
                error={draft.error}
                onChange={(name) => props.onDraftChange(draft.key, name)}
                onSubmit={() => props.onDraftSave(draft.key)}
                onCancel={() => props.onDraftRemove(draft.key)}
                aria-label="새 유형 이름"
              />
            </div>
            <div className={styles.draftActions}>
              <RowButton width={63} onClick={() => props.onDraftRemove(draft.key)}>
                삭제
              </RowButton>
              <RowButton variant="primary" width={63} onClick={() => props.onDraftSave(draft.key)}>
                저장
              </RowButton>
            </div>
          </li>
        ))}
        <li className={styles.addRow}>
          <button type="button" className={clsx('t-body-s-medium', styles.addButton)} onClick={onAdd}>
            <Icon name="plus" size={28} color="var(--color-gray-500)" />새 유형 추가
          </button>
        </li>
      </ul>
    </div>
  );
}

/** 머리줄: '유형 이름'(36,17), 작업유형은 '색상'(380,17) — 16/500 Gray600 */
function TypeTableHeader({ category }: { category: TypeCategory }) {
  return (
    <div className={styles.header}>
      <span className={clsx('t-body-xs-medium', styles.headerName)}>유형 이름</span>
      {category === 'WORK' && <span className={clsx('t-body-xs-medium', styles.headerColor)}>색상</span>}
    </div>
  );
}

interface TypeViewRowProps extends TypeTableProps {
  type: TypeItem;
}

/**
 * 일반 행(1924:15682): 이름(36,26) 18/500 Gray900, 오른쪽 '수정하기' + ⋮(간격 12, 오른쪽 36·위 17).
 * 비활성 행(2008:35262): 이름 Gray600, '수정하기' 없이 ⋮만 같은 자리(1491, 28.5).
 */
function TypeViewRow({
  type,
  menuTypeId,
  frozenMenuTypeId,
  onStartEdit,
  onMenuOpen,
  onMenuClose,
  onToggleActive,
  onDelete,
}: TypeViewRowProps) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuOpen = menuTypeId === type.id;
  return (
    <li className={styles.row}>
      <span className={clsx('t-body-s-medium', styles.name, !type.active && styles.inactiveName)}>{type.name}</span>
      <div className={styles.viewActions}>
        {type.active && (
          <RowButton variant="edit" width={121} onClick={() => onStartEdit(type)}>
            수정하기
          </RowButton>
        )}
        <IconButton
          ref={moreRef}
          icon="more-vertical"
          size={20}
          color="var(--color-gray-500)"
          label="더보기"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => (menuOpen ? onMenuClose() : onMenuOpen(type.id))}
        />
        {frozenMenuTypeId === type.id && (
          <TypeMenuPanel
            active={type.active}
            inert
            className={clsx(styles.frozenMenu, !type.active && styles.frozenMenuInactive)}
          />
        )}
      </div>
      <TypeMoreMenu
        open={menuOpen}
        anchorRef={moreRef}
        onClose={onMenuClose}
        active={type.active}
        onToggleActive={() => onToggleActive(type)}
        onDelete={() => onDelete(type)}
      />
    </li>
  );
}
