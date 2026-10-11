import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('dist');
const expected = { schemaVersion: 'pepe-browser-game/1', title: 'Pond Dash', version: '1.0.0', summary: 'Surf a lily pad, collect fireflies and dodge the drifting logs.', description: 'A one-minute pond slalom. Guide a frog on a lily pad through drifting logs and collect golden fireflies. Three lives, increasing speed, pause and restart.', controls: 'Arrow keys or A/D steer. Touch and drag on mobile. P or Escape pauses.', genre: 'arcade', players: 1, mobile: true, entry: 'index.html', cover: 'cover.svg' };
assert.deepEqual(JSON.parse(await readFile(path.join(root, 'pepe-game.json'), 'utf8')), expected);
const html = await readFile(path.join(root, 'index.html'), 'utf8');
for (const marker of ['<title>', 'name="description"', 'property="og:title"', 'property="og:image"', 'rel="icon"']) assert.ok(html.includes(marker), `Missing ${marker}`);
assert.ok(!html.includes('type="module"'), 'Sandbox portability requires a classic script');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(match[1].startsWith('./'), `Non-relative asset URL: ${match[1]}`);
  await stat(path.join(root, match[1]));
}
const cover = await readFile(path.join(root, 'cover.svg'), 'utf8');
assert.match(cover, /width="1200" height="630"/);
assert.ok(!/<(?:image|script)\b/.test(cover), 'Cover must remain standalone vector artwork');
let bytes = 0, files = [];
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    assert.ok(!item.isSymbolicLink(), `No symlinks in export: ${file}`);
    if (item.isDirectory()) { assert.ok(!['node_modules', '.cache', 'vendor'].includes(item.name)); await scan(file); }
    else {
      const size = (await stat(file)).size; bytes += size; files.push({ file: path.relative(root, file), bytes: size });
      assert.ok(!/\.(map|tgz|zip)$/.test(item.name), `Unneeded packaging artifact: ${file}`);
    }
  }
}
await scan(root);
assert.ok(bytes < 256 * 1024, 'Export exceeded its 256 KiB path budget');
console.log(JSON.stringify({ result: 'PASS', manifest: 'exact match', relativeAssets: true, cover: '1200 × 630', bytes, files }, null, 2));
