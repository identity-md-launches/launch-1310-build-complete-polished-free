import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { serveExport } from './serve.mjs';
const require = createRequire(process.env.POND_TEST_MODULES ? `${process.env.POND_TEST_MODULES}/package.json` : import.meta.url);
const { chromium, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const preview = await serveExport();
const browser = await chromium.launch({ headless: true, executablePath: process.env.POND_CHROMIUM || undefined, args: ['--no-sandbox'] });
const results = [], errors = [], remote = [], failed = [];
const report = (name, details = {}) => { results.push({ name, status: 'passed', ...details }); console.log(`PASS ${name}`); };
await mkdir('artifacts/screenshots', { recursive: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
context.on('page', page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (!req.url().startsWith(preview.url) && !req.url().startsWith('data:') && !req.url().startsWith('about:')) remote.push(req.url()); });
  page.on('requestfailed', req => failed.push({ url: req.url(), error: req.failure()?.errorText }));
});
await context.addInitScript(() => {
  // Deterministic gameplay through the normal input path; no production test API.
  Math.random = () => 0.1;
  window.__audioCreated = 0;
  const OriginalAudio = window.AudioContext;
  window.AudioContext = class extends OriginalAudio { constructor(...args) { super(...args); window.__audioCreated++; } };
});
const page = await context.newPage();
async function state(scope = page) { return scope.locator('#pond').getAttribute('data-phase'); }
async function frogX(scope = page) {
  return scope.locator('canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d'); const { width, height } = canvas;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let sum = 0, count = 0;
    for (let y = Math.floor(height * .6); y < height * .87; y += 2) for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4, r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      if (r > 150 && r < 225 && g > 180 && g > r && b > 135 && b < 220) { sum += x; count++; }
    }
    if (count < 8) throw new Error('Frog pixels not found');
    return sum / count / width * canvas.getBoundingClientRect().width;
  });
}
async function noOverflow(width, height = 900) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const buttons = await page.locator('button:visible').evaluateAll(nodes => nodes.map(n => ({ id: n.id, x: n.getBoundingClientRect().x, right: n.getBoundingClientRect().right, width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
  expect(buttons.every(b => b.x >= 0 && b.right <= width)).toBe(true);
  return buttons;
}
try {
  await page.goto(`${preview.url}/preview/`);
  await expect(page.locator('#start')).toBeVisible();
  expect(await state()).toBe('idle');
  expect(await page.evaluate(() => window.__audioCreated)).toBe(0);
  await page.screenshot({ path: 'artifacts/screenshots/desktop-start.png', fullPage: true });
  for (const width of [1440, 900, 640, 390, 320]) {
    await noOverflow(width, width === 390 ? 844 : 900);
    if (width === 390) {
      expect((await page.locator('#start').boundingBox()).y + (await page.locator('#start').boundingBox()).height).toBeLessThan(844);
      await page.screenshot({ path: 'artifacts/screenshots/mobile-start.png', fullPage: true });
    }
    if (width === 900 || width === 640) await page.screenshot({ path: `artifacts/screenshots/start-${width}.png`, fullPage: true });
    if (width === 320) await page.screenshot({ path: 'artifacts/screenshots/narrow-start.png', fullPage: true });
  }
  report('Start, metadata and responsive layout', { widths: [1440, 900, 640, 390, 320] });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const axeStart = await new AxeBuilder({ page }).analyze();
  expect(axeStart.violations).toEqual([]);
  report('Automated accessibility audit: start screen', { violations: axeStart.violations.length, incomplete: axeStart.incomplete.map(rule => rule.id) });
  // Reach and activate the primary action with the keyboard.
  await page.locator('#sound').focus(); await page.keyboard.press('Tab'); await expect(page.locator('#start')).toBeFocused();
  await page.screenshot({ path: 'artifacts/screenshots/keyboard-focus.png', fullPage: true });
  await page.clock.install();
  await page.keyboard.press('Enter'); await page.clock.runFor(80);
  await expect(page.locator('canvas')).toBeFocused();
  const center = await frogX();
  await page.keyboard.down('ArrowLeft'); await page.clock.runFor(180); await page.keyboard.up('ArrowLeft');
  const left = await frogX(); expect(left).toBeLessThan(center - 60);
  await page.keyboard.down('d'); await page.clock.runFor(330); await page.keyboard.up('d');
  const right = await frogX(); expect(right).toBeGreaterThan(center + 60);
  await page.keyboard.down('a'); await page.clock.runFor(150); await page.keyboard.up('a');
  expect(await frogX()).toBeLessThan(right - 60);
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(150); await page.keyboard.up('ArrowRight');
  expect(await frogX()).toBeGreaterThan(center);
  report('Keyboard start and all four steering keys', { center, left, right });
  await page.keyboard.press('p'); expect(await state()).toBe('paused');
  const pausedTimer = await page.locator('#timer').textContent();
  const frozen = await page.locator('canvas').evaluate(c => c.toDataURL());
  await page.clock.runFor(3000);
  expect(await page.locator('#timer').textContent()).toBe(pausedTimer);
  expect(await page.locator('canvas').evaluate((c, frozen) => c.toDataURL() === frozen, frozen)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/desktop-paused.png', fullPage: true });
  const axePause = await new AxeBuilder({ page }).analyze(); expect(axePause.violations).toEqual([]);
  await page.keyboard.press('Escape'); expect(await state()).toBe('playing');
  await page.locator('#pause').click(); expect(await state()).toBe('paused');
  await page.locator('#resume').click(); expect(await state()).toBe('playing');
  report('P, Escape, pause button, resume and frozen simulation', { axeViolations: axePause.violations.length, incomplete: axePause.incomplete.map(rule => rule.id) });
  await page.locator('#restart').click(); await page.clock.runFor(80);
  expect(await page.locator('#score').textContent()).toBe('000'); expect(await page.locator('#timer').textContent()).toBe('1:00');
  expect(await page.locator('#lives').getAttribute('aria-label')).toBe('3 lives remaining');
  await page.locator('#sound').click(); await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__audioCreated)).toBe(1);
  await page.locator('#sound').click(); await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  report('Restart resets the round; sound initializes only after user gesture');
  // First wave puts two fireflies on the starting line. Collect through the real renderer and loop.
  await page.locator('#restart').click(); await page.clock.runFor(4800);
  expect(Number(await page.locator('#score').textContent())).toBeGreaterThanOrEqual(10);
  await page.screenshot({ path: 'artifacts/screenshots/desktop-playing.png', fullPage: true });
  // Right bank is clear with this seed. Run a full 60 seconds with real animation frames.
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(1200); await page.keyboard.up('ArrowRight');
  await page.clock.runFor(55000);
  expect(await state()).toBe('won');
  expect(await page.locator('#timer').textContent()).toBe('0:00');
  expect(Number(await page.locator('#final-score').textContent())).toBeGreaterThanOrEqual(10);
  await page.screenshot({ path: 'artifacts/screenshots/desktop-won.png', fullPage: true });
  await page.locator('#again').click(); await page.clock.runFor(50); expect(await state()).toBe('playing');
  expect(await page.locator('#score').textContent()).toBe('000');
  // Move into the known left log lane and take three collisions in separate waves.
  await page.keyboard.down('ArrowLeft'); await page.clock.runFor(620); await page.keyboard.up('ArrowLeft');
  await page.clock.runFor(16000);
  expect(await state()).toBe('lost'); expect(await page.locator('#lives').getAttribute('aria-label')).toBe('0 lives remaining');
  await page.screenshot({ path: 'artifacts/screenshots/desktop-lost.png', fullPage: true });
  const axeResult = await new AxeBuilder({ page }).analyze(); expect(axeResult.violations).toEqual([]);
  report('Collect, survive 60 seconds, win, three collisions, game over, replay', { axeViolations: axeResult.violations.length, incomplete: axeResult.incomplete.map(rule => rule.id) });
  const savedBest = await page.locator('#best-score').textContent();
  await page.reload(); expect(await page.locator('#best-score').textContent()).toBe(savedBest);
  report('Personal best persists across reload');
  // Browser pointer events driven through Chromium touch emulation.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#start').click(); await page.clock.runFor(80);
  const startX = await frogX();
  const bounds = await page.locator('canvas').boundingBox();
  const cdp = await context.newCDPSession(page);
  const touch = async (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: bounds.y + bounds.height * .8, id: 1 }] });
  await touch('touchStart', 130); await touch('touchMove', 240); await page.clock.runFor(80); await touch('touchEnd', 240);
  const draggedX = await frogX(); expect(draggedX).toBeGreaterThan(startX + 80);
  await page.locator('#pause').click(); expect(await state()).toBe('paused');
  await page.screenshot({ path: 'artifacts/screenshots/mobile-paused.png', fullPage: true });
  await page.locator('#pause-restart').click(); await page.clock.runFor(80); expect(await state()).toBe('playing');
  expect(await page.locator('#timer').textContent()).toBe('1:00');
  await page.clock.runFor(1200);
  await page.screenshot({ path: 'artifacts/screenshots/mobile-playing.png', fullPage: true });
  await page.keyboard.press('p');
  for (const width of [390, 320]) await noOverflow(width, 844);
  report('Mobile touch drag, visible pause, restart and 320px active HUD', { startX, draggedX });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload();
  await page.clock.runFor(80);
  await page.locator('canvas').evaluate(c => { window.__stillPixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; });
  await page.clock.runFor(1000);
  const pixelDifference = await page.locator('canvas').evaluate(c => {
    const before = window.__stillPixels, after = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let maxDelta = 0, changedPixels = 0;
    for (let i = 0; i < before.length; i += 4) {
      const delta = Math.max(...[0, 1, 2, 3].map(n => Math.abs(before[i+n] - after[i+n])));
      maxDelta = Math.max(maxDelta, delta);
      if (delta) changedPixels++;
    }
    return { sameSize: before.length === after.length, maxDelta, changedRatio: changedPixels / (after.length / 4) };
  });
  // Canvas readback can switch raster backends: allow tiny antialiasing changes,
  // while actual scene movement changes substantially more pixels and colors.
  expect(pixelDifference.sameSize).toBe(true);
  expect(pixelDifference.maxDelta).toBeLessThanOrEqual(3);
  expect(pixelDifference.changedRatio).toBeLessThan(0.01);
  report('Reduced motion: start scene is static', { pixelDifference });
  // Text enlargement is distinct from browser-native zoom.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('#start').evaluate(button => button.getBoundingClientRect().bottom <= document.querySelector('.pond-surface').getBoundingClientRect().bottom)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/text-enlargement.png', fullPage: true });
  report('200% text enlargement: reflow and complete primary action');
  // Losing focus pauses and clears held movement.
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.locator('#start').click(); await page.clock.runFor(50);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await state()).toBe('paused');
  report('Window blur pauses the active round');
  // Opaque sandbox with no Access-Control-Allow-Origin response header.
  const host = await context.newPage(); await host.clock.install(); await host.goto(`${preview.url}/harness`);
  const iframeElement = host.locator('#game'); const frame = await iframeElement.elementHandle().then(h => h.contentFrame());
  await expect(frame.locator('#start')).toBeVisible();
  expect(await frame.evaluate(() => { try { localStorage.getItem('x'); return 'allowed'; } catch(e) { return e.name; } })).toBe('SecurityError');
  const init = { protocol: 'pepe-game/1', type: 'init', channel: 'pond-test-channel' };
  const send = data => host.evaluate(data => window.sendGame(data), data);
  await send({ ...init, protocol: 'other' }); await send({ ...init, type: 'pause' });
  expect(await host.evaluate(() => window.messages.length)).toBe(0);
  await send(init); await expect.poll(() => host.evaluate(() => window.messages.length)).toBe(1);
  expect(await host.evaluate(() => window.messages[0])).toEqual({ ...init, type: 'ready' });
  await frame.locator('#start').click(); await host.clock.runFor(5000); expect(await state(frame)).toBe('playing');
  expect(Number(await frame.locator('#score').textContent())).toBeGreaterThan(0);
  await send({ ...init, type: 'pause', channel: 'wrong' }); expect(await state(frame)).toBe('playing');
  await host.evaluate(data => document.querySelector('#stranger').contentWindow.eval(`parent.document.querySelector('#game').contentWindow.postMessage(${JSON.stringify(data)}, '*')`), { ...init, type: 'pause' });
  expect(await state(frame)).toBe('playing');
  await send({ ...init, type: 'pause' }); await expect(frame.locator('#pond')).toHaveAttribute('data-phase', 'paused');
  const iframeTime = await frame.locator('#timer').textContent(); await host.clock.runFor(2500); expect(await frame.locator('#timer').textContent()).toBe(iframeTime);
  await expect(frame.locator('#resume')).toBeDisabled();
  await send({ ...init, type: 'resume' }); await expect(frame.locator('#pond')).toHaveAttribute('data-phase', 'playing');
  await frame.locator('canvas').focus(); await host.keyboard.down('ArrowRight'); await host.clock.runFor(1100); await host.keyboard.up('ArrowRight');
  await host.clock.runFor(55000); expect(await state(frame)).toBe('won');
  const gameovers = await host.evaluate(() => window.messages.filter(m => m.type === 'gameover'));
  expect(gameovers).toHaveLength(1); expect(gameovers[0].protocol).toBe('pepe-game/1'); expect(gameovers[0].channel).toBe(init.channel);
  expect(Number.isInteger(gameovers[0].score)).toBe(true); expect(gameovers[0].score).toBeGreaterThan(0);
  await expect(frame.locator('#save-note')).toBeVisible();
  // The real-clock sandbox screenshot is captured by test:revision. Accelerated
  // clock screenshots may omit the out-of-process iframe's compositor surface.
  await frame.locator('#again').click(); expect(await state(frame)).toBe('playing');
  await host.close();
  report('Opaque-origin sandbox, storage failure, bridge source/protocol/channel checks, pause/resume, gameover score and replay', { gameover: gameovers[0] });
  expect(errors).toEqual([]); expect(failed).toEqual([]); expect(remote).toEqual([]);
  report('No browser exceptions, failed requests or external runtime requests');
} catch (error) {
  results.push({ name: 'Browser validation', status: 'failed', error: error.stack });
  console.error(error);
  await page.screenshot({ path: 'artifacts/screenshots/failure.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile('artifacts/browser-results.json', JSON.stringify({ browser: browser.version(), playwright: require('@playwright/test/package.json').version, results, errors, failed, remote }, null, 2) + '\n');
  await browser.close(); await preview.close();
}
