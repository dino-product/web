/**
 * 아이콘 레지스트리. src/assets/icons/*.svg는 Figma에서 노드 단위로 내보낸 SVG(viewBox·도형 그대로)이며,
 * 단색 아이콘은 fill/stroke 색만 currentColor로 바꿨다. 여러 색을 쓰는 아이콘(MULTICOLOR_ICONS)은 원래 색을 유지한다.
 * 이름별 Figma 원본 노드·기본 색은 docs/design-system.md의 아이콘 표를 본다.
 */
const rawIcons = import.meta.glob<string>('/src/assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const ICON_NAMES = [
  'alert-circle-fill',
  'archive',
  'arrow-back',
  'arrow-right',
  'arrow-right-circle',
  'ban',
  'bell',
  'bell-circle',
  'board',
  'box-fill',
  'box-open',
  'calendar',
  'caret-down',
  'check',
  'check-circle',
  'check-circle-fill',
  'checkbox-checked',
  'checkbox-outline-checked',
  'checkbox-unchecked',
  'chevron-down',
  'chevron-down-sm',
  'chevron-right',
  'clock',
  'close',
  'close-circle-fill',
  'copy',
  'crown',
  'document-fill',
  'document-text',
  'download',
  'edit',
  'error-fill',
  'external-link',
  'file-text',
  'help-circle',
  'image',
  'info-circle',
  'kakao',
  'list',
  'lock',
  'logout',
  'mail',
  'message',
  'more-vertical',
  'page-next',
  'page-prev',
  'pencil',
  'pencil-line',
  'people-fill',
  'plus',
  'print',
  'qr-code',
  'refresh',
  'retry',
  'search',
  'selector',
  'sidebar-left',
  'trash',
  'user',
  'user-fill',
  'users',
  'users-circle',
  'warning-circle-fill',
  'warning-triangle-fill',
  'wifi-off-circle',
  'x-circle-fill',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** 원래 색을 유지하는 다색 아이콘. color prop이 적용되지 않는다. */
export const MULTICOLOR_ICONS: ReadonlySet<IconName> = new Set<IconName>([
  'arrow-right-circle',
  'bell-circle',
  'image',
  'users-circle',
  'wifi-off-circle',
]);

export interface IconSource {
  svg: string;
  width: number;
  height: number;
}

function parse(name: IconName): IconSource {
  const svg = rawIcons[`/src/assets/icons/${name}.svg`];
  if (!svg) throw new Error(`[Icon] src/assets/icons/${name}.svg 가 없습니다.`);
  const size = /^<svg width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  return { svg: svg.trim(), width: Number(size?.[1] ?? 24), height: Number(size?.[2] ?? 24) };
}

export const ICONS = Object.fromEntries(ICON_NAMES.map((name) => [name, parse(name)])) as Record<IconName, IconSource>;
