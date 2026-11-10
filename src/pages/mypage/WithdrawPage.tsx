import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Checkbox, Dialog, Icon, TextArea } from '@/design-system';
import { useOwnedMemberships } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import { useWithdrawalEligibilitySync } from '@/data/sync';
import { COMPANY_ROLE_LABEL, type CompanyMembership, TASK_STATUS_LABEL } from '@/data/types';
import { useSingleFlight } from '@/lib/useSingleFlight';

import styles from './WithdrawPage.module.css';

/**
 * 계정 탈퇴(/mypage/withdraw).
 * - 탈퇴를 막는 사유가 있으면 탈퇴 불가 화면(921:3702). 사유는 둘이다.
 *   - 총관리자: 총관리자인 발주사가 있거나 서버가 '유일한 총관리자'(SOLE_OWNER)라고 한다.
 *     서버는 아직 총관리자 탈퇴 차단을 판정하지 않으므로(organization HM-319 예정) 화면 규칙(총관리자 소속)도 함께 본다.
 *   - 기사 작업: 기사로 소속된 발주사에 작업중·배정됨 작업이 남아 있다(WORK_IN_PROGRESS·WORK_PENDING_ACCEPT).
 *     시안은 총관리자 사유만 있어 같은 화면에 사유·해결 방법 문구만 바꿔 보여 준다.
 * - 그 밖(직원)은 동의 전(1230:5227)·동의 후(1325:8866) → 탈퇴 확인 모달(2277:12258) → withdrawAccount → /login
 */
export default function WithdrawPage() {
  useWithdrawalEligibilitySync();
  const ownedMemberships = useOwnedMemberships();
  const eligibility = useAppStore((s) => s.withdrawalEligibility);
  const ownerBlocked = !!eligibility && (eligibility.soleOwner || ownedMemberships.length > 0);
  const workBlocks: WorkBlock[] = eligibility
    ? [
        {
          label: TASK_STATUS_LABEL.IN_PROGRESS,
          count: eligibility.inProgressWorks,
          solution: '작업중인 작업은 기사 앱에서 완료 보고를 마칩니다.',
        },
        {
          label: TASK_STATUS_LABEL.PENDING_ACCEPT,
          count: eligibility.pendingAcceptWorks,
          solution: '배정됨 작업은 기사 앱에서 수락하거나 거절합니다.',
        },
      ].filter((block) => block.count > 0)
    : [];
  return (
    <div className={styles.page}>
      <h1 className={`t-title-s ${styles.title}`}>계정 탈퇴</h1>
      {eligibility &&
        (ownerBlocked || workBlocks.length > 0 ? (
          <WithdrawBlocked memberships={ownedMemberships} ownerBlocked={ownerBlocked} workBlocks={workBlocks} />
        ) : (
          <WithdrawForm />
        ))}
    </div>
  );
}

/** 기사로 맡아 탈퇴를 막는 작업(상태별 건수와 해결 방법) */
interface WorkBlock {
  label: string;
  count: number;
  solution: string;
}

const OWNER_SOLUTIONS = ['조직 설정에서 다른 직원을 총 관리자로 지정합니다.', '기존 총 관리자 권한을 해제합니다.'];
const RETRY_SOLUTION = '마이페이지에서 다시 탈퇴를 진행할 수 있습니다.';

/** 921:3702 — 탈퇴할 수 없는 사유(총관리자인 발주사·기사로 남은 작업)와 해결 방법을 보여 준다. */
function WithdrawBlocked({
  memberships,
  ownerBlocked,
  workBlocks,
}: {
  memberships: CompanyMembership[];
  ownerBlocked: boolean;
  workBlocks: WorkBlock[];
}) {
  const navigate = useNavigate();
  // 조직 설정은 총관리자 전용(RequireOwner)이라, 지금 발주사에서 직원이면 총관리자인 발주사로 바꾼 뒤 연다.
  const goToOrgSettings = () => {
    const { session, switchCompany } = useAppStore.getState();
    if (memberships.length && !memberships.some((m) => m.companyId === session.currentCompanyId)) {
      switchCompany(memberships[0].companyId);
    }
    navigate('/org/members');
  };
  const solutions = [
    ...(ownerBlocked ? OWNER_SOLUTIONS : []),
    ...workBlocks.map((block) => block.solution),
    RETRY_SOLUTION,
  ];
  return (
    <div className={`${styles.card} ${styles.blockedCard}`}>
      <div className={styles.banner}>
        <Icon name="x-circle-fill" size={30} color="#f00013" />
        <p className="t-body-xl-bold">현재 계정은 탈퇴할 수 없습니다.</p>
      </div>
      <div className={styles.blockedBody}>
        <div className={styles.blockedSections}>
          {ownerBlocked && (
            <section className={styles.reasonSection}>
              <div className={styles.reasonHead}>
                <h2 className="t-body-m-semibold">탈퇴 불가 사유</h2>
                <p className={`t-body-xs-medium ${styles.muted}`}>다음 조직에서 유일한 총관리자로 등록되어 있습니다.</p>
              </div>
              <ul className={styles.list}>
                {memberships.map((membership) => (
                  <li key={membership.companyId} className={styles.companyRow}>
                    <span className="t-body-s-medium">{membership.companyName}</span>
                    <span className={`t-body-s-medium ${styles.roleChip}`}>{COMPANY_ROLE_LABEL[membership.role]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {workBlocks.length > 0 && (
            <section className={styles.reasonSection}>
              <div className={styles.reasonHead}>
                <h2 className="t-body-m-semibold">탈퇴 불가 사유</h2>
                <p className={`t-body-xs-medium ${styles.muted}`}>기사로 맡은 작업이 남아 있습니다.</p>
              </div>
              <ul className={styles.list}>
                {workBlocks.map((block) => (
                  <li key={block.label} className={styles.companyRow}>
                    <span className="t-body-s-medium">{block.label}</span>
                    <span className={`t-body-s-medium ${styles.roleChip}`}>{block.count}건</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={styles.solutionSection}>
            <h2 className="t-body-m-semibold">해결 방법</h2>
            <ol className={styles.list}>
              {solutions.map((text, index) => (
                <li key={text} className={styles.solutionRow}>
                  <span className={`t-caption-m-medium ${styles.stepNumber}`}>{index + 1}</span>
                  <span className="t-body-s-medium">{text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" className={`${styles.actionButton} ${styles.ghostButton}`} onClick={() => navigate('/mypage')}>
            마이페이지로
          </Button>
          {ownerBlocked && (
            <Button className={styles.actionButton} onClick={goToOrgSettings}>
              조직 설정으로
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const RESULTS = ['모든 발주사 소속이 해제됩니다', '로그인할 수 없습니다', '복구할 수 없습니다'];

/** 1230:5227(동의 전) · 1325:8866(동의 후) — 동의해야 '탈퇴'가 켜진다. */
function WithdrawForm() {
  const navigate = useNavigate();
  const withdrawAccount = useAppStore((s) => s.withdrawAccount);
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawing, withdrawOnce] = useSingleFlight();

  const handleWithdraw = () =>
    withdrawOnce(async () => {
      // 실패하면 확인 모달을 닫고 이 화면에 남는다. 화면을 연 뒤 막는 사유가 생겼으면(PROFILE-006)
      // 탈퇴 가능 여부를 다시 읽어 탈퇴 불가 화면으로 바뀐다. 오류 코드는 콘솔에 남는다.
      if (await withdrawAccount(reason.trim())) navigate('/login', { replace: true });
      else {
        setConfirmOpen(false);
        void useAppStore.getState().loadWithdrawalEligibility();
      }
    });

  return (
    <div className={`${styles.card} ${styles.formCard}`}>
      <div className={styles.intro}>
        <h2 className={`t-body-xxl-bold ${styles.strong}`}>탈퇴하시겠어요?</h2>
        <p className={`t-body-m-medium ${styles.muted}`}>계정을 탈퇴하시면 다음과 같은 결과가 발생합니다.</p>
      </div>
      <div className={styles.formBody}>
        <div className={styles.formFields}>
          <ul className={styles.results}>
            {RESULTS.map((text) => (
              <li key={text} className="t-body-s-medium">
                {text}
              </li>
            ))}
          </ul>
          <div className={styles.reasonField}>
            <div className={styles.reasonFieldHead}>
              <label htmlFor="withdraw-reason" className={`t-body-m-semibold ${styles.strong}`}>
                탈퇴 사유 <span className={`t-body-xs-medium ${styles.optional}`}>(선택사항)</span>
              </label>
              <p className={`t-body-xs-medium ${styles.muted}`}>더 나은 서비스를 제공할 수 있도록 탈퇴 사유를 알려주세요.</p>
            </div>
            <TextArea
              id="withdraw-reason"
              className={styles.reasonInput}
              height={191}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <Checkbox
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            uncheckedIcon="check"
            color="var(--color-gray-900)"
            label="위 내용을 확인했으며 탈퇴에 동의합니다."
            labelClassName={`t-body-xs-regular ${styles.strong}`}
          />
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            className={`${styles.actionButton} ${styles.ghostButton} ${styles.cancelButton}`}
            onClick={() => navigate('/mypage')}
          >
            취소
          </Button>
          <Button variant="danger" className={styles.actionButton} disabled={!agreed} onClick={() => setConfirmOpen(true)}>
            탈퇴
          </Button>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        className={styles.confirmDialog}
        title="계정 탈퇴 확인"
        descriptionTone="regular"
        description={'탈퇴 시 활동 기록은 삭제되지 않고 개인정보만 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.'}
        actions={
          <>
            <Button variant="secondary" className={styles.dialogCancel} onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="danger" style={{ width: 120 }} disabled={withdrawing} onClick={handleWithdraw}>
              탈퇴
            </Button>
          </>
        }
      />
    </div>
  );
}
