# Pond Dash

A free, self-contained HTML5 game for Pepe2Pepe. Surf a lily pad through a moonlit pond, collect golden fireflies, and dodge logs for 60 seconds. Original canvas/vector artwork, responsive keyboard and touch controls, three lives, and an increasing current. There are no runtime packages, remote assets, tracking, accounts, stores, wallets or payments.

**The complete production site is in `dist/`.** The publisher should serve these files directly; no rebuild or backend is required. `dist/cover.svg` is 1200 × 630, and `dist/pepe-game.json` matches the requested manifest exactly.

## Play

- Select **Start drifting**. Collect fireflies for **10 points each**. Each log hit costs one life, with a short grace period to recover. Survive 60 seconds to finish; losing all three lives ends the round.
- Steer with **← / →** or **A / D**. On touchscreens, touch the pond and drag horizontally. Dragging starts from the frog’s current position, so it never jumps to your finger.
- Press **P / Escape**, or use the pause button. Resume from the pause screen. Leaving the window also pauses the round.
- Restart with the toolbar button on desktop, **Restart round** on the pause screen, or **Drift again** after a round. Restart clears the current round immediately.
- Sound begins **off**. The sound button toggles synthesized effects. An audio context is created only after a gesture when sound is enabled. No audio files are downloaded.
- A personal best and sound preference are stored locally when permitted. If storage fails, the game continues and the best remains available for the current page session. No score is sent anywhere except the optional parent iframe bridge below.

## Install and develop

Use Node.js **22.18 or newer** and npm. Development dependencies are pinned by `package-lock.json`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The development server binds to loopback. Dependencies and generated caches are excluded at every directory depth by `.gitignore`; never include `node_modules/` in a submission. This assignment's worker installed its toolchain outside the repository under `/tmp/pond-dash-toolchain` to respect the repository path restrictions.

## Rebuild, preview and check

```sh
npm run typecheck
npm test
npm run build
npm run check:export
npm run preview
```

`npm run build` creates `dist/` with Vite's relative `./` base and a single IIFE bundle. `scripts/finalize-export.mjs` turns the generated module tag into a **classic deferred script**. Styles are bundled in that script. This lets the export run inside an opaque-origin iframe even on a static server with **no CORS headers**, and also avoids module restrictions when opening the files locally. The source remains separate TypeScript modules.

Run the browser checks against the built export:

```sh
npx playwright install chromium
npm run test:browser
npm run test:visual
```

The test script starts and stops its own local server, serves `dist/` at `/preview/`, and closes its browser on completion. It validates actual keyboard and touch input, pause/restart, scoring, both endings, persistence, responsive layouts, reduced motion, text enlargement, accessibility scans and the sandbox bridge. It uses a deterministic random seed and a simulated browser clock for repeatable rounds. The separate visual audit measures text contrast against actual canvas pixels at five widths and 200% text size. No test hooks are included in the production game. Screenshots and JSON results go into `artifacts/`.

For a toolchain installed outside this repository, set `POND_TEST_MODULES` to that toolchain directory; `POND_CHROMIUM` optionally selects a browser executable. Standard installations need neither variable. `PLAYWRIGHT_BROWSERS_PATH` can keep downloaded browsers outside the repository.

Actual final run: production build, TypeScript check, 12 rule/bridge/storage tests, export validation and the browser suite passed. See [`artifacts/validation.md`](artifacts/validation.md) for commands, evidence, review findings and limitations. [`DESIGN.md`](DESIGN.md) describes the implemented design system.

## Parent iframe bridge

Standalone use requires no initialization. For an embed:

```html
<iframe
  id="pond-game"
  src="./pond-dash/index.html"
  title="Pond Dash"
  sandbox="allow-scripts allow-pointer-lock"
></iframe>
```

Messages are objects with `protocol`, `type`, and a nonempty string `channel` (maximum 256 characters). Choose a fresh channel for each host session. Send `init` after the iframe loads; the game does not announce readiness unsolicited.

```js
const frame = document.querySelector('#pond-game');
const channel = crypto.randomUUID();
frame.addEventListener('load', () => {
  frame.contentWindow.postMessage({
    protocol: 'pepe-game/1', type: 'init', channel
  }, '*'); // An opaque-origin sandbox requires '*'.
});
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow) return;
  const message = event.data;
  if (message?.protocol !== 'pepe-game/1' || message.channel !== channel) return;
  if (message.type === 'ready') console.log('Pond Dash is ready');
  if (message.type === 'gameover') console.log('Final score:', message.score);
});
// The host can send { protocol: 'pepe-game/1', type: 'pause', channel }
// and { protocol: 'pepe-game/1', type: 'resume', channel } to frame.contentWindow.
```

Responses:

```json
{"protocol":"pepe-game/1","type":"ready","channel":"the-channel-you-sent"}
{"protocol":"pepe-game/1","type":"gameover","channel":"the-channel-you-sent","score":120}
```

`gameover` is sent exactly once per completed round, for either a win or a loss, with a nonnegative integer score. The example score is illustrative. Incoming messages from self, siblings, other windows, other protocols, and mismatched/uninitialized channels are ignored. Replies target the initiating parent's origin; `*` is used only if that origin is opaque. A host pause persists across restart and cannot be overridden by local controls. A manual pause persists when the host resumes. No pointer lock is requested or required.

## Publish

Publish **the contents of `dist/`**, preserving its relative directory structure, through the assignment's static hosting coordinator. The same directory can be served at an ordinary static URL, gateway subpath, Swarm website, or ENS-linked site. Keep `index.html`, `pepe-game.json`, `cover.svg`, `favicon.svg` and `assets/` together. No secrets, RPC endpoint, build service, or admin access is needed.

This task delivers the export. The coordination service handles hosting/naming and the Pepe2Pepe submission flow after receiving its hosted identifier. **No hosting identifier or listing is claimed here. Administrator review follows submission.** No publishing or submission API call was made by the worker.

## Project map

| Path | Purpose |
| --- | --- |
| `src/game.ts` | Pure game rules, spawning, collisions, timing, pause state |
| `src/art.ts` | Original frog, pond, logs, fireflies and feedback renderer |
| `src/main.ts`, `src/style.css` | UI states, input, responsive presentation |
| `src/bridge.ts` | Parent-only messaging and score reporting |
| `src/audio.ts`, `src/storage.ts` | Gesture-gated sound and fallible storage |
| `public/` | Source cover, favicon and exact game manifest |
| `tests/` | Unit tests, browser interactions and iframe harness |
| `scripts/` | Portable export finalization and integrity checks |
| `dist/` | Complete, ready-to-serve production export |

The interfaces provide keyboard navigation, visible focus, meaningful labels, status announcements and reduced decorative motion. The real-time canvas slalom remains a visual game and is not claimed to provide a nonvisual equivalent. Physical-device, screen-reader, Safari and Firefox testing were not performed. System font rendering varies by platform. See the full evidence record for precise coverage. Guidance attributions and licenses are retained in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
