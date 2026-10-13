import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { type PillTab, PillTabs } from '@/design-system';
import { getActiveTypesByCategory, useTypes } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import { type ID, TYPE_CATEGORY_LABEL, type TypeItem } from '@/mocks/types';

import {
  ActivateTypeDialog,
  ChangeTechnicianTypeDialog,
  DeactivateTypeDialog,
  DeleteTypeDialog,
  type TypeDialogKind,
} from './TypeDialogs';
import { parseTypesTab, TAB_CATEGORY, TYPES_TABS, type TypesTab, validateTypeName } from './typeRules';
import { type TypeDraft, type TypeEdit, TypeTable } from './TypeTable';
import styles from './TypesPage.module.css';

const TABS: PillTab<TypesTab>[] = TYPES_TABS.map((key) => ({ key, label: TYPE_CATEGORY_LABEL[TAB_CATEGORY[key]] }));

interface OpenDialog {
  kind: TypeDialogKind;
  typeId: ID;
}

/**
 * 조직 설정 > 유형 설정 탭 본문(/org/types). OrgSection의 OrgLayout이 탭 막대 아래(y=154)에 Outlet으로 그린다.
 * 조직 설정 제목·탭·우측 상단 버튼(회사 코드 관리, 승인대기)은 OrgLayout(org-members 담당)이 그린다.
 *
 * Figma: 직원유형 1924:15030·2008:34201·2008:34397·1924:15795, 기사유형 1924:15278·2008:34851·2008:27153·2043:35306,
 * 작업유형 1741:7196·2043:35530, 모달 2008:27365·2008:32360·2008:32588·2008:33958.
 * - 하위 탭은 ?tab=employee|technician|work(기본 직원유형).
 * - 수정하기 → 인라인 편집(취소/변경사항 저장), 새 유형 추가 → 목록 끝 새 행(삭제/저장). 이름은 2~10자, 같은 분류 안 중복 불가.
 * - ⋮ 메뉴: 삭제 → 유형 삭제 확인. 직원유형 비활성화 → 직원 활성화 확인, 기사유형 활성화 → 기사 활성화 확인,
 *   기사유형 비활성화 → 기사유형 변경(그 유형 기사들을 고른 유형으로 옮긴 뒤 비활성화). 시안에 모달이 없는
 *   직원유형 활성화·작업유형 비활성화/활성화는 바로 바꾼다.
 */
export default function TypesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTypesTab(searchParams.get('tab'));
  const category = TAB_CATEGORY[tab];
  const types = useTypes(category);

  const [edits, setEdits] = useState<Record<ID, TypeEdit>>({});
  const [drafts, setDrafts] = useState<TypeDraft[]>([]);
  const [menuTypeId, setMenuTypeId] = useState<ID | null>(null);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [changeTargetId, setChangeTargetId] = useState<ID | null>(null);
  const draftSeq = useRef(0);

  const categoryDrafts = useMemo(() => drafts.filter((d) => d.category === category), [drafts, category]);

  const changeTab = (next: TypesTab) => {
    setMenuTypeId(null);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('tab', next);
        return params;
      },
      { replace: true },
    );
  };

  // ── 인라인 편집 ──
  const startEdit = useCallback((type: TypeItem) => {
    setMenuTypeId(null);
    setEdits((prev) => ({ ...prev, [type.id]: { name: type.name, error: null } }));
  }, []);

  const changeEdit = useCallback((typeId: ID, name: string) => {
    setEdits((prev) => (prev[typeId] ? { ...prev, [typeId]: { name, error: null } } : prev));
  }, []);

  const cancelEdit = useCallback((typeId: ID) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[typeId];
      return next;
    });
  }, []);

  const saveEdit = useCallback(
    (typeId: ID) => {
      const edit = edits[typeId];
      if (!edit) return;
      const state = useAppStore.getState();
      const type = state.types.find((t) => t.id === typeId);
      const error = type ? validateTypeName(state.types, type.category, edit.name, typeId) : null;
      if (error) {
        setEdits((prev) => ({ ...prev, [typeId]: { ...edit, error } }));
        return;
      }
      const name = edit.name.trim();
      if (type && name !== type.name) state.updateType(typeId, { name });
      cancelEdit(typeId);
    },
    [edits, cancelEdit],
  );

  // ── 새 유형 ──
  const addDraft = useCallback(() => {
    setMenuTypeId(null);
    draftSeq.current += 1;
    const key = `draft-${draftSeq.current}`;
    setDrafts((prev) => [...prev, { key, category, name: '', error: null }]);
  }, [category]);

  const changeDraft = useCallback((key: string, name: string) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, name, error: null } : d)));
  }, []);

  const removeDraft = useCallback((key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }, []);

  const saveDraft = useCallback(
    (key: string) => {
      const draft = drafts.find((d) => d.key === key);
      if (!draft) return;
      const state = useAppStore.getState();
      const error = validateTypeName(state.types, draft.category, draft.name);
      if (error) {
        setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, error } : d)));
        return;
      }
      // 작업 유형 색은 addType이 아직 쓰지 않은 Type Color를 순서대로 고른다(시안에 색 선택 UI 없음).
      state.addType(draft.category, draft.name.trim());
      removeDraft(key);
    },
    [drafts, removeDraft],
  );

  // ── 더보기 메뉴 ──
  const closeMenu = useCallback(() => setMenuTypeId(null), []);

  const toggleActive = useCallback((type: TypeItem) => {
    setMenuTypeId(null);
    if (type.active && type.category === 'EMPLOYEE') {
      setDialog({ kind: 'deactivate', typeId: type.id });
    } else if (type.active && type.category === 'TECHNICIAN') {
      // 선택 상자의 처음 값은 다른 활성 기사유형 중 첫 번째(만든 순)
      const others = getActiveTypesByCategory(useAppStore.getState().types, 'TECHNICIAN');
      setChangeTargetId(others.find((t) => t.id !== type.id)?.id ?? null);
      setDialog({ kind: 'change', typeId: type.id });
    } else if (!type.active && type.category === 'TECHNICIAN') {
      setDialog({ kind: 'activate', typeId: type.id });
    } else {
      useAppStore.getState().setTypeActive(type.id, !type.active);
    }
  }, []);

  const requestDelete = useCallback((type: TypeItem) => {
    setMenuTypeId(null);
    setDialog({ kind: 'delete', typeId: type.id });
  }, []);

  // ── 확인 모달 ──
  const closeDialog = useCallback(() => setDialog(null), []);

  const confirmDialog = () => {
    if (!dialog) return;
    const state = useAppStore.getState();
    const { kind, typeId } = dialog;
    if (kind === 'delete') {
      state.deleteType(typeId);
      cancelEdit(typeId);
    } else if (kind === 'deactivate') {
      state.setTypeActive(typeId, false);
    } else if (kind === 'activate') {
      state.setTypeActive(typeId, true);
    } else {
      // 기사유형 변경: 이 유형으로 지정된 기사를 고른 유형으로 옮기고 유형을 비활성화한다.
      if (changeTargetId) {
        for (const member of state.members) {
          if (member.kind === 'TECHNICIAN' && member.typeId === typeId) state.setMemberType(member.id, changeTargetId);
        }
      }
      state.setTypeActive(typeId, false);
    }
    setDialog(null);
  };

  const technicianTypes = useTypes('TECHNICIAN');
  const changeOptions = useMemo(
    () =>
      technicianTypes
        .filter((t) => t.active && t.id !== dialog?.typeId)
        .map((t) => ({ value: t.id, label: t.name })),
    [technicianTypes, dialog?.typeId],
  );

  return (
    <div className={styles.page}>
      <PillTabs tabs={TABS} value={tab} onChange={changeTab} aria-label="유형 분류" />
      <TypeTable
        category={category}
        types={types}
        edits={edits}
        drafts={categoryDrafts}
        menuTypeId={menuTypeId}
        frozenMenuTypeId={dialog?.typeId ?? null}
        onStartEdit={startEdit}
        onEditChange={changeEdit}
        onEditCancel={cancelEdit}
        onEditSave={saveEdit}
        onDraftChange={changeDraft}
        onDraftRemove={removeDraft}
        onDraftSave={saveDraft}
        onAdd={addDraft}
        onMenuOpen={setMenuTypeId}
        onMenuClose={closeMenu}
        onToggleActive={toggleActive}
        onDelete={requestDelete}
      />
      <DeleteTypeDialog open={dialog?.kind === 'delete'} onClose={closeDialog} onConfirm={confirmDialog} />
      <DeactivateTypeDialog open={dialog?.kind === 'deactivate'} onClose={closeDialog} onConfirm={confirmDialog} />
      <ActivateTypeDialog open={dialog?.kind === 'activate'} onClose={closeDialog} onConfirm={confirmDialog} />
      <ChangeTechnicianTypeDialog
        open={dialog?.kind === 'change'}
        onClose={closeDialog}
        onConfirm={confirmDialog}
        options={changeOptions}
        value={changeTargetId}
        onChange={setChangeTargetId}
      />
    </div>
  );
}
