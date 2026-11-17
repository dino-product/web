import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Logo } from '@/design-system';

import glowImage from './assets/landing/glow.svg';
import BoardDemo from './landing/BoardDemo';
import MembersDemo from './landing/MembersDemo';
import TimetableDemo from './landing/TimetableDemo';
import { useRevealed } from './landing/useRevealed';
import styles from './LandingPage.module.css';

interface FeatureProps {
  id: string;
  /** 위치(Figma 좌표) */
  className: string;
  title: string;
  children: ReactNode;
}

/** 기능 소개 글(제목 + 설명). 화면에 처음 들어올 때 아래에서 떠오른다 */
function Feature({ id, className, title, children }: FeatureProps) {
  const [ref, revealed] = useRevealed<HTMLElement>();
  return (
    <section
      ref={ref}
      className={clsx(styles.feature, className, revealed && styles.featureRevealed)}
      aria-labelledby={id}
    >
      <h2 id={id} className={styles.featureTitle}>
        {title}
      </h2>
      <p className={styles.featureText}>{children}</p>
    </section>
  );
}

/**
 * 마케팅 랜딩(Figma 1946:16500, 1920×3908 긴 스크롤 — PublicLayout 내부 스크롤).
 * 상단 오른쪽 '로그인 하기'·'Orbit 열기'(1951:17621)는 로그인 화면으로 보낸다. 이미 로그인했으면 로그인 화면이 앱으로 넘긴다.
 * 기능 소개 자리에는 Figma의 화면 이미지 대신 같은 위치에 서비스 시연(landing/*Demo — 실제 화면 치수·DS 컴포넌트로 그린
 * 반복 재생 장면)을 둔다. 글자와 배치 좌표는 Figma 그대로다.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate('/login');

  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <img src={glowImage} alt="" className={styles.glow} />

        <h1 className={styles.headline}>현장을 위한 스마트한 업무 관리 플랫폼</h1>
        <p className={styles.lead}>담당 기사 배치부터 작업 완료까지, 전화 없이 한눈에 관리하세요</p>

        <Feature id="landing-feature-1" className={styles.feature1} title="01 일정과 작업을 한눈에">
          타임테이블과 작업 목록으로
          <br />
          오늘의 일정과 담당 작업을 빠르게 확인하세요.
        </Feature>
        <TimetableDemo className={styles.timetableDemo} />

        <Feature id="landing-feature-2" className={styles.feature2} title="02 진행 상황을 실시간으로">
          대기부터 진행, 완료까지
          <br />
          현장 작업의 상태를 한눈에 파악하세요.
        </Feature>
        <BoardDemo className={styles.boardDemo} />

        <Feature id="landing-feature-3" className={styles.feature3} title="03 우리 조직에 맞게 관리">
          직원 유형과 권한을 설정하고
          <br />
          팀의 업무 환경을 효율적으로 관리하세요.
        </Feature>
        <MembersDemo className={styles.membersDemo} />
      </div>

      <Logo variant="lockup" color="var(--color-gray-0)" className={styles.logo} />

      <nav className={styles.nav} aria-label="시작하기">
        <button type="button" className={clsx('t-body-m-medium', styles.loginLink)} onClick={goLogin}>
          로그인 하기
        </button>
        <button type="button" className={clsx('t-body-m-semibold', styles.openButton)} onClick={goLogin}>
          Orbit 열기
        </button>
      </nav>
    </div>
  );
}
