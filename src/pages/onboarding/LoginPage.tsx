import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useMatch, useNavigate } from 'react-router-dom';

import { Icon, Logo } from '@/design-system';
import { KAKAO_CALLBACK_PATH, useAppStore } from '@/data/store';

import styles from './LoginPage.module.css';
import TermsAgreementDialog from './TermsAgreementDialog';

/** 로그인 뒤 갈 경로. RequireAuth가 담아 둔 원래 경로(location.state.from, 같은 출처 경로만)가 없으면 타임테이블 */
function redirectTarget(from: unknown): string {
  return typeof from === 'string' && /^\/(?![/\\])\S*$/.test(from) && !from.startsWith('/login') ? from : '/timetable';
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
 * - 카카오 로그인: 서버 authorize → 카카오 로그인 → 서버 callback → 복귀 주소 /login/kakao?code=…(이 화면)에서 교환한다.
 *   가입을 마친 계정 → 원래 경로 또는 /timetable. 가입 전 계정 → /login 위 약관 동의 모달(1453:7505).
 *   실패·취소(?error=…)는 오류 안내 시안이 없어 원래 경로를 유지한 채 /login으로 돌아온다(오류 코드는 콘솔).
 * - '이용약관'·'개인정보처리방침'·'프로필 입력 안내 보기'·'소속 없는 계정 안내'는 목적지 시안이 없어 동작하지 않는다.
 * - 이미 로그인한 상태로 들어오면 원래 경로 또는 /timetable로 바로 보낸다.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isKakaoCallback = useMatch(KAKAO_CALLBACK_PATH) !== null;
  const [termsOpen, setTermsOpen] = useState(false);
  const loggedIn = useAppStore((s) => s.session.loggedIn);

  // 카카오 복귀를 처리한 뒤 주소에서 일회성 교환 코드를 지운다. 약관 동의 모달은 같은 화면(/login)에 띄운다.
  useEffect(() => {
    if (!isKakaoCallback) return;
    const params = new URLSearchParams(location.search);
    let cancelled = false;
    void useAppStore
      .getState()
      .completeKakaoLogin({ code: params.get('code'), error: params.get('error') })
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'loggedIn') {
          navigate(redirectTarget(result.returnTo), { replace: true });
          return;
        }
        const from = result.status === 'failed' && result.returnTo ? { from: result.returnTo } : null;
        navigate('/login', { replace: true, state: from });
        if (result.status === 'onboarding') setTermsOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isKakaoCallback, location.search, navigate]);

  const handleKakaoLogin = () => {
    void useAppStore.getState().startKakaoLogin(redirectTarget((location.state as { from?: unknown } | null)?.from));
  };

  const handleAgree = (marketingAgreed: boolean) => {
    useAppStore.getState().agreeTerms(marketingAgreed);
    setTermsOpen(false);
    navigate('/onboarding/profile');
  };

  // 이미 로그인한 사용자(랜딩 'Orbit 열기'·'로그인 하기', 주소 직접 입력)는 로그인 화면 대신 앱으로 보낸다.
  // 카카오 복귀 주소는 위 교환 처리가 이동을 맡는다.
  if (loggedIn && !isKakaoCallback) {
    return <Navigate to={redirectTarget((location.state as { from?: unknown } | null)?.from)} replace />;
  }

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
