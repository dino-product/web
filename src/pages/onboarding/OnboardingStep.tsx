import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

import { Icon } from '@/design-system';

import glowBottomImage from './assets/glow-bottom.svg';
import glowTopImage from './assets/glow-top.svg';
import styles from './OnboardingStep.module.css';

export interface OnboardingStepProps {
  /** 단계 번호(Frame 2147239402 배지) */
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  /** 부제 굵기 — 프로필 등록·발주사 생성 Medium, 유형 설정 SemiBold */
  subtitleWeight?: 'medium' | 'semibold';
  /** 부제 아래 설명(유형 설정 14/400 Gray600) */
  description?: ReactNode;
  /** 큰 카드(1026×619) 위쪽 좌표(1080 높이 기준). 프로필·발주사 230, 유형 설정 231 */
  cardTop: number;
  /** 왼쪽 블록(배지·제목) 위쪽 좌표(카드 기준). 프로필 202, 발주사 131, 유형 설정 130 */
  introTop: number;
  /** 왼쪽 아래 일러스트(카드 기준 절대 배치) */
  illustration?: ReactNode;
  /** 오른쪽 흰 카드 안 입력 영역((40,40), 380 너비) */
  children: ReactNode;
  /** 회색 글자 버튼('취소'·'건너뛰기') */
  secondaryLabel: string;
  onSecondary: () => void;
  /** 진한 알약 버튼('다음'·'생성'·'유형 설정'). 폼 제출(Enter 포함)과 같다 */
  primaryLabel: string;
  onSubmit: () => void;
  /**
   * Figma 글자 상자 너비(px) — 회색 버튼 글자, 알약 버튼 글자. 브라우저 글자 폭이 Figma보다 1px 남짓 좁아
   * 오른쪽 정렬된 버튼 줄이 밀리지 않도록 상자 너비를 시안 값으로 고정한다.
   */
  secondaryWidth: number;
  primaryLabelWidth: number;
}

/**
 * 온보딩 단계 화면 공통 틀(Figma 1453:12438·1453:14801·1894:8760).
 * 회색 바탕(#000 40% — 흰 바탕 위) 가운데 큰 카드(Background/3, radius 20)에 빛 번짐(Glow) 두 개,
 * 왼쪽 단계 배지·제목, 오른쪽 흰 폼 카드(460×511, radius 18, 그림자)와 아래 버튼 줄을 그린다.
 */
export function OnboardingStep({
  step,
  title,
  subtitle,
  subtitleWeight = 'medium',
  description,
  cardTop,
  introTop,
  illustration,
  children,
  secondaryLabel,
  onSecondary,
  primaryLabel,
  onSubmit,
  secondaryWidth,
  primaryLabelWidth,
}: OnboardingStepProps) {
  // Figma 제약: 카드가 화면 세로 가운데 기준(±0.5px)이라 1080이 아닌 높이에서도 가운데에 둔다.
  const cardStyle: CSSProperties = { top: `calc(50% - ${540 - cardTop}px)` };
  const titleId = `onboarding-step-${step}-title`;

  return (
    <main className={styles.page} aria-labelledby={titleId}>
      <div className={styles.card} style={cardStyle}>
        <img src={glowTopImage} alt="" className={styles.glowTop} />
        <img src={glowBottomImage} alt="" className={styles.glowBottom} />

        <div className={styles.intro} style={{ top: introTop }}>
          <div className={styles.badge}>
            <span className={styles.badgeNumber}>{step}</span>
          </div>
          <div className={styles.introText}>
            <div className={styles.heading}>
              <h1 id={titleId} className={clsx('t-title-m', styles.title)}>
                {title}
              </h1>
              <p
                className={clsx(
                  subtitleWeight === 'semibold' ? 't-body-s-semibold' : 't-body-s-medium',
                  styles.subtitle,
                )}
              >
                {subtitle}
              </p>
            </div>
            {description && <p className={styles.description}>{description}</p>}
          </div>
        </div>

        <form
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className={styles.formBody}>{children}</div>
          <div className={styles.actions}>
            <button
              type="button"
              className={clsx('t-body-xs-medium', styles.secondaryButton)}
              style={{ width: secondaryWidth }}
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
            <button type="submit" className={styles.primaryButton}>
              <Icon name="arrow-right-circle" />
              <span className={clsx('t-body-xs-medium', styles.primaryLabel)} style={{ width: primaryLabelWidth }}>
                {primaryLabel}
              </span>
            </button>
          </div>
        </form>

        {illustration}
      </div>
    </main>
  );
}
