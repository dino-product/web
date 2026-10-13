/**
 * 1920x1080 뷰포트 스크린샷 도구 (Figma 프레임과 비교용).
 *
 * 사용법:
 *   node scripts/shot.mjs <url> <out.png> [단계...]
 * 단계(순서대로 실행):
 *   --click <selector>        요소 클릭 (Playwright selector, 예: "text=작업 목록", "[data-testid=x]")
 *   --fill <selector>=<value> 입력
 *   --hover <selector>        호버
 *   --press <key>             키 입력 (예: Escape)
 *   --wait <ms>               대기
 *   --full                    전체 페이지 캡처
 *   --height <px>             뷰포트 높이 변경 (예: 1412 — 긴 Figma 프레임 비교용)
 */
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const [url, out] = args;
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--click sel] [--fill sel=value] [--wait ms] [--full] [--height px]');
  process.exit(1);
}

let height = 1080;
const hIdx = args.indexOf('--height');
if (hIdx !== -1) height = Number(args[hIdx + 1]);

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
} catch {
  browser = await chromium.launch();
}
const page = await browser.newPage({ viewport: { width: 1920, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`HTTP ${r.status()} ${r.url()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);

let full = false;
for (let i = 2; i < args.length; i++) {
  const a = args[i];
  const v = args[i + 1];
  if (a === '--click') { await page.click(v); i++; await page.waitForTimeout(200); }
  else if (a === '--fill') { const eq = v.indexOf('='); await page.fill(v.slice(0, eq), v.slice(eq + 1)); i++; }
  else if (a === '--hover') { await page.hover(v); i++; await page.waitForTimeout(200); }
  else if (a === '--press') { await page.keyboard.press(v); i++; await page.waitForTimeout(200); }
  else if (a === '--wait') { await page.waitForTimeout(Number(v)); i++; }
  else if (a === '--height') { i++; }
  else if (a === '--full') { full = true; }
}

await page.screenshot({ path: out, fullPage: full });
await browser.close();
if (errors.length) {
  console.log('PAGE ERRORS:\n' + errors.join('\n'));
}
console.log('saved', out);
