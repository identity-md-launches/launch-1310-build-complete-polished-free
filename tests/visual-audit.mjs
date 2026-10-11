import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { serveExport } from './serve.mjs';
const require = createRequire(process.env.POND_TEST_MODULES ? `${process.env.POND_TEST_MODULES}/package.json` : import.meta.url);
const { chromium } = require('@playwright/test');
const preview = await serveExport();
const browser = await chromium.launch({ executablePath: process.env.POND_CHROMIUM || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const results = [];
try {
  await page.goto(`${preview.url}/preview/`);
  for (const [width, scale] of [[1440, 1], [900, 1], [640, 1], [390, 1], [320, 1], [390, 2]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(scale => { document.documentElement.style.fontSize = `${scale * 100}%`; }, scale);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const pairs = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'), cr = canvas.getBoundingClientRect();
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const linear = x => (x /= 255) <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
      const lum = rgb => .2126 * linear(rgb[0]) + .7152 * linear(rgb[1]) + .0722 * linear(rgb[2]);
      const contrast = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
      const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
      // Text-node line rectangles, not whole block boxes, prevent empty block
      // space from being misreported as a foreground/background collision.
      const pairs = ['.intro-tag', '.intro h2', '.intro-copy', '.round-facts', '.rules'].map(selector => {
        const walker = document.createTreeWalker(document.querySelector(selector), NodeFilter.SHOW_TEXT);
        let text, minimum = 100, background = null;
        while (text = walker.nextNode()) {
          if (!text.textContent.trim()) continue;
          const foreground = rgb(getComputedStyle(text.parentElement).color);
          const range = document.createRange(); range.selectNodeContents(text);
          for (const rect of range.getClientRects()) {
            for (let y = Math.max(0, Math.floor((rect.top - cr.top) * canvas.height / cr.height)); y < Math.min(canvas.height, (rect.bottom - cr.top) * canvas.height / cr.height); y++) {
              for (let x = Math.max(0, Math.floor((rect.left - cr.left) * canvas.width / cr.width)); x < Math.min(canvas.width, (rect.right - cr.left) * canvas.width / cr.width); x++) {
                const offset = (y * canvas.width + x) * 4;
                const bg = [data[offset], data[offset + 1], data[offset + 2]];
                const ratio = contrast(foreground, bg);
                if (ratio < minimum) { minimum = ratio; background = bg; }
              }
            }
          }
        }
        return { selector, minimum: +minimum.toFixed(2), threshold: selector === '.intro h2' ? 3 : 4.5, background };
      });
      for (const [selector, backdrop] of [['#start', '#start'], ['.control-bar', '.control-bar'], ['.title-row p', 'html']]) {
        pairs.push({ selector, minimum: +contrast(rgb(getComputedStyle(document.querySelector(selector)).color), rgb(getComputedStyle(document.querySelector(backdrop)).backgroundColor)).toFixed(2), threshold: 4.5 });
      }
      return pairs;
    });
    results.push({ width, textScale: scale, pairs });
    for (const pair of pairs) assert.ok(pair.minimum >= pair.threshold, `${width}px × ${scale}: ${pair.selector} = ${pair.minimum}, needs ${pair.threshold}`);
    console.log(`PASS ${width}px at ${scale * 100}% text: minimum small-text contrast ${Math.min(...pairs.filter(p => p.threshold === 4.5).map(p => p.minimum))}:1`);
  }
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  await writeFile('artifacts/contrast-results.json', JSON.stringify({ method: 'Conservative per-pixel sampling under DOM text-node line boxes on the static reduced-motion start scene; opaque UI uses computed colors. Not a universal ratio for animated gameplay.', browser: browser.version(), results }, null, 2) + '\n');
  await browser.close(); await preview.close();
}
