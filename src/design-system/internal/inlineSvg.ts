/**
 * Figma에서 내보낸 SVG 문자열을 인라인으로 넣기 위한 보정.
 * - 같은 아이콘을 한 화면에 여러 번 그려도 clipPath·mask id가 겹치지 않도록 id와 url(#id)에 접미사를 붙인다.
 * - 크기를 바꿀 때는 루트 width/height 속성만 바꾸고 viewBox·도형은 그대로 둔다.
 */
export function prepareSvg(svg: string, uid: string, width?: number, height?: number): string {
  const suffix = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  let out = svg;
  if (out.includes('id="')) {
    out = out
      .replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${id}-${suffix}"`)
      .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${id}-${suffix})`);
  }
  if (width !== undefined && height !== undefined) {
    out = out.replace(/^<svg width="[^"]*" height="[^"]*"/, `<svg width="${round(width)}" height="${round(height)}"`);
  }
  return out;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
