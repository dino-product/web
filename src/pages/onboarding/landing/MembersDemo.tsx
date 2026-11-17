import clsx from 'clsx';

import { Button, CompactSelect, Icon, MemberStatusChip, Menu, MenuItem } from '@/design-system';
import { MEMBER_KIND_LABEL, type MemberKind, type MemberStatus } from '@/data/types';

import { DemoDialog, DemoSelectBox } from './DemoDialog';
import DemoStage, { DemoCallout, type DemoStep } from './DemoStage';
import styles from './MembersDemo.module.css';

/** 장면 너비: 인력관리 표 1547 + 좌우 여백 28 */
const CANVAS_WIDTH = 1603;
const NO_TYPE_LABEL = '유형 없음';
const KINDS: MemberKind[] = ['EMPLOYEE', 'TECHNICIAN'];
const TECHNICIAN_TYPES = [NO_TYPE_LABEL, '일반 기사', '전문 기사'];

interface MemberRow {
  name: string;
  owner?: boolean;
  kind: MemberKind;
  type: string;
  status: MemberStatus;
  joined: string;
}

const MEMBERS: MemberRow[] = [
  { name: '박서준', owner: true, kind: 'EMPLOYEE', type: '관리자', status: 'ACTIVE', joined: '2026-02-28' },
  { name: '김하린', kind: 'EMPLOYEE', type: '배정 담당', status: 'ACTIVE', joined: '2026-03-04' },
  { name: '오지호', kind: 'EMPLOYEE', type: '배정 담당', status: 'ACTIVE', joined: '2026-03-11' },
  { name: '김민수', kind: 'TECHNICIAN', type: '전문 기사', status: 'ACTIVE', joined: '2026-03-11' },
  { name: '이서연', kind: 'TECHNICIAN', type: '일반 기사', status: 'ACTIVE', joined: '2026-04-02' },
  { name: '한지우', kind: 'TECHNICIAN', type: '일반 기사', status: 'INACTIVE', joined: '2026-04-20' },
];
/** 역할을 바꾸는 행(오지호: 직원 → 기사 · 전문 기사) */
const TARGET = 2;
const NEW_TYPE = '전문 기사';

const PHASES = ['직원유형 선택', '역할 변경 확인', '세부 유형 지정'];

/** 단계 번호. 장면 상태는 '몇 단계 이상인가'로 정한다 */
const STEP = { kindOpen: 2, kindHover: 3, dialog: 4, changed: 6, typeOpen: 8, typeHover: 9, typed: 10 } as const;

const FULL = { x: CANVAS_WIDTH / 2, y: 326, zoom: 1 };
const TABLE = { x: 500, y: 300, zoom: 1.25 };
const STEPS: DemoStep[] = [
  { duration: 900, phase: 0, cursor: { x: 760, y: 470, hidden: true }, camera: FULL },
  { duration: 900, phase: 0, cursor: { x: 287, y: 273 }, camera: TABLE },
  { duration: 700, phase: 0, cursor: { x: 287, y: 273, click: true } },
  { duration: 800, phase: 0, cursor: { x: 287, y: 391, move: 500 } },
  { duration: 900, phase: 1, cursor: { x: 287, y: 391, click: true }, camera: { x: 801, y: 326, zoom: 1.12 } },
  { duration: 1100, phase: 1, cursor: { x: 994, y: 527, move: 800 } },
  { duration: 1500, phase: 1, cursor: { x: 994, y: 527, click: true }, camera: TABLE },
  { duration: 1000, phase: 2, cursor: { x: 503, y: 273 } },
  { duration: 700, phase: 2, cursor: { x: 503, y: 273, click: true } },
  { duration: 800, phase: 2, cursor: { x: 503, y: 441, move: 500 } },
  { duration: 1000, phase: 2, cursor: { x: 503, y: 441, click: true } },
  { duration: 1700, phase: 2, cursor: { x: 760, y: 470, hidden: true }, camera: FULL },
];

const noop = () => undefined;

/**
 * 인력관리 시연(시안 없음): 표에서 직원유형을 기사로 바꾸면 역할 변경 확인 창이 뜨고, 확정한 뒤 세부 유형을 지정한다.
 * 표 치수는 인력관리(1951:22495) 그대로이고 선택 상자·목록·상태 칩은 DS 컴포넌트다. 문구는 RoleChangeDialog와 같다.
 */
export default function MembersDemo({ className }: { className?: string }) {
  return (
    <DemoStage
      className={className}
      width={1070}
      height={435}
      canvasWidth={CANVAS_WIDTH}
      label="인력관리 시연: 표에서 직원을 기사로 바꾸고 역할 변경을 확인한 뒤 세부 유형을 지정합니다."
      phases={PHASES}
      steps={STEPS}
      restStep={STEPS.length - 1}
    >
      {(step) => {
        const changed = step >= STEP.changed;
        const typed = step >= STEP.typed;
        const kindOpen = step === STEP.kindOpen || step === STEP.kindHover;
        const typeOpen = step === STEP.typeOpen || step === STEP.typeHover;
        const target = MEMBERS[TARGET];
        const targetType = typed ? NEW_TYPE : changed ? NO_TYPE_LABEL : target.type;

        return (
          <div className={styles.scene}>
            <div className={styles.table}>
              <div className={styles.head}>
                <span style={{ left: 36 }}>이름</span>
                <span style={{ left: 200 }}>직원유형</span>
                <span style={{ left: 375 }}>세부 유형</span>
                <span style={{ left: 1061.5 }}>상태</span>
                <span style={{ left: 1216 }}>참여일</span>
                <span style={{ left: 1391 }}>관리</span>
              </div>
              {MEMBERS.map((member, index) => {
                const isTarget = index === TARGET;
                const kind = isTarget && changed ? 'TECHNICIAN' : member.kind;
                const type = isTarget ? targetType : member.type;
                return (
                  <div key={member.name} className={styles.row}>
                    {isTarget && changed && <span key={typed ? 'typed' : 'changed'} className={styles.rowFlash} />}
                    <span className={styles.name}>
                      <span className={styles.nameText}>{member.name}</span>
                      {member.owner && (
                        <span className={styles.crown}>
                          <Icon name="crown" color="var(--color-secondary)" />
                        </span>
                      )}
                    </span>
                    <span className={styles.kind}>
                      <CompactSelect
                        value={kind}
                        options={KINDS.map((value) => ({ value, label: MEMBER_KIND_LABEL[value] }))}
                        onChange={noop}
                        readOnly={member.owner}
                        className={clsx(isTarget && kindOpen && styles.selectOpen)}
                      />
                    </span>
                    <span className={styles.subtype}>
                      <CompactSelect
                        value={type}
                        options={[{ value: type, label: type }]}
                        onChange={noop}
                        readOnly={member.owner || member.status === 'INACTIVE'}
                        width={200}
                        className={clsx(isTarget && typeOpen && styles.selectOpen)}
                      />
                    </span>
                    <span className={styles.status}>
                      <MemberStatusChip status={member.status} />
                    </span>
                    <span className={styles.text} style={{ left: 1217 }}>
                      {member.joined}
                    </span>
                    <span className={styles.manage}>
                      <Icon name="external-link" size={24} color="var(--color-gray-900)" />
                      상세보기
                    </span>
                  </div>
                );
              })}
            </div>
            <p className={styles.notice}>
              <Icon name="info-circle" size={24} color="var(--color-gray-500)" />
              다른 역할을 고르면 즉시 저장하지 않고 역할 변경 확인 창을 띄웁니다.
            </p>

            {kindOpen && (
              <Menu role="listbox" className={styles.menu} style={{ left: 228, width: 118 }}>
                {KINDS.map((value) => (
                  <MenuItem key={value} selected={step === STEP.kindHover && value === 'TECHNICIAN'}>
                    {MEMBER_KIND_LABEL[value]}
                  </MenuItem>
                ))}
              </Menu>
            )}
            {typeOpen && (
              <Menu role="listbox" className={styles.menu} style={{ left: 403, width: 200 }}>
                {TECHNICIAN_TYPES.map((type) => (
                  <MenuItem key={type} selected={step === STEP.typeHover ? type === NEW_TYPE : type === NO_TYPE_LABEL}>
                    {type}
                  </MenuItem>
                ))}
              </Menu>
            )}

            {step === STEP.changed && (
              <DemoCallout x={640} y={253} color="var(--color-primary-100)">
                {target.name} 님에게 변경 알림 전송
              </DemoCallout>
            )}

            {step >= STEP.dialog && !changed && (
              <DemoDialog
                title="역할을 변경할까요?"
                actions={
                  <>
                    <Button variant="ghost" style={{ width: 97 }}>
                      취소
                    </Button>
                    <Button style={{ width: 129 }}>역할 변경</Button>
                  </>
                }
              >
                <div className={styles.stack}>
                  <div className={styles.roleBox}>
                    <div className={styles.roleFrom}>
                      <span className={styles.roleLabel}>현재 역할</span>
                      <span className={styles.roleValue}>{MEMBER_KIND_LABEL.EMPLOYEE}</span>
                    </div>
                    <Icon name="arrow-right" size={24} color="var(--color-gray-500)" className={styles.roleArrow} />
                    <div className={styles.roleTo}>
                      <span className={styles.roleLabel}>변경 역할</span>
                      <span className={clsx(styles.roleValue, styles.roleValueNew)}>{MEMBER_KIND_LABEL.TECHNICIAN}</span>
                    </div>
                  </div>
                  <DemoSelectBox label="기사 유형" placeholder="유형 선택" />
                  <p className={styles.info}>
                    {`기사가 되면 작업을 배정받을 수 있습니다.\n직원 유형(${target.type})은 해제되고, 작업 등록·수정·배정 권한이 없어집니다.`}
                  </p>
                </div>
              </DemoDialog>
            )}
          </div>
        );
      }}
    </DemoStage>
  );
}
