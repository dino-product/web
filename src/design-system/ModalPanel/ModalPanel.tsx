import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './ModalPanel.module.css';

export interface ModalPanelProps {
  /** 머리말 제목(18/700 Primary). 예: '새 작업 등록' */
  title: ReactNode;
  /** 머리말 오른쪽 내용(닫기 버튼 등) */
  headerRight?: ReactNode;
  /** 패널 너비(px). 기본 1337(새 작업 등록 1282:8589) */
  width?: number;
  className?: string;
  /** 본문 className(본문 레이아웃은 화면에서 정한다) */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * 큰 모달 패널(새 작업 등록 1282:7973). Modal 안에 넣는다.
 * 머리말: 높이 58, padding 16/20, 흰 배경, 아래 Gray200 1px, 위 모서리 radius 18.
 * 본문: Background/3 배경, padding 30, 아래 모서리 radius 18.
 */
export function ModalPanel({ title, headerRight, width = 1337, className, bodyClassName, children }: ModalPanelProps) {
  return (
    <section className={clsx(styles.panel, className)} style={{ width }}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {headerRight}
      </header>
      <div className={clsx(styles.body, bodyClassName)}>{children}</div>
    </section>
  );
}
