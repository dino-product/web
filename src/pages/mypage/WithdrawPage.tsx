import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Checkbox, Dialog, Icon, TextArea } from '@/design-system';
import { useOwnedMemberships } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import { COMPANY_ROLE_LABEL, type CompanyMembership } from '@/mocks/types';

import styles from './WithdrawPage.module.css';

/**
 * 계정 탈퇴(/mypage/withdraw).
 * - 총관리자인 발주사가 있으면 탈퇴 불가 화면(921:3702)
 * - 그 밖(직원, ?role=staff)은 동의 전(1230:5227)·동의 후(1325:8866) → 탈퇴 확인 모달(2277:12258) → withdrawAccount → /login
 */
export default function WithdrawPage() {
  const ownedMemberships = useOwnedMemberships();
  return (
    <div className={styles.page}>
      <h1 className={`t-title-s ${styles.title}`}>계정 탈퇴</h1>
      {ownedMemberships.length > 0 ? <WithdrawBlocked memberships={ownedMemberships} /> : <WithdrawForm />}
    </div>
  );
}

const SOLUTIONS = [
  '조직 설정에서 다른 직원을 총 관리자로 지정합니다.',
  '기존 총 관리자 권한을 해제합니다.',
  '마이페이지에서 다시 탈퇴를 진행할 수 있습니다.',
];

/** 921:3702 — 총관리자는 탈퇴할 수 없다. 사유(총관리자인 발주사)와 해결 방법을 보여 준다. */
function WithdrawBlocked({ memberships }: { memberships: CompanyMembership[] }) {
  const navigate = useNavigate();
  return (
    <div className={`${styles.card} ${styles.blockedCard}`}>
      <div className={styles.banner}>
        <Icon name="x-circle-fill" size={30} color="#f00013" />
        <p className="t-body-xl-bold">현재 계정은 탈퇴할 수 없습니다.</p>
      </div>
      <div className={styles.blockedBody}>
        <div className={styles.blockedSections}>
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
          <section className={styles.solutionSection}>
            <h2 className="t-body-m-semibold">해결 방법</h2>
            <ol className={styles.list}>
              {SOLUTIONS.map((text, index) => (
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
          <Button className={styles.actionButton} onClick={() => navigate('/org/members')}>
            조직 설정으로
          </Button>
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

  const handleWithdraw = () => {
    withdrawAccount(reason.trim());
    navigate('/login', { replace: true });
  };

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
            <Button variant="danger" style={{ width: 120 }} onClick={handleWithdraw}>
              탈퇴
            </Button>
          </>
        }
      />
    </div>
  );
}
