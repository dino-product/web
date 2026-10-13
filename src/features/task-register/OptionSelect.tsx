import clsx from 'clsx';
import { useId, useLayoutEffect, useRef, useState } from 'react';

import { Icon, Menu, MenuItem, Popover, type PopoverPlacement } from '@/design-system';

import styles from './OptionSelect.module.css';

export interface OptionSelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * - register: 새 작업 등록 선택 상자(1325:5516, 높이 50, 값 Gray900) + 옵션 패널(1834:13940)
 * - dialog: 배정 확인 선택 상자(1325:9684, 높이 56, 값 Gray700). 열림 모양 시안이 없어 DS SelectField와 같게
 *   Secondary 테두리 + DS Menu 패널을 쓴다.
 */
export type OptionSelectAppearance = 'register' | 'dialog';

export interface OptionSelectProps<T extends string> {
  value: T | null;
  options: OptionSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  appearance?: OptionSelectAppearance;
  /** 값이 없을 때 패널을 열면 이 옵션이 보이도록 스크롤한다(시작 시간 09:00) */
  scrollHint?: T;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/** 패널 최대 높이(옵션 5개). 시작 시간(48개)처럼 긴 목록은 패널 안에서 스크롤한다. */
const PANEL_MAX_HEIGHT = 260;
const PANEL_OFFSET = 6;

/** 아래 공간이 모자라면 트리거 위로 연다(캔버스 좌표). */
function choosePlacement(anchor: HTMLElement, panelHeight: number): PopoverPlacement {
  const root = document.getElementById('overlay-root');
  if (!root) return 'bottom-start';
  const rootRect = root.getBoundingClientRect();
  const scale = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
  const rect = anchor.getBoundingClientRect();
  const top = (rect.top - rootRect.top) / scale;
  const bottom = (rect.bottom - rootRect.top) / scale;
  const below = root.offsetHeight - bottom - PANEL_OFFSET;
  return below < panelHeight + 8 && top > below ? 'top-start' : 'bottom-start';
}

function estimatePanelHeight(count: number, appearance: OptionSelectAppearance): number {
  const natural = appearance === 'register' ? 2 + count * 50 + (count - 1) * 2 : 12 + count * 48 + (count - 1) * 2;
  return Math.min(PANEL_MAX_HEIGHT, natural);
}

/**
 * 폼 선택 상자(지역 컴포넌트). DS SelectField는 패널 높이 제한·위치 전환이 없고 새 작업 등록 패널 모양(1834:13940)과
 * 달라서, 같은 트리거 모양에 스크롤 가능한 패널을 붙였다(DS 보완 필요로 보고).
 */
export function OptionSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  appearance = 'register',
  scrollHint,
  id,
  'aria-label': ariaLabel,
  className,
}: OptionSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement>('bottom-start');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = options.find((o) => o.value === value);

  const toggle = () => {
    // 선택지가 없으면(예: ?data=empty의 작업 유형) 빈 패널을 열지 않는다.
    if (!open && options.length === 0) return;
    if (!open && anchorRef.current) {
      setPlacement(choosePlacement(anchorRef.current, estimatePanelHeight(options.length, appearance)));
    }
    setOpen((v) => !v);
  };

  // 열 때 선택된 값(없으면 scrollHint)이 패널 가운데 오도록 스크롤한다.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = appearance === 'register' ? panelRef.current : document.getElementById(menuId);
    if (!panel) return;
    const target = value ?? scrollHint ?? null;
    if (target === null) return;
    const item = panel.querySelector<HTMLElement>(`[data-value="${CSS.escape(target)}"]`);
    if (!item) return;
    panel.scrollTop = Math.max(0, item.offsetTop - (panel.clientHeight - item.offsetHeight) / 2);
  }, [open, appearance, menuId, value, scrollHint]);

  const select = (next: T) => {
    setOpen(false);
    onChange(next);
  };

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(styles.trigger, styles[appearance], open && styles.open, className)}
        onClick={toggle}
      >
        <span className={clsx(styles.value, !current && styles.placeholder)}>{current ? current.label : placeholder}</span>
        <span className={styles.caret}>
          <Icon name="caret-down" color="#727272" />
        </span>
      </button>
      <Popover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        placement={placement}
        offset={PANEL_OFFSET}
        matchWidth
      >
        {appearance === 'register' ? (
          <div ref={panelRef} role="listbox" className={styles.panel}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                data-value={option.value}
                className={styles.option}
                onClick={() => select(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <Menu id={menuId} role="listbox" className={styles.menu}>
            {options.map((option) => (
              <MenuItem
                key={option.value}
                data-value={option.value}
                selected={option.value === value}
                onClick={() => select(option.value)}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        )}
      </Popover>
    </>
  );
}
