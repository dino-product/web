import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

import { Logo } from '@/design-system';

import boardSummaryImage from './assets/landing/board-summary.png';
import boardTableImage from './assets/landing/board-table.png';
import glowImage from './assets/landing/glow.svg';
import membersLeftImage from './assets/landing/members-left.png';
import membersRightImage from './assets/landing/members-right.png';
import timetableImage from './assets/landing/timetable.png';
import styles from './LandingPage.module.css';

/**
 * 마케팅 랜딩(Figma 1946:16500, 1920×3908 긴 스크롤 — PublicLayout 내부 스크롤).
 * 상단 오른쪽 '로그인 하기'·'Orbit 열기'(1951:17621)는 로그인 화면으로 보낸다.
 * 기능 소개 이미지는 Figma 이미지 채움을 그대로 내려받아 같은 자르기 비율로 배치한다.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate('/login');

  return (
    <div className={styles.page}>
      <img src={glowImage} alt="" className={styles.glow} />

      <Logo variant="lockup" color="var(--color-gray-0)" className={styles.logo} />

      <nav className={styles.nav} aria-label="시작하기">
        <button type="button" className={clsx('t-body-m-medium', styles.loginLink)} onClick={goLogin}>
          로그인 하기
        </button>
        <button type="button" className={clsx('t-body-m-semibold', styles.openButton)} onClick={goLogin}>
          Orbit 열기
        </button>
      </nav>

      <h1 className={styles.headline}>현장을 위한 스마트한 업무 관리 플랫폼</h1>
      <p className={styles.lead}>담당 기사 배치부터 작업 완료까지, 전화 없이 한눈에 관리하세요</p>

      <section className={clsx(styles.feature, styles.feature1)} aria-labelledby="landing-feature-1">
        <h2 id="landing-feature-1" className={styles.featureTitle}>
          01 일정과 작업을 한눈에
        </h2>
        <p className={styles.featureText}>
          타임테이블과 작업 목록으로
          <br />
          오늘의 일정과 담당 작업을 빠르게 확인하세요.
        </p>
      </section>
      <div className={clsx(styles.shot, styles.timetableShot)}>
        <img src={timetableImage} alt="타임테이블 화면" />
      </div>

      <section className={clsx(styles.feature, styles.feature2)} aria-labelledby="landing-feature-2">
        <h2 id="landing-feature-2" className={styles.featureTitle}>
          02 진행 상황을 실시간으로
        </h2>
        <p className={styles.featureText}>
          대기부터 진행, 완료까지
          <br />
          현장 작업의 상태를 한눈에 파악하세요.
        </p>
      </section>
      <img src={boardSummaryImage} alt="진행 보드 요약" className={styles.boardSummary} />
      <img src={boardTableImage} alt="작업 상태 목록" className={styles.boardTable} />

      <section className={clsx(styles.feature, styles.feature3)} aria-labelledby="landing-feature-3">
        <h2 id="landing-feature-3" className={styles.featureTitle}>
          03 우리 조직에 맞게 관리
        </h2>
        <p className={styles.featureText}>
          직원 유형과 권한을 설정하고
          <br />
          팀의 업무 환경을 효율적으로 관리하세요.
        </p>
      </section>
      <div className={clsx(styles.shot, styles.membersLeftShot)}>
        <img src={membersLeftImage} alt="인력관리 화면" />
      </div>
      <div className={clsx(styles.shot, styles.membersRightShot)}>
        <img src={membersRightImage} alt="" />
      </div>
    </div>
  );
}
