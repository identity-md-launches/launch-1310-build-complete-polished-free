# Pond Dash revision validation

Date: 2026-10-11. Status: **Complete for the stated scope.** This is the worker's local evidence, not independent certification or a claim of hosting/listing.

## Scope and assumptions

This revision preserves the accepted TypeScript/canvas game, rules, artwork style, audio, storage and parent bridge. All nine reviewer findings were reproduced before changing the relevant behavior. The shipped site is `dist/`; the reviewed production asset is `dist/assets/index-D0GBlCES.js`. Required source assets, lockfile, exact manifest and 1200 × 630 SVG cover remain included. No runtime dependency or external request was added.

The six pinned Better Interface domains were applied to the changed entry copy, surfaces, mobile input, short-screen layout and error recovery. The existing palette, system fonts, frog illustration and game mechanics remain authoritative. No additional theme, account flow, backend or publishing step was introduced.

## Commands and actual outcomes

Environment: Node **24.21.0**, npm **11.19.0**, Vite **7.3.7**, TypeScript **5.9.3**, Playwright **1.56.1**, Chromium **153.0.8010.12**, Linux. Dependencies were installed from the unchanged lockfile outside the repository:

```sh
mkdir -p /tmp/pond-dash-toolchain
cp package.json package-lock.json /tmp/pond-dash-toolchain/
npm ci --prefix /tmp/pond-dash-toolchain --cache /tmp/pond-dash-npm-cache --no-audit --no-fund
```

The worker used the installed binary directory on `PATH` for `npm run typecheck` and `npm run build`. Browser commands used:

```sh
POND_TEST_MODULES=/tmp/pond-dash-toolchain \
POND_CHROMIUM=/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome \
XDG_CONFIG_HOME=/tmp/pond-dash-browser-config \
XDG_CACHE_HOME=/tmp/pond-dash-browser-cache \
npm run test:browser
```

The same browser environment was used for `npm run test:revision` and `npm run test:visual`. Standard local installations can use the commands in README without these environment overrides.

| Command | Final outcome | Evidence |
| --- | --- | --- |
| `npm ci` with the prefix/cache above | Exit 0; 21 packages installed | Tool output; no repository dependency tree |
| `npm run typecheck` | Exit 0; no diagnostics | [typecheck-results.txt](typecheck-results.txt) |
| `npm test` | Exit 0; 12 tests passed | [unit-results.txt](unit-results.txt) |
| `npm run build` | Exit 0; 8 modules transformed; portable classic-script export finalized | `dist/index.html` and hashed production asset |
| `npm run check:export` | Exit 0; exact manifest, local relative assets, cover dimensions, no symlinks/archives | [export-results.txt](export-results.txt) |
| `npm run test:browser` | Exit 0; 13 checks passed | [browser-results.json](browser-results.json) |
| `npm run test:revision` | Exit 0; 8 checks passed | [revision-results.json](revision-results.json) |
| `npm run test:visual` | Exit 0; 6 configurations passed | [contrast-results.json](contrast-results.json) |
| `git diff --check` | Exit 0 | No whitespace errors |

Build/typecheck were rerun after the final runtime source change. All browser results above target that final export. Ordinary browser runs recorded no unhandled exceptions, failed requests or external runtime requests. The deliberate drawing-failure check records exactly one handled console diagnostic separately.

### Original browser checks (13 passed)

1. Start, metadata and responsive layout.
2. Automated accessibility audit: start screen.
3. Keyboard start and all four steering keys.
4. P, Escape, pause button, resume and frozen simulation.
5. Restart resets the round; sound initializes only after user gesture.
6. Collect, survive 60 seconds, win, three collisions, game over, replay.
7. Personal best persists across reload.
8. Mobile touch drag, visible pause, restart and 320px active HUD.
9. Reduced motion: start scene is static.
10. 200% text enlargement: reflow and complete primary action.
11. Window blur pauses the active round.
12. Opaque-origin sandbox, storage failure, bridge source/protocol/channel checks, pause/resume, gameover score and replay.
13. No browser exceptions, failed requests or external runtime requests.

The 12 unit tests cover start/reset, single collection, collision grace and three-life loss, 60-second win, increasing speed, independent host/manual pause reasons, host pause across restart, bounded steering/resize, clear spawn lanes, bridge validation, opaque-parent/standalone messaging, and fallible storage.

### Revision checks (8 passed)

1. Single product introduction, concise metadata, one-line facts and border-only shell.
2. Idle pond swipe scrolls; playing captures drag; mobile pause omits keyboard hint.
3. Landscape start, complete playfield, HUD, pause, restart and resume at three sizes.
4. Rotating an active portrait round keeps the complete playfield and pause visible.
5. Desktop pause retains keyboard hint and border-only card.
6. Missing roundRect: drawing, countdown, collection, pause and restart continue.
7. Unexpected drawing error stops once, announces recovery, focuses Reload and recovers.
8. No unhandled exceptions, failed requests or external runtime requests.

### Sandbox harness

`tests/serve.mjs` serves the production export at `/preview/` without CORS headers. Its `/harness` uses exactly `sandbox="allow-scripts allow-pointer-lock"`, with no `allow-same-origin`. Chromium raised the expected `SecurityError` on iframe localStorage access; the game remained usable. Init returned ready on the same channel. Invalid protocol, mismatched channel, uninitialized pause and sibling messages were ignored. Parent pause froze time and disabled local resume; matching resume continued. A completed round produced one integer-score gameover (`score: 20`), displayed the session-only save notice and allowed replay. The bridge unit tests also cover standalone self-messages and independent host/manual pause reasons.

## Reproduction, findings and fixes

Original observations are preserved in [reproduction.json](reproduction.json). Full finding IDs and verdicts are in [../.imd-responses.json](../.imd-responses.json). Source locations below refer to the final source; the original reported locations are retained in the request.

| Finding / severity | Source | Reproduction and change | Recheck |
| --- | --- | --- | --- |
| `7ee489…` / high: missing test notes | `README.md:52`, `.gitignore:2`, `artifacts/validation.md:1` | `artifacts/` did not exist; the submitted file list had no artifacts. Local `.git/info/exclude` also hid artifacts and the response JSON. Added report/results/evidence and explicit root-only `.gitignore` exceptions within its documented 512-byte budget, before dependency/cache exclusions so those remain excluded at every depth. No `.git/` edit. | README links resolve; artifacts and responses appear in `git ls-files --others --exclude-standard`. |
| `e4b922…` / medium: stacked introductions | `src/main.ts:31`, `src/main.ts:46`, `src/style.css:77` | At 390px, the kicker preceded a second headline; facts wrapped to 44.19px. Kept one product heading and sentence; removed redundant intro copy and shortened facts. | Start at y=333.69, height 52px; facts one 22.1px line. |
| `1d9ecd…` / medium: duplicated surface treatment | `src/style.css:60`, `src/style.css:94` | Both shell and visible state card had border plus shadow. Removed their shadows. | Computed shadows are `none` on desktop and mobile. |
| `2f33c4…` / low: idle canvas swallows scroll | `src/style.css:62` | A 240px upward idle-canvas swipe scrolled 0px; title swipe scrolled 63px. Changed default touch action to pan-y, with none only while playing. | Real CDP touch swipe scrolls 54px; active drag still moves the frog. |
| `04a3ef…` / low: silent render-loop failure | `src/art.ts:88`, `src/main.ts:247`, `src/main.ts:72` | Deleting roundRect caused an exception and a frozen 1:00 timer. The idle log can trigger this even before play. Added arc-based fallback and one-shot visible error/reload handling. | No-roundRect round reaches 0:56 and scores; injected fillRect failure stops once and reload recovers. |
| `be8469…` / low: phone keyboard pause hint | `src/style.css:170`, `src/style.css:187` | Hint remained visible at 390px touch. Hide it for narrow/coarse-pointer layouts; retain wide fine-pointer hint. | Portrait, three landscape sizes and desktop assertions pass. |
| `0c673a…` / low: landscape playfield hides HUD | `src/style.css:191`, `src/main.ts:237` | At 844×390, Start y=635.55; playing pond top −212.11 and pause off-screen. Added compact short-height layout and align the pond on start/active resize. | At 844×390, Start y=198.39; active pond y=1.39, height 318; pause y=23.53. Also passes 667×375, 568×320 and active rotation. |
| `21fe3e…` / low: surrounding slogans | `src/main.ts:27`, `src/main.ts:81`, `src/main.ts:86` | Confirmed seven decorative lines around the scene. Removed those lines; kept instructions, personal best and attribution. | DOM checks and desktop/mobile screenshots confirm the reduction. |
| `bc88fd…` / low: title slogan | `index.html:7`, `index.html:10` | Title and og:title carried the slogan. Changed both to Pond Dash. | Exact browser assertions and built metadata pass. |
| Follow-up / medium: rules over a lily pad | `src/art.ts:162` | Moving the rules up exposed a decorative pad behind +10 at 320px; measured minimum 1.60:1. Moved that idle-only decoration below the instructions. | 320px now 6.03:1; lowest checked small-text ratio is 5.53:1. |

### Validation repairs and environment limitations encountered

- The first dependency install attempted the read-only default npm cache and failed. Repeating with `/tmp/pond-dash-npm-cache` succeeded. All install artifacts remain outside the repository.
- The provided browser connector could not launch because `/opt/google/chrome/chrome` was absent. Its rendered inspection was not performed. The pinned Playwright browser installer also reported that its headless shell did not support this machine's `ubuntu26.04-x64` platform. Local Playwright successfully launched the preinstalled Chromium after moving its writable XDG directories to `/tmp`; screenshots from that browser were inspected instead.
- One initial reduced-motion PNG equality check failed. Decoding both snapshots found 899 changed pixels of 153,582, with a maximum channel difference of 3 and no visible movement. A repeat of the original test passed without a runtime change. The test now compares pixels, permitting at most 3 channel levels on less than 1% of pixels to account for canvas readback rasterization variation. The final run had **zero changed pixels**. Paused simulation still uses exact canvas equality. This test-only adjustment is in `tests/browser.mjs`.
- The first contrast pass found the lily-pad overlap described above. It was corrected and the production export rebuilt before the final checks. No failing intermediate screenshot is shipped as final evidence.
- The sandbox's accelerated-clock screenshot omitted the iframe's painted surface despite passing DOM and bridge assertions; resuming the clock before capture did not resolve it. `test:revision` now captures a separate real-clock sandbox pause screen, with start/pause/resume assertions. The unusable accelerated screenshot is omitted. The harness also explicitly hides its untrusted sibling iframe, whose general iframe display rule had overridden the HTML hidden attribute. These are test-harness corrections; the game's bridge and runtime did not change for them.

## Better Interface review coverage

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | **Checked** | Native buttons, named regions/controls, keyboard start and four steering keys, focus on play/resume/reload, visible focus screenshot, pause, live error message, touch targets and reduced motion. Axe returned zero violations on start, pause and result, with `color-contrast` marked incomplete. Separate measured contrast covers the start instructions and opaque UI. No screen-reader session, physical-device test or full conformance claim. |
| Layout | **Checked** | Entry/action at 390×844; no horizontal overflow at 320, 390, 640, 900 and 1440; three landscape sizes; rotation during active play; growing layout at 200% text. Screenshots inspected. Native browser zoom and localized/RTL variants were not tested. |
| Writing | **Checked** | One product heading/description; rules beside Start; concise metadata; device-appropriate pause hint; original result voice retained; drawing error explains reload. No form or account copy applies. |
| Typography | **Checked** | Existing six-size scale, two system-font stacks, title/state hierarchy, tabular HUD numerals; facts single-line at default size; 200% text screenshot inspected. Individual installed font faces and cross-platform fallback appearance were not verified. |
| Colors | **Checked, bounded measurement** | Existing semantic palette retained. `test:visual` samples actual reduced-motion canvas pixels under rules/facts text ranges at five widths and 200% text, plus computed opaque UI pairs. Minimum 5.53:1 for small text across those configurations. This does not establish contrast over every animated frame or translucent state. |
| UI | **Checked** | Border-only shell/state cards; hover/press/focus styles reviewed; start, playing, paused, win, loss, fallback and error/reload states exercised; sound is gesture-gated. Motion preferences checked; animation-panel replay at 10% speed and listening on physical audio hardware were not performed. |

Not applicable: forms, checkout, wallet/account flows, network loading skeletons, navigation routes, alternate theme, localization and global modal dialogs. These features were not added merely to fill review coverage.

## Screenshots and measurements

The browser scripts generated real screenshots in [screenshots/](screenshots/). Inspected examples: `desktop-start.png`, `mobile-start.png`, `narrow-start.png`, `start-640.png`, `keyboard-focus.png`, `desktop-paused.png`, `mobile-paused.png`, `desktop-playing.png`, `desktop-won.png`, `desktop-lost.png`, `text-enlargement.png`, `landscape-start.png`, `landscape-844-playing.png`, `landscape-paused.png`, `drawing-error.png`, `roundrect-fallback.png` and `sandbox-paused.png`.

Measured opaque pairs: page text 13.50:1, muted page text 8.03:1, primary action text 8.83:1, control-bar text 7.05:1, sound icon 8.27:1. Full data and per-width samples are in `contrast-results.json`. Small-text threshold used by this audit is 4.5:1. Glyph anti-aliasing itself is not used as the foreground color; computed text color is compared with sampled underlying canvas pixels.

## Remaining limitations and delivery

Chromium is the only engine exercised. No WebKit/Safari, Firefox, physical phone, screen-reader session or browser-native zoom test was performed. Emulating a missing canvas method checks that fallback, not all behavior of an older browser. Root font enlargement is not browser-native zoom. The timed canvas slalom remains a visual game without a nonvisual equivalent; automated accessibility checks are not full accessibility certification. Relative OG image metadata is shipped as requested, but social crawlers were not exercised against a hosted URL.

`dist/` is complete and ready for the contributor submission process, with local relative assets and no network service requirement. `artifacts/submission-size.json` records the final payload and packaging estimate against the 8 MiB limit. No `.git/` write, commit command, deployment, admin action or submission API call was performed. The coordinator handles Git packaging and hosting; administrator review follows submission.
