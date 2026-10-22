import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '@/data/store';

import badgeDot from './assets/badge-dot.svg';
import workerIllustration from './assets/worker-illustration.png';
import { OnboardingStep } from './OnboardingStep';
import styles from './TypesStep.module.css';

const TYPE_SAMPLES = [
  { title: '직원', example: '예: 현장담당, 사무지원 등' },
  { title: '기사', example: '예: 설치기사, A/S기사 등' },
  { title: '작업', example: '예: 설치, 점검, 수리 등' },
] as const;

/**
 * 온보딩 3 유형 설정(Figma 1894:8760). 유형 상자 세 개는 안내용이라 누를 수 없다.
 * - '유형 설정' → finishOnboarding → 조직 설정 유형 설정(/org/types). 버튼 문구와 안내('조직 설정에서 … 수정')가 같은 화면을 가리킨다.
 * - '건너뛰기' → finishOnboarding → /timetable.
 */
export default function TypesStep() {
  const navigate = useNavigate();

  const finish = (to: string) => {
    useAppStore.getState().finishOnboarding();
    navigate(to);
  };

  return (
    <OnboardingStep
      step={3}
      title="유형 설정"
      subtitle="유형을 설정하면 업무 배치가 훨씬 빨라집니다"
      subtitleWeight="semibold"
      description={
        <>
          직원 · 기사 · 작업 유형은 타임테이블 색상 구분과 기사 그룹핑에 사용됩니다.
          <br />
          지금 간단히 만들어두면 배치 화면에서 바로 활용할 수 있습니다.
        </>
      }
      cardTop={231}
      introTop={130}
      secondaryLabel="건너뛰기"
      onSecondary={() => finish('/timetable')}
      primaryLabel="유형 설정"
      onSubmit={() => finish('/org/types')}
      secondaryWidth={55}
      primaryLabelWidth={58}
      illustration={
        <>
          <div className={styles.preview} aria-hidden>
            <div className={styles.previewInner}>
              <div className={styles.previewHead}>
                <span className={styles.previewBadge}>
                  <img src={badgeDot} alt="" />
                  설치
                </span>
                <span className={styles.previewRole}>A/S기사</span>
              </div>
              <div className={styles.previewBars}>
                <span />
                <span />
              </div>
            </div>
          </div>
          <img src={workerIllustration} alt="" className={styles.worker} />
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.list}>
          <p className={clsx('t-caption-m-medium', styles.label)}>설정할 유형</p>
          {TYPE_SAMPLES.map((type) => (
            <div key={type.title} className={styles.typeBox}>
              <div className={styles.typeText}>
                <p className={clsx('t-body-s-semibold', styles.typeTitle)}>{type.title}</p>
                <p className={clsx('t-body-xs-regular', styles.typeExample)}>{type.example}</p>
              </div>
            </div>
          ))}
        </div>
        <p className={clsx('t-caption-s-medium', styles.note)}>유형은 조직 설정에서 언제든 추가하거나 수정할 수 있습니다.</p>
      </div>
    </OnboardingStep>
  );
}
