import clsx from 'clsx';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { Chip, Modal } from '@/design-system';
import { formatJoinDate } from '@/lib/format';
import { useJoinRequests } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import { type ID, JOIN_CHANNEL_LABEL, type JoinRequest, MEMBER_KIND_LABEL } from '@/data/types';

import { KindSelect } from '../components/KindSelect';
import { ScrollThumb, useScrollThumb } from '../components/ScrollThumb';
import { TriCheckbox } from '../components/TriCheckbox';
import styles from './ApprovalModal.module.css';
import { RejectDialog } from './RejectDialog';

export interface ApprovalModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 승인대기 모달(Figma 미선택 1951:20261 · 일부 선택 1888:10087 · 전체 선택 1951:21047). 1310x733, 화면 가운데.
 * - 선택하면 'N건 선택됨' 줄(일괄 거절·승인)과 선택한 행의 거절·승인 버튼이 나타난다.
 * - 확정 유형을 바꾸면 setJoinRequestKind, 희망 유형과 다르면 '불일치' 칩·행 색.
 * - 승인 → approveJoinRequests. 거절 → 승인 거절 모달(2008:25656·2008:26090) → rejectJoinRequests 후 이 모달로 돌아온다.
 * - 닫기 버튼 시안이 없어 Esc·바깥 클릭으로 닫는다.
 */
export function ApprovalModal({ open, onClose }: ApprovalModalProps) {
  const requests = useJoinRequests();
  const [selected, setSelected] = useState<Set<ID>>(() => new Set());
  const [rejectIds, setRejectIds] = useState<ID[] | null>(null);
  const scroll = useScrollThumb();

  // 승인·거절로 사라진 요청은 선택에서 뺀다. 모달을 닫으면 선택을 비운다.
  useEffect(() => {
    setSelected((prev) => {
      const alive = new Set(requests.map((r) => r.id));
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [requests]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setRejectIds(null);
    }
  }, [open]);

  const selectedCount = selected.size;
  const allSelected = requests.length > 0 && selectedCount === requests.length;
  const hasSelection = selectedCount > 0;
  const { update: updateThumb } = scroll;

  // 'N건 선택됨' 줄이 생기거나 사라지면 목록 위치가 바뀌므로 막대를 다시 잰다.
  useLayoutEffect(() => {
    updateThumb();
  }, [hasSelection, updateThumb]);

  const toggle = (id: ID, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(requests.map((r) => r.id)) : new Set());

  const approve = (ids: ID[]) => {
    if (ids.length) useAppStore.getState().approveJoinRequests(ids);
  };

  const rejectTargets = useMemo(
    () => (rejectIds ? requests.filter((r) => rejectIds.includes(r.id)) : []),
    [rejectIds, requests],
  );

  const confirmReject = (reason: string) => {
    if (rejectIds?.length) useAppStore.getState().rejectJoinRequests(rejectIds, reason);
    setRejectIds(null);
  };

  return (
    <>
      <Modal open={open && !rejectIds} onClose={onClose} closeOnOverlayClick aria-labelledby="approval-title">
        <div className={styles.panel}>
          <div className={styles.heading}>
            <h2 id="approval-title" className={styles.title}>
              승인대기
            </h2>
            <p className={styles.description}>
              승인하면 확정 유형으로 참여 인원 탭에 추가됩니다. 승인 후 역할 변경은 참여 인원 탭에서 합니다.
            </p>
          </div>
          <div className={styles.content}>
            {hasSelection && (
              <div className={styles.bulkBar}>
                <div className={styles.bulkCount}>
                  <TriCheckbox checked onChange={() => toggleAll(false)} aria-label="선택 해제" />
                  <span>{selectedCount}건 선택됨</span>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={clsx(styles.smallButton, allSelected ? styles.rejectDanger : styles.rejectBulk)}
                    onClick={() => setRejectIds([...selected])}
                  >
                    거절
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.smallButton, styles.approve)}
                    onClick={() => approve([...selected])}
                  >
                    승인
                  </button>
                </div>
              </div>
            )}
            <div className={styles.table} role="table" aria-label="승인대기 목록">
              <div className={styles.head} role="row">
                <span role="columnheader" className={styles.headApplicant}>
                  <TriCheckbox
                    checked={allSelected}
                    indeterminate={hasSelection && !allSelected}
                    onChange={toggleAll}
                    aria-label="전체 선택"
                  />
                  신청자
                </span>
                <span role="columnheader" style={{ left: 202 }}>
                  희망 유형
                </span>
                <span role="columnheader" style={{ left: 377 }}>
                  확정 유형
                </span>
                <span role="columnheader" style={{ left: 675 }}>
                  요청일
                </span>
                <span role="columnheader" style={{ left: 878 }}>
                  요청 경로
                </span>
              </div>
              <div ref={scroll.setViewport} className={styles.rows} onScroll={scroll.onScroll}>
                <div>
                  {requests.map((request) => (
                    <ApprovalRow
                      key={request.id}
                      request={request}
                      selected={selected.has(request.id)}
                      onToggle={(checked) => toggle(request.id, checked)}
                      onApprove={() => approve([request.id])}
                      onReject={() => setRejectIds([request.id])}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <ScrollThumb state={scroll.state} className={styles.thumb} />
        </div>
      </Modal>
      <RejectDialog
        open={open && Boolean(rejectIds)}
        targets={rejectTargets}
        onClose={() => setRejectIds(null)}
        onConfirm={confirmReject}
      />
    </>
  );
}

interface ApprovalRowProps {
  request: JoinRequest;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

function ApprovalRow({ request, selected, onToggle, onApprove, onReject }: ApprovalRowProps) {
  const setJoinRequestKind = useAppStore((s) => s.setJoinRequestKind);
  const mismatch = request.desiredKind !== request.confirmedKind;
  return (
    <div
      role="row"
      className={clsx(styles.row, selected && (mismatch ? styles.rowMismatch : styles.rowSelected))}
    >
      <span role="cell" className={styles.applicant}>
        <TriCheckbox checked={selected} onChange={onToggle} aria-label={`${request.name} 선택`} />
        {request.name}
      </span>
      <span role="cell" className={styles.desired}>
        {MEMBER_KIND_LABEL[request.desiredKind]}
      </span>
      <span role="cell" className={styles.confirmed}>
        <KindSelect
          filled
          value={request.confirmedKind}
          onChange={(kind) => setJoinRequestKind(request.id, kind)}
          aria-label="확정 유형"
        />
        {mismatch && <Chip tone="inProgress">불일치</Chip>}
      </span>
      <span role="cell" className={styles.text} style={{ left: 676 }}>
        {formatJoinDate(request.requestedAt)}
      </span>
      <span role="cell" className={styles.text} style={{ left: 879 }}>
        {JOIN_CHANNEL_LABEL[request.channel]}
      </span>
      {selected && (
        <span role="cell" className={clsx(styles.actions, styles.rowActions)}>
          <button type="button" className={clsx(styles.smallButton, styles.rejectRow)} onClick={onReject}>
            거절
          </button>
          <button type="button" className={clsx(styles.smallButton, styles.approve)} onClick={onApprove}>
            승인
          </button>
        </span>
      )}
    </div>
  );
}
