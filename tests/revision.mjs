import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { serveExport } from './serve.mjs';

const require = createRequire(process.env.POND_TEST_MODULES ? `${process.env.POND_TEST_MODULES}/package.json` : import.meta.url);
const { chromium, expect } = require('@playwright/test');
const preview = await serveExport();
const browser = await chromium.launch({ executablePath: process.env.POND_CHROMIUM || undefined, args: ['--no-sandbox'] });
const results = [], errors = [], failed = [], remote = [], expectedDiagnostics = [];
const report = (name, details = {}) => { results.push({ name, status: 'passed', ...details }); console.log(`PASS ${name}`); };
await mkdir('artifacts/screenshots', { recursive: true });
async function newContext(options = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce', ...options });
  context.on('page', page => {
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', req => failed.push(req.url()));
    page.on('request', req => { if (!req.url().startsWith(preview.url)) remote.push(req.url()); });
  });
  await context.addInitScript(() => { Math.random = () => 0.1; });
  return context;
}
async function visibleInViewport(page, selector) {
  await expect(page.locator(selector)).toBeVisible();
  const box = await page.locator(selector).boundingBox();
  const { width, height } = page.viewportSize();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  return box;
}
try {
  const mobile = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await mobile.newPage();
  await page.goto(`${preview.url}/preview/`);
  await expect(page).toHaveTitle('Pond Dash');
  await expect(page.locator('[property="og:title"]')).toHaveAttribute('content', 'Pond Dash');
  await expect(page.locator('.title-row p')).toHaveText('Surf a lily pad through a moonlit pond.');
  await expect(page.locator('.intro h2, .intro-tag, .intro-copy, .brand-note, .free-label, .round-tag, .control-note, .scene-caption')).toHaveCount(0);
  await expect(page.locator('.round-facts')).toHaveText('60 seconds · 3 lives');
  const start = await visibleInViewport(page, '#start');
  const facts = await page.locator('.round-facts').evaluate(e => ({ height: e.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(e).lineHeight) }));
  expect(facts.height).toBeLessThanOrEqual(facts.lineHeight + 1);
  await expect(page.locator('#pond')).toHaveCSS('box-shadow', 'none');
  report('Single product introduction, concise metadata, one-line facts and border-only shell', { start, facts });

  // A real touch swipe, not synthetic pointermove, must reach browser scrolling.
  const cdp = await mobile.newCDPSession(page);
  await expect(page.locator('canvas')).toHaveCSS('touch-action', 'pan-y');
  const canvas = await page.locator('canvas').boundingBox();
  const x = canvas.x + canvas.width / 2, y = canvas.y + canvas.height - 60;
  expect(await page.evaluate(({x,y}) => document.elementFromPoint(x,y).id, {x,y})).toBe('game-canvas');
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x,y,id:1}] });
  for(let step=1;step<=12;step++) {
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x,y:y-step*20,id:1}] });
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const scroll = await page.evaluate(() => scrollY);
  await page.evaluate(() => scrollTo(0,0));
  await page.locator('#start').click();
  await expect(page.locator('canvas')).toHaveCSS('touch-action', 'none');
  await page.locator('#pause').click();
  await expect(page.locator('canvas')).toHaveCSS('touch-action', 'pan-y');
  await expect(page.locator('#pause-screen .state-hint')).toBeHidden();
  await expect(page.locator('#pause-screen .state-card')).toHaveCSS('box-shadow', 'none');
  report('Idle pond swipe scrolls; playing captures drag; mobile pause omits keyboard hint', { scroll });

  const landscape = [];
  for (const [width, height] of [[844,390],[667,375],[568,320]]) {
    await page.setViewportSize({width,height}); await page.reload(); await page.evaluate(() => scrollTo(0,0));
    const start = await visibleInViewport(page, '#start');
    if (width === 844) await page.screenshot({path:'artifacts/screenshots/landscape-start.png'});
    await page.locator('#start').click();
    await expect(page.locator('#pond')).toHaveAttribute('data-phase', 'playing');
    const pond = await visibleInViewport(page, '.pond-surface');
    const pause = await visibleInViewport(page, '#pause');
    await visibleInViewport(page, '#timer'); await visibleInViewport(page, '#sound');
    await page.screenshot({path:`artifacts/screenshots/landscape-${width}-playing.png`});
    await page.locator('#pause').click();
    await expect(page.locator('#pause-screen .state-hint')).toBeHidden();
    if (width === 844) await page.screenshot({path:'artifacts/screenshots/landscape-paused.png'});
    await page.locator('#pause-restart').click();
    await expect(page.locator('#timer')).toHaveText('1:00');
    await visibleInViewport(page, '#pause');
    await page.locator('#pause').click();
    await page.locator('#resume').click();
    await expect(page.locator('#pond')).toHaveAttribute('data-phase', 'playing');
    landscape.push({width,height,start,pond,pause});
  }
  report('Landscape start, complete playfield, HUD, pause, restart and resume at three sizes', { viewports:landscape });
  await page.setViewportSize({width:390,height:844}); await page.reload(); await page.locator('#start').click();
  await page.setViewportSize({width:844,height:390});
  await expect.poll(() => page.locator('.pond-surface').boundingBox().then(b => b.y)).toBeGreaterThanOrEqual(0);
  await visibleInViewport(page, '.pond-surface'); await visibleInViewport(page, '#pause');
  report('Rotating an active portrait round keeps the complete playfield and pause visible');
  await mobile.close();

  const desktop = await newContext({viewport:{width:1440,height:900}});
  const wide = await desktop.newPage(); await wide.goto(`${preview.url}/preview/`);
  await wide.locator('#start').click(); await wide.keyboard.press('p');
  await expect(wide.locator('#pause-screen .state-hint')).toBeVisible();
  await expect(wide.locator('#pause-screen .state-card')).toHaveCSS('box-shadow','none');
  report('Desktop pause retains keyboard hint and border-only card');
  await desktop.close();

  const fallback = await newContext({viewport:{width:1440,height:900}});
  await fallback.addInitScript(() => { delete CanvasRenderingContext2D.prototype.roundRect; });
  const old = await fallback.newPage(); await old.clock.install(); await old.goto(`${preview.url}/preview/`);
  await old.locator('#start').click(); await old.clock.runFor(4800);
  await expect(old.locator('#pond')).toHaveAttribute('data-phase','playing');
  const time = await old.locator('#timer').textContent(); expect(time).not.toBe('1:00');
  expect(Number(await old.locator('#score').textContent())).toBeGreaterThan(0);
  await old.screenshot({path:'artifacts/screenshots/roundrect-fallback.png',fullPage:true});
  await old.keyboard.press('p'); await old.locator('#pause-restart').click(); await old.clock.runFor(1500);
  await expect(old.locator('#timer')).not.toHaveText('1:00');
  report('Missing roundRect: drawing, countdown, collection, pause and restart continue', {time});
  await fallback.close();

  const faultContext = await newContext({viewport:{width:390,height:844}});
  const fault = await faultContext.newPage(); await fault.clock.install(); await fault.goto(`${preview.url}/preview/`);
  fault.on('console', message => { if(message.type()==='error') expectedDiagnostics.push(message.text()); });
  await fault.locator('#start').click();
  await fault.evaluate(() => {
    window.__drawAttempts = 0;
    CanvasRenderingContext2D.prototype.fillRect = () => { window.__drawAttempts++; throw new Error('Injected drawing failure'); };
  });
  await fault.clock.runFor(80);
  await expect(fault.locator('#pond')).toHaveAttribute('data-phase','error');
  await expect(fault.locator('#error-screen')).toBeVisible();
  await expect(fault.locator('#reload')).toBeFocused();
  await expect(fault.locator('#status')).toHaveText('Something went wrong drawing the pond. Reload to play.');
  await visibleInViewport(fault, '#reload');
  const frozenTime = await fault.locator('#timer').textContent();
  await fault.clock.runFor(3000); await fault.keyboard.press('p');
  await expect(fault.locator('#timer')).toHaveText(frozenTime);
  await expect(fault.locator('#pond')).toHaveAttribute('data-phase','error');
  expect(await fault.evaluate(() => window.__drawAttempts)).toBe(1);
  expect(expectedDiagnostics).toHaveLength(1);
  await fault.screenshot({path:'artifacts/screenshots/drawing-error.png',fullPage:true});
  await fault.locator('#reload').click(); await expect(fault.locator('#start')).toBeVisible();
  await fault.locator('#start').click(); await fault.clock.runFor(1500);
  await expect(fault.locator('#timer')).not.toHaveText('1:00');
  report('Unexpected drawing error stops once, announces recovery, focuses Reload and recovers');
  await faultContext.close();
  // Use the real browser clock for screenshot evidence of the opaque iframe.
  const sandboxContext = await newContext({viewport:{width:1440,height:1100}});
  const host = await sandboxContext.newPage(); await host.goto(`${preview.url}/harness`);
  const sandbox = await host.locator('#game').elementHandle().then(h => h.contentFrame());
  await sandbox.locator('#start').click(); await sandbox.locator('#pause').click();
  await expect(sandbox.locator('#pond')).toHaveAttribute('data-phase','paused');
  await host.screenshot({path:'artifacts/screenshots/sandbox-paused.png',fullPage:true});
  await sandbox.locator('#resume').click();
  await expect(sandbox.locator('#pond')).toHaveAttribute('data-phase','playing');
  await sandboxContext.close();
  expect(errors).toEqual([]); expect(failed).toEqual([]); expect(remote).toEqual([]);
  report('No unhandled exceptions, failed requests or external runtime requests', {realClockSandbox:'start, pause, screenshot and resume passed'});
} catch(error) {
  results.push({name:'Revision validation',status:'failed',error:error.stack});
  console.error(error); process.exitCode=1;
} finally {
  await writeFile('artifacts/revision-results.json',JSON.stringify({browser:browser.version(),playwright:require('@playwright/test/package.json').version,results,errors,failed,remote,expectedDiagnostics},null,2)+'\n');
  await browser.close(); await preview.close();
}
