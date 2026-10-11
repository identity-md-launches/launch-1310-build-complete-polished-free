# Pond Dash design system

## Overview

Pond Dash is a small, free single-player arcade game for Pepe2Pepe. Its visual direction is an illustrated moonlit pond: deep teal water, a pale mint frog, gold fireflies, and lavender controls. The start screen introduces the rules beside the actual game scene. The main action is visible at 390 pixels wide. During a round, the introduction disappears and the pond becomes the playfield.

The composition pairs an expressive Georgia-style serif with quiet sans-serif UI. One lavender filled action leads each state. The artwork, rather than additional cards or badges, provides character. These are page-specific game patterns, not a general dashboard component library.

Source of truth: `src/style.css` for interface tokens and layout; `src/art.ts` for the canvas palette and original drawing functions; `src/main.ts` for the state and control markup.

## Colors

All colors use sRGB hex values. CSS components consume semantic variables where a shared role exists.

| Semantic token | Primitive / value | Use |
| --- | --- | --- |
| `--color-page` | `--teal-950`: `#0b2426` | Whole-page background |
| `--color-surface` | `--teal-900`: `#102f32` | Control bar and toolbar controls |
| `--color-surface-hover` | `--teal-850`: `#143a3d` | Hovered secondary controls |
| `--color-border` | `--teal-700`: `#396360` | Shell, state card and control structure |
| `--color-text` | `--mint-100`: `#e4eddf` | Titles and primary text |
| `--color-text-muted` | `--mint-500`: `#a3bcb2` | Instructions, labels and supporting copy |
| `--color-accent` | `--lavender-300`: `#cfbdf1` | Primary fills and secondary action icons |
| `--color-accent-hover` | `--lavender-200`: `#e0d1fb` | Hovered primary fill / secondary label |
| `--color-on-accent` | `#292239` | Text and icons on lavender fills |
| `--color-focus` | `--gold-300`: `#f7d77b` | Visible keyboard outline |
| `--color-reward` | `--gold-300`: `#f7d77b` | Score and firefly indicators |

`--mint-300` (`#bad8c0`) is used for the brand mark, full hearts, and scene labels. The opaque state card uses `#103337`; the game-state scrim uses `#09282dcc`. Canvas water interpolates from `#09262c` through `#103c42` to `#164b4e`. Frog skin is `#bce5ba`, its belly `#deedc8`, and scarf `#bdb0e8`; the pad is `#4d9e7c`. The log uses brown `#a67b55` with pale cut ends. These illustration colors encode scenery and game objects, not controls. Hits have a restrained peach dashed halo (`#eab7a8`) and a “−1 life” label; collection has a “+10” label. Color never carries the score or loss of a life alone.

Measured opaque UI pairs: primary page text 13.50:1, muted page text 8.03:1, primary-button text 8.83:1, control-bar text 7.05:1, and toolbar icon 8.27:1. These measurements use browser-computed colors. Conservative sampling of the reduced-motion start scene’s text-line backgrounds passed at all checked widths (minimum small-text ratio 4.68:1). The dynamic canvas and translucent overlay cannot be reduced to one universal contrast ratio; scope and measurement details are in `artifacts/validation.md`. There is one intentional dark theme; no alternate theme is implemented.

## Typography

The body stack is `Trebuchet MS, Arial, sans-serif`; the display stack is `Georgia, Times New Roman, serif`. All are system fonts with no downloads. Native fallback substitutions can vary across operating systems; the browser-computed family string does not prove a particular installed font was used. Normal 400 and bold 700 styles are requested; the small control-bar sign-off uses native italic. `font-synthesis: none` prevents artificial faces.

The interface has six size tokens, defined in `src/style.css:26`:

| Token | Default | Roles |
| --- | --- | --- |
| `--text-small` | 0.8125rem / 13px | HUD labels, instructions, captions, keycaps |
| `--text-body` | 0.9375rem / 15px | Body and button labels |
| `--text-lead` | 1.125rem / 18px | Brand and mobile HUD numbers |
| `--text-stat` | 1.5rem / 24px | Desktop HUD numbers and mobile state heading |
| `--text-heading` | 2.625rem / 42px | State headings, intermediate/mobile intro |
| `--text-display` | 4rem / 64px | Page title, desktop intro and result score |

At 40rem and below, display becomes 2.625rem. The H1 and introduction intentionally share the display role on wide screens; state headings are smaller. The small canvas feedback uses 15px bold Arial, matching the body size, and stays out of the DOM heading hierarchy.

Body line height is 1.5. H1 is 1.1, state H2 is 1.05, and the two-line desktop introduction is 0.99. Short display text has negative tracking: −0.055em for H1 and −0.035em for H2. Paragraphs use `text-wrap: pretty`; headings use `text-wrap: balance`. Supporting copy is capped at 340px, then 280px at intermediate sizes and 255px on mobile. Timers, scores and best values use tabular numbers. No text is truncated, and ordinary interface text remains selectable.

## Layout

The header, main content and footer share a centered maximum width of 1120px. Wide pages have 40px side gutters; at 60rem they reduce to 24px; at 40rem they reduce to 16px. The page follows a simple order: brand, title, playable scene, controls, best score, footer. Layout uses logical inline/block properties except where physical canvas coordinates are intentional.

Common spacing is 4–8px within small control groups, 12–20px between related elements, 24–32px for sections, and 48–52px for the desktop scene inset. The HUD has a separate zone across the top of the pond. The introductory copy remains in normal flow, with top and bottom margins reserved for the HUD and illustration. The absolutely positioned canvas fills that growing surface. The scene has a minimum height of `max(538px, 33.625rem)` on desktop and `max(537px, 33.5625rem)` on mobile, so 200% text enlargement expands the illustration area instead of clipping the main action.

Implemented breakpoints:

- **≤60rem:** 24px page gutters, 32px intro inset, smaller intro heading, vertical rule list, and the optional control-bar sign-off disappears.
- **≤40rem:** 16px gutters, 70px minimum header, 42px title/intro, narrow portrait scene, and a small frog illustration near the bottom. Nonessential header copy and scene caption disappear. Touch instructions replace keycaps. Toolbar restart moves to the pause screen; pause and sound stay visible.
- **≤23rem:** HUD gaps and control widths tighten to fit 320px; round facts use a 130px measure to clear the frog illustration. Controls remain at least 35 × 44px with gaps, above the 24 × 24px baseline.
- **Coarse pointer above 40rem:** touch steering instructions replace keyboard steering hints.

The drawing canvas uses CSS-pixel coordinates and a device-pixel ratio capped at 2. Resizing preserves proportional player/object positions, then clamps the player inside the pond. At 390 × 844 the title and Start drifting button are visible without scrolling. Viewports of 320, 390, 640, 900 and 1440 CSS pixels were checked; screenshots were visually inspected at representative mobile, intermediate and desktop widths. Text enlargement was checked separately from native browser zoom.

## Elevation & Depth

The page uses tonal depth, not a stack of floating cards. The game shell has a 1px structural border and `0 18px 50px #041a1d33` shadow. The pause/result scrim dims the existing scene and uses a 7px backdrop blur; the centered card has an opaque fill and `0 12px 32px #061d2433` shadow. The HUD is above the state screen, with pointer events enabled only on its controls. The canvas is the base layer, in-flow intro/state screens are layer 2, and HUD is layer 3. The skip link is layer 10.

Canvas glows are restrained radial gradients around the fireflies; ripples and trails are thin lines at low opacity. There is no screen shake or full-screen flash. A hit changes the frog’s expression, removes one heart, and shows a dashed recovery halo and short label.

## Shapes

The shell is rounded 20px on desktop and 16px on mobile. State cards use 20px radii, main actions 10px, keycaps 5px, and desktop toolbar controls circles. Mobile toolbar controls use 12px radii to retain space for pause and sound. Buttons have a minimum height of 44px, with primary actions at least 52px. Irregular lily leaves, curved frog anatomy and tapered reeds belong to the illustration; the interface geometry stays simple.

## Components

These patterns are implemented directly in `src/main.ts` and `src/style.css`, not exported as a component library:

| Pattern | Classes / symbols | Behavior |
| --- | --- | --- |
| Primary action | `.primary-button` | Start, resume, replay; one filled action per visible screen; hover fill and 0.96 press scale |
| Toolbar action | `.icon-button`, `icon()` | Named pause, restart and sound buttons; 1.7px `currentColor` SVG strokes; sound exposes `aria-pressed`; unavailable host resume uses native disabled |
| Text action | `.text-button` | Restart from pause; explicit verb, visible keyboard focus |
| Round status | `.hud`, `.hud-stat`, `#lives` | Tabular score and timer; hearts have a named image role and solid/outline states |
| Introduction | `.intro`, `.rules`, `.round-facts` | Brief description, score/life rules, start action and round facts before play |
| Pause/result | `.state-screen`, `.state-card` | In-game named sections, not global modal dialogs; move focus to resume or replay while leaving toolbar sound accessible |
| Instructions | `.control-bar`, `kbd`, `.touch-hint` | Keyboard shortcuts on pointer desktops; drag instruction on narrow/coarse-pointer devices |
| Announcements | `#status` | Stable polite live region for start, pause, hits, sound and final result; does not announce every animation frame |
| Original artwork | `drawFrog`, `drawPad`, `drawFirefly`, `drawLog`, `PondRenderer` | Procedural local illustration, used at portrait and gameplay scales |

Focus is a 3px gold perimeter with 4px offset; the canvas uses an inset outline so the shell does not clip it. In forced-colors mode the ring uses `Highlight` and controls retain system-color borders. Keyboard start, focus return on resume, and focus on replay were exercised. These state panels are sections within the game, so there is no modal focus trap.

Reduced motion disables decorative bobbing, flowing scenery, lean, trails, and particle movement. Essential obstacles/player motion begins only after Start drifting. CSS hover/press transitions run only with `prefers-reduced-motion: no-preference`, are 150ms, and use `cubic-bezier(0.2, 0, 0, 1)` for press transforms. Every result and hit also has a persistent or textual cue. Reduced motion does not alter game difficulty.

No forms, loading skeletons, network errors, account menus or theme selectors are present. If canvas cannot initialize, the start region explains that another HTML5-capable browser is needed. Storage and audio failures are caught without interrupting the game. A failed best-score save produces a visible session-only notice.

## Do’s and don’ts

- Reuse the root semantic colors, six-size scale and shared content width for related game pages.
- Use a single lavender filled action for the main next step. Keep secondary actions visibly actionable but quieter.
- Keep essential instructions and controls as real HTML, even when the game itself is canvas-rendered.
- Preserve the frog’s pale mint silhouette and the distinct gold firefly/brown log shapes. Keep scenery out of instructional text.
- Allow text containers to grow. Keep game-only dragging on the canvas, and allow normal scrolling outside it.
- Preserve local assets, relative URLs and the parent/channel checks when extending the game.

To add a related informational page, reuse the header/main/footer width, H1 token, normal prose colors and primary/text button patterns. Give it ordinary flowing content; the tall pond stage and HUD are game-specific. Consult the validation record before making claims about untested assistive technologies or platforms.
