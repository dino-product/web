import clsx from 'clsx';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Icon, Logo } from '@/design-system';
import { useAppStore } from '@/mocks/store';

import styles from './LoginPage.module.css';
import TermsAgreementDialog from './TermsAgreementDialog';

/** RequireAuth가 담아 둔 원래 경로(location.state.from). 없으면 타임테이블 */
function redirectTarget(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('/login') ? from : '/timetable';
}

interface HelpBoxProps {
  title: string;
  description: string;
  linkLabel: string;
}

/**
 * 로그인 카드 아래 안내 상자(Help/처음 이용하시나요? 2423:12784, Help/소속 발주사가 없는 경우 2423:12789).
 * 밑줄 문구는 목적지 시안이 없어 동작하지 않는 글자로 둔다.
 */
function HelpBox({ title, description, linkLabel }: HelpBoxProps) {
  return (
    <div className={styles.helpBox}>
      <div className={styles.helpText}>
        <p className={styles.helpTitle}>{title}</p>
        <p className={styles.helpDescription}>{description}</p>
      </div>
      <span className={styles.helpLink}>{linkLabel}</span>
    </div>
  );
}

/**
 * 로그인(최신 시안 Figma 2423:12739). 배경은 Figma 메시 그라데이션(ShaderFill)을 같은 수식으로 그린 이미지다.
 * - 카카오 로그인(목업): 기존 사용자 → 원래 경로 또는 /timetable.
 *   첫 사용자(?user=new) → 약관 미동의면 약관 동의 모달(1453:7505), 이미 동의했으면 /onboarding/profile.
 * - '이용약관'·'개인정보처리방침'·'프로필 입력 안내 보기'·'소속 없는 계정 안내'는 목적지 시안이 없어 동작하지 않는다.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [termsOpen, setTermsOpen] = useState(false);

  const handleKakaoLogin = () => {
    const { needsOnboarding } = useAppStore.getState().loginWithKakao();
    if (!needsOnboarding) {
      navigate(redirectTarget(location.state), { replace: true });
      return;
    }
    if (useAppStore.getState().session.termsAgreed) navigate('/onboarding/profile');
    else setTermsOpen(true);
  };

  const handleAgree = (marketingAgreed: boolean) => {
    useAppStore.getState().agreeTerms(marketingAgreed);
    setTermsOpen(false);
    navigate('/onboarding/profile');
  };

  return (
    <main className={styles.page}>
      <Logo variant="lockup" color="var(--color-primary)" className={styles.logo} />

      <div className={styles.hero}>
        <div className={styles.heroMark}>
          <Logo variant="hero" color="var(--color-primary)" className={styles.heroLogo} />
        </div>
        <p className={clsx('t-body-xl-medium', styles.heroCaption)}>현장을 위한 스마트한 업무 관리 플랫폼</p>
      </div>

      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.loginBlock}>
          <div className={styles.heading}>
            <h1 id="login-title" className={clsx('t-title-m', styles.title)}>
              로그인
            </h1>
            <p className={clsx('t-body-m-medium', styles.subtitle)}>카카오 계정으로 간편하게 시작하세요.</p>
          </div>
          <div className={styles.kakaoBlock}>
            <button type="button" className={styles.kakaoButton} onClick={handleKakaoLogin}>
              <Icon name="kakao" size={22} color="#000000" />
              <span className={styles.kakaoLabel}>카카오 로그인</span>
            </button>
            <p className={clsx('t-body-xs-medium', styles.notice)}>
              로그인하면 <span className={styles.noticeStrong}>이용약관</span> 및{' '}
              <span className={styles.noticeStrong}>개인정보처리방침</span>에 동의하게 됩니다.
            </p>
          </div>
        </div>

        <div className={styles.helpList}>
          <HelpBox
            title="처음 이용하시나요?"
            description="카카오 로그인 후 이름 · 연락처를 입력하면 바로 시작할 수 있습니다."
            linkLabel="프로필 입력 안내 보기"
          />
          <HelpBox
            title="소속 발주사가 없는 경우"
            description="회사 관리자에게 회사 코드나 참여 링크 · QR을 받아 참여를 요청하세요."
            linkLabel="소속 없는 계정 안내"
          />
        </div>
      </section>

      {termsOpen && (
        <TermsAgreementDialog open onClose={() => setTermsOpen(false)} onAgree={handleAgree} />
      )}
    </main>
  );
}
