import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { Button, Dialog, Field, Icon, StatusChip } from '@/design-system';
import { formatMonthDay } from '@/lib/format';
import { useActiveTypes } from '@/data/selectors';
import { type ID, MEMBER_KIND_LABEL, type Member, type MemberKind, type Task } from '@/data/types';

import { ListSelect } from '../components/ListSelect';
import dialogStyles from '../dialog.module.css';
import { useTypeName } from '../useTypeName';
import styles from './RoleChangeDialog.module.css';

export interface RoleChangeDialogProps {
  member: Member;
  toKind: MemberKind;
  /** 작업중 작업(있으면 변경 불가 2008:31376) */
  inProgress: Task[];
  /** 시작 전 배정 작업(있으면 예정 작업 안내 2008:31713) */
  scheduled: Task[];
  onClose: () => void;
  onConfirm: (typeId: ID | null) => void;
  /** 변경 불가 '작업 목록 보기' */
  onShowTasks: () => void;
}

const taskTime = (task: Task, separator: string) =>
  task.date ? `${formatMonthDay(task.date, separator)}${task.startTime ? ` ${task.startTime}` : ''}` : '';

/**
 * 역할 변경 확인 모달(직원유형 선택을 바꾸면 띄운다).
 * - 기본: 유형 미선택 2008:30734(안내 한 문단, 취소 글자 버튼) → 유형 선택 2008:31040(안내 두 항목, 취소 테두리 버튼)
 * - 예정 작업이 있는 기사: 2008:31713(배정 해제 안내 + 작업 목록)
 * - 작업중 작업이 있는 기사: 변경 불가 2008:31376(닫기, 작업 목록 보기)
 * 시안은 기사 → 직원만 있다. 직원 → 기사는 같은 모달에 구분·유형 이름만 바꿔 쓴다.
 */
export function RoleChangeDialog({
  member,
  toKind,
  inProgress,
  scheduled,
  onClose,
  onConfirm,
  onShowTasks,
}: RoleChangeDialogProps) {
  const [typeId, setTypeId] = useState<ID | null>(null);
  const currentTypeName = useTypeName(member.typeId);
  const targetTypes = useActiveTypes(toKind);
  const options = useMemo(() => targetTypes.map((t) => ({ value: t.id, label: t.name })), [targetTypes]);

  if (inProgress.length > 0) {
    return (
      <Dialog
        className={dialogStyles.dialog}
        open
        onClose={onClose}
        title="역할을 변경할 수 없어요"
        actions={
          <>
            <Button variant="secondary" style={{ width: 97 }} onClick={onClose}>
              닫기
            </Button>
            <Button icon="list" iconSize={24} style={{ width: 165 }} onClick={onShowTasks}>
              작업 목록 보기
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          <div className={styles.alert}>
            <Icon name="error-fill" size={28} color="var(--color-type-red)" />
            <p>
              {`${member.name} 님에게 작업중인 작업이 있어요. 작업을 완료한 뒤 변경해 주세요.\n예정된 작업만 있으면 배정을 풀고 변경할 수 있어요.`}
            </p>
          </div>
          {inProgress.map((task) => (
            <div key={task.id} className={styles.taskCard}>
              <div className={styles.taskText}>
                <p className={styles.taskTitle}>{task.title}</p>
                <p className={styles.taskTime}>{taskTime(task, '-')}</p>
              </div>
              <StatusChip status="IN_PROGRESS" />
            </div>
          ))}
        </div>
      </Dialog>
    );
  }

  const fromLabel = member.typeId
    ? `${MEMBER_KIND_LABEL[member.kind]} · ${currentTypeName}`
    : MEMBER_KIND_LABEL[member.kind];
  const toLabel = MEMBER_KIND_LABEL[toKind];
  const typeLabel = toKind === 'EMPLOYEE' ? '직원 유형' : '기사 유형';
  const releasedType = member.typeId ? `(${currentTypeName})` : '';
  const [gain, release] =
    toKind === 'EMPLOYEE'
      ? ['직원이 되면 작업 등록·수정·배정 권한을 갖게 됩니다.', `기사 유형${releasedType}은 해제되고, 이후 새 작업을 배정받지 않습니다.`]
      : ['기사가 되면 작업을 배정받을 수 있습니다.', `직원 유형${releasedType}은 해제되고, 작업 등록·수정·배정 권한이 없어집니다.`];
  const notified = '변경 내용은 당사자에게 알림으로 전달됩니다.';
  const hasSchedule = scheduled.length > 0;
  // 기본 변형은 유형을 고르기 전(2008:30734)·고른 뒤(2008:31040) 시안이 다르다. 예정 작업 변형(2008:31713)은 고른 뒤 모양.
  const detailed = hasSchedule || typeId !== null;

  const roleBox = (
    <div className={styles.roleBox}>
      <div className={styles.roleFrom}>
        <span className={styles.roleLabel}>현재 역할</span>
        <span className={styles.roleValue}>{fromLabel}</span>
      </div>
      <Icon name="arrow-right" size={24} color="var(--color-gray-500)" className={styles.roleArrow} />
      <div className={styles.roleTo}>
        <span className={styles.roleLabel}>변경 역할</span>
        <span className={clsx(styles.roleValue, styles.roleValueNew)}>{toLabel}</span>
      </div>
    </div>
  );

  const typeField = (
    <Field label={typeLabel} labelStyle="title" htmlFor="role-change-type">
      <ListSelect
        id="role-change-type"
        variant="roleType"
        value={typeId}
        options={options}
        onChange={setTypeId}
        placeholder="유형 선택"
      />
    </Field>
  );

  const info = detailed ? (
    <ul className={clsx(styles.info, styles.infoList)}>
      <li>{`${gain} ${release}`}</li>
      <li>{notified}</li>
    </ul>
  ) : (
    <p className={clsx(styles.info, styles.infoSingle)}>{`${gain}\n${release}`}</p>
  );

  return (
    <Dialog
      className={dialogStyles.dialog}
      open
      onClose={onClose}
      title="역할을 변경할까요?"
      description={hasSchedule ? `변경하면 예정 작업 ${scheduled.length}건의 배정이 해제돼 대기함으로 이동해요.` : undefined}
      descriptionTone="muted"
      headerGap={12}
      actions={
        <>
          <Button variant={detailed ? 'secondary' : 'ghost'} style={{ width: 97 }} onClick={onClose}>
            취소
          </Button>
          <Button style={{ width: 129 }} onClick={() => onConfirm(typeId)}>
            역할 변경
          </Button>
        </>
      }
    >
      {hasSchedule ? (
        <div className={styles.stack}>
          <div className={styles.schedule}>
            <div className={styles.scheduleHead}>
              <Icon name="error-fill" size={28} color="var(--color-in-progress-5)" />
              <p>
                <strong>{`예정된 작업 ${scheduled.length}건`}</strong>
                {'\n변경하면 배정이 풀려 대기함으로 돌아가요.'}
              </p>
            </div>
            {scheduled.map((task) => (
              <div key={task.id} className={styles.scheduleTask}>
                <p className={styles.scheduleTitle}>{task.title}</p>
                <p className={styles.scheduleTime}>{taskTime(task, '/')}</p>
              </div>
            ))}
          </div>
          {roleBox}
          <div className={styles.group}>
            {typeField}
            {info}
          </div>
        </div>
      ) : (
        <div className={styles.stack}>
          {roleBox}
          {typeField}
          {info}
        </div>
      )}
    </Dialog>
  );
}
