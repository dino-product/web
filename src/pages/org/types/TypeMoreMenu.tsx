import clsx from 'clsx';
import type { RefObject } from 'react';

import { Menu, MenuItem, Popover } from '@/design-system';

import styles from './TypeMoreMenu.module.css';

interface TypeMenuPanelProps {
  /** 활성 유형이면 '비활성화', 비활성 유형이면 '활성화' */
  active: boolean;
  onToggleActive?: () => void;
  onDelete?: () => void;
  className?: string;
  /** 확인 모달 뒤에 남겨 두는 정지 상태(클릭·포커스 불가) */
  inert?: boolean;
}

/**
 * 더보기 메뉴 패널(Figma `직원 유형 ` 2008:35277 / 2008:35289, 156x110).
 * 비활성화(gravity-ui:ban)·활성화(keyline-icons:circle-check)는 Gray800, 삭제(eva:trash-2-outline)는 Warning/1.
 * 시안(2008:34397·2008:27153·모달 배경, DS 2008:27440)은 메뉴가 열린 기본 상태에서 '삭제' 항목을 Gray50으로 칠해 두어
 * MenuItem `selected` 모양(Gray50 배경)으로 맞춘다. 비활성화·활성화는 DS 규칙대로 호버·포커스할 때만 칠해지고,
 * 그동안에는 '삭제'의 기본 강조를 내려 강조가 한 항목에만 보이게 한다(TypeMoreMenu.module.css).
 */
export function TypeMenuPanel({ active, onToggleActive, onDelete, className, inert = false }: TypeMenuPanelProps) {
  return (
    <Menu className={clsx(styles.menu, className)} aria-label="더보기" inert={inert} aria-hidden={inert || undefined}>
      {active ? (
        <MenuItem tone="action" icon="ban" className={styles.toggleItem} onClick={onToggleActive}>
          비활성화
        </MenuItem>
      ) : (
        <MenuItem tone="action" icon="check-circle" className={styles.toggleItem} onClick={onToggleActive}>
          활성화
        </MenuItem>
      )}
      <MenuItem tone="danger" icon="trash" selected className={styles.deleteItem} onClick={onDelete}>
        삭제
      </MenuItem>
    </Menu>
  );
}

interface TypeMoreMenuProps extends Omit<TypeMenuPanelProps, 'className' | 'inert'> {
  open: boolean;
  /** ⋮ 버튼(20x20) */
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * ⋮ 버튼에 붙는 더보기 메뉴. Figma 2008:34397에서 메뉴는 ⋮ 왼쪽 12px(오른쪽 끝 = ⋮ 왼쪽 − 12),
 * 위쪽은 활성 행에서 ⋮보다 11.5px 위(= 행 위 + 17), 비활성 행에서 12.5px 위(= 행 위 + 16)에 있다.
 * DS Popover(bottom-end: 오른쪽 끝을 ⋮ 오른쪽에, 위쪽을 ⋮ 아래 + offset)에 offset, 가로 −32를 더해 맞춘다.
 */
export function TypeMoreMenu({ open, anchorRef, onClose, ...panel }: TypeMoreMenuProps) {
  return (
    <Popover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      placement="bottom-end"
      offset={panel.active ? -31.5 : -32.5}
      style={{ transform: 'translateX(-32px)' }}
    >
      <TypeMenuPanel {...panel} />
    </Popover>
  );
}
