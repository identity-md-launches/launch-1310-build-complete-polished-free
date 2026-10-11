import './style.css';
import { PondGame } from './game.ts';
import { PondRenderer } from './art.ts';
import { ParentBridge } from './bridge.ts';
import { PondAudio } from './audio.ts';
import { BEST_KEY, SOUND_KEY, readBest, readSetting, writeSetting } from './storage.ts';

const icons = {
  play: '<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 5v14M16 5v14"/>',
  restart: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  silent: '<path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sparkle: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
function icon(name: keyof typeof icons, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`; }
const frogMark = `<svg class="frog-mark" viewBox="0 0 48 40" fill="none" aria-hidden="true"><path d="M5 25C4 18 5 8 14 7c5-1 7 2 10 5 4-5 6-6 11-5 8 2 10 11 8 19-3 12-34 13-38-1Z" fill="currentColor"/><ellipse cx="15" cy="17" rx="4" ry="5" fill="#153e36"/><ellipse cx="33" cy="17" rx="4" ry="5" fill="#153e36"/><path d="M15 28q10 8 20-2" stroke="#153e36" stroke-width="2" stroke-linecap="round"/></svg>`;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <a class="skip-link" href="#pond">Skip to game</a>
  <header class="site-header">
    <div class="brand">${frogMark}<span>Pepe2Pepe</span><span class="brand-divider"></span><span class="brand-note">Small games. Good times.</span></div>
    <span class="free-label"><span></span>Always free to play</span>
  </header>
  <main>
    <section class="title-row" aria-labelledby="game-title">
      <div><h1 id="game-title">Pond Dash<span class="title-dot">.</span></h1><p>A little frog. A big night.</p></div>
      <div class="round-tag">${icon('moon')}<span>A one-minute pond escape</span></div>
    </section>
    <section id="pond" class="game-shell" data-phase="idle" aria-label="Pond Dash game">
      <div class="pond-surface">
        <canvas id="game-canvas" tabindex="0" aria-label="Pond Dash play area" aria-describedby="play-instructions">Steer with the arrow keys or A and D. Drag on touchscreens. Collect fireflies and dodge logs.</canvas>
        <div class="hud" role="group" aria-label="Round status">
          <div class="hud-stat score-stat">${icon('sparkle')}<span><span class="stat-label">Score</span><strong id="score">000</strong></span></div>
          <div class="hud-stat time-stat">${icon('clock')}<span><span class="stat-label">Time left</span><strong id="timer">1:00</strong></span></div>
          <div class="hud-stat life-stat"><span class="stat-label">Lives</span><span id="lives" role="img" aria-label="3 lives remaining">${icon('heart')}${icon('heart')}${icon('heart')}</span></div>
          <div class="game-tools">
            <button id="pause" class="icon-button" aria-label="Pause game" title="Pause (P or Escape)" hidden>${icon('pause')}</button>
            <button id="restart" class="icon-button" aria-label="Restart game" title="Restart game" hidden>${icon('restart')}</button>
            <button id="sound" class="icon-button" aria-label="Sound" aria-pressed="false" title="Turn sound on">${icon('silent')}</button>
          </div>
        </div>
        <section class="intro" id="intro" aria-labelledby="intro-title">
          <span class="intro-tag">${icon('moon')}The pond is calling</span>
          <h2 id="intro-title">Go with<br> the glow.</h2>
          <p class="intro-copy">Surf a lily pad through a moonlit pond.<br class="desktop-break"> A little focus. A little frog magic.</p>
          <div class="rules"><span><span class="firefly-mini" aria-hidden="true">✦</span>Catch fireflies <b>+10</b></span><span><span class="log-mini" aria-hidden="true"></span>Dodge logs <b>−1 life</b></span></div>
          <button id="start" class="primary-button">Start drifting ${icon('arrow')}</button>
          <p class="round-facts">60 seconds <span>·</span> 3 lives <span>·</span> One happy frog</p>
        </section>
        <section id="pause-screen" class="state-screen" aria-labelledby="pause-title" hidden>
          <div class="state-card">
            <span class="state-emblem">${icon('moon')}</span>
            <h2 id="pause-title">A little breather.</h2>
            <p id="pause-copy">Your lily pad isn’t going anywhere.</p>
            <button id="resume" class="primary-button">Resume drifting ${icon('play')}</button>
            <button id="pause-restart" class="text-button">${icon('restart')}Restart round</button>
            <p class="state-hint">P or Escape to resume</p>
          </div>
        </section>
        <section id="result-screen" class="state-screen" aria-labelledby="result-title" hidden>
          <div class="state-card">
            <span class="state-emblem gold">${icon('sparkle')}</span>
            <h2 id="result-title">What a drift.</h2>
            <p id="result-copy"></p>
            <div class="result-score"><strong id="final-score">0</strong><span>points collected</span></div>
            <p id="result-detail" class="result-detail"></p>
            <button id="again" class="primary-button">Drift again ${icon('arrow')}</button>
            <p class="state-hint" id="result-best"></p>
          </div>
        </section>
        <div class="current-label" id="current-label" hidden><span class="current-bars" aria-hidden="true"><i></i><i></i><i></i></span><span id="current-text">Easy current</span></div>
        <div class="scene-caption" id="scene-caption"><span>Somewhere, after moonrise</span><span>☾</span></div>
      </div>
      <div class="control-bar" id="play-instructions">
        <div class="steering-hint"><span class="keyboard-hint"><kbd>←</kbd><kbd>→</kbd><span>or</span><kbd>A</kbd><kbd>D</kbd><span>to steer</span></span><span class="touch-hint">↔ <span>Drag on the pond to steer</span></span></div>
        <span class="pause-hint"><kbd>P</kbd><span>or</span><kbd>Esc</kbd><span>to pause</span></span>
        <span class="control-note">Follow the fireflies. Mind the logs.</span>
      </div>
    </section>
    <div class="below-game"><p>${icon('heart')} Made for a moment of play.</p><p>Personal best <strong id="best-score">0</strong><span class="best-unit">pts</span></p></div>
    <p id="save-note" class="save-note" hidden>Best score stays in this session. Browser storage is unavailable.</p>
    <p id="status" class="sr-only" role="status" aria-live="polite"></p>
  </main>
  <footer class="site-footer"><span>Pond Dash <span class="footer-separator">/</span> A Pepe2Pepe game</span><span>No downloads. Just drift.</span></footer>
`;
function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const game = new PondGame();
const canvas = el<HTMLCanvasElement>('game-canvas');
let renderer: PondRenderer;
try { renderer = new PondRenderer(canvas); }
catch {
  el('intro').innerHTML = '<h2>Let’s try another browser.</h2><p>This browser cannot display the pond. Open Pond Dash in a browser with HTML5 canvas support.</p>';
  throw new Error('Pond Dash requires HTML5 canvas support.');
}
const audio = new PondAudio();
audio.enabled = readSetting(SOUND_KEY) === 'on';
let best = readBest();
let phase = game.phase;
let animationTime = 0;
let lastTime = 0;
let dragId: number | null = null;
let previousPointerX = 0;
const keys = new Set<string>();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
renderer.reduced = reducedMotion.matches;
reducedMotion.addEventListener('change', event => { renderer.reduced = event.matches; });

const bridge = new ParentBridge(window, action => {
  if (action === 'pause') game.pause('host'); else game.resume('host');
  keys.clear(); dragId = null;
  sync();
});
function announce(text: string) { el('status').textContent = text; }
function updateSound() {
  const button = el<HTMLButtonElement>('sound');
  button.setAttribute('aria-pressed', String(audio.enabled));
  button.title = audio.enabled ? 'Turn sound off' : 'Turn sound on';
  button.innerHTML = icon(audio.enabled ? 'sound' : 'silent');
}
function start() {
  game.start(); keys.clear(); dragId = null; renderer.particles = [];
  void audio.unlock().then(() => audio.tone('start'));
  announce('Round started. Three lives. Collect fireflies and dodge logs.');
  sync();
  if (game.phase === 'playing') canvas.focus({ preventScroll: true });
}
function togglePause() {
  if (game.phase === 'playing') game.pause();
  else if (game.phase === 'paused') game.resume();
  keys.clear(); dragId = null; sync();
}
let displaySignature = "";
function sync() {
  const signature = [game.phase, game.score, game.remaining, game.lives, best, Math.floor(game.elapsed / 20), ...game.pauses].join(":");
  if (displaySignature === signature) return;
  displaySignature = signature;
  el('score').textContent = String(game.score).padStart(3, '0');
  el('timer').textContent = `${Math.floor(game.remaining / 60)}:${String(game.remaining % 60).padStart(2, '0')}`;
  el('lives').setAttribute('aria-label', `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} remaining`);
  [...el('lives').children].forEach((heart, i) => heart.classList.toggle('empty', i >= game.lives));
  el('best-score').textContent = String(best);
  const current = game.elapsed < 20 ? 'Easy current' : game.elapsed < 40 ? 'Picking up speed' : 'Fast current';
  el('current-text').textContent = current;
  el('current-label').dataset.level = String(Math.min(3, 1 + Math.floor(game.elapsed / 20)));
  const active = game.phase === 'playing' || game.phase === 'paused';
  el('pause').hidden = !active;
  el('pause').setAttribute('aria-label', game.phase === 'paused' ? 'Resume game' : 'Pause game');
  el('pause').innerHTML = icon(game.phase === 'paused' ? 'play' : 'pause');
  el('restart').hidden = game.phase === 'idle';
  el('intro').hidden = game.phase !== 'idle';
  el('pause-screen').hidden = game.phase !== 'paused';
  el('result-screen').hidden = !game.outcome;
  el('current-label').hidden = !active;
  el('scene-caption').hidden = game.phase !== 'idle';
  el('pond').dataset.phase = game.phase;
  canvas.tabIndex = game.phase === 'playing' ? 0 : -1;
  const hostPaused = game.pauses.has('host');
  el<HTMLButtonElement>('resume').disabled = hostPaused;
  el<HTMLButtonElement>('pause').disabled = hostPaused;
  if (hostPaused) el('pause').setAttribute('aria-label', 'Game paused by host');
  el('pause-copy').textContent = hostPaused ? 'The host has paused this round. Your progress is safe.' : 'Your lily pad isn’t going anywhere.';
  el('resume').innerHTML = hostPaused ? 'Waiting for host' : `Resume drifting ${icon('play')}`;
  el('pause-screen').querySelector<HTMLElement>('.state-hint')!.hidden = hostPaused;
  if (phase !== game.phase) {
    phase = game.phase;
    if (phase === 'paused') {
      announce(hostPaused ? 'Game paused by host.' : 'Game paused.');
      (hostPaused ? el('pause-title') : el('resume')).focus({ preventScroll: true });
    } else if (phase === 'playing') { canvas.focus({ preventScroll: true }); }
    else if (game.outcome) {
      const won = game.outcome === 'won';
      el('result-title').textContent = won ? 'What a drift.' : 'A splash too far.';
      el('result-copy').textContent = won ? 'One minute, beautifully spent. You made it.' : 'The pond wins this one. There’s always another drift.';
      el('final-score').textContent = String(game.score);
      el('result-detail').textContent = `${game.score / 10} fireflies · ${won ? '60' : Math.floor(game.elapsed)} seconds · ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left`;
      el('result-best').textContent = game.score > 0 && game.score >= best ? 'A personal best. Nicely drifted.' : `Personal best: ${best} points`;
      el('again').focus({ preventScroll: true });
      announce(`${won ? 'Round complete' : 'Game over'}. ${game.score} points. Select Drift again to restart.`);
    }
  }
}
el('pause-title').tabIndex = -1;
for (const id of ['start', 'restart', 'pause-restart', 'again']) el(id).addEventListener('click', start);
for (const id of ['pause', 'resume']) el(id).addEventListener('click', () => { void audio.unlock(); togglePause(); });
el('sound').addEventListener('click', () => {
  audio.enabled = !audio.enabled;
  if (!audio.enabled && audio.context) void audio.context.suspend().catch(() => {});
  writeSetting(SOUND_KEY, audio.enabled ? 'on' : 'off');
  void audio.unlock().then(() => audio.tone('collect'));
  updateSound();
  announce(`Sound ${audio.enabled ? 'on' : 'off'}.`);
});
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if ((key === 'p' || key === 'escape') && (game.phase === 'playing' || game.phase === 'paused')) {
    event.preventDefault();
    if (!event.repeat) togglePause();
  }
  if (game.phase === 'playing' && ['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
    event.preventDefault(); keys.add(key);
  }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
function pauseOnLeave() {
  keys.clear(); dragId = null;
  if (game.phase === 'playing') { game.pause(); sync(); }
}
window.addEventListener('blur', pauseOnLeave);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnLeave(); });
canvas.addEventListener('pointerdown', event => {
  if (game.phase !== 'playing' || dragId !== null) return;
  dragId = event.pointerId; previousPointerX = event.clientX;
  canvas.setPointerCapture(event.pointerId);
  canvas.focus({ preventScroll: true });
  void audio.unlock();
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== dragId || game.phase !== 'playing') return;
  const dx = (event.clientX - previousPointerX) * (game.width / canvas.getBoundingClientRect().width);
  previousPointerX = event.clientX;
  game.steerTo(game.x + dx);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { dragId = null; });
const resizeObserver = new ResizeObserver(entries => {
  const { width, height } = entries[0].contentRect;
  if (width <= 0 || height <= 0) return;
  game.resize(width, height); renderer.resize(width, height);
});
resizeObserver.observe(canvas);
function frame(timestamp: number) {
  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
  lastTime = timestamp;
  const direction = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
  game.step(dt, direction);
  for (const event of game.takeEvents()) {
    renderer.event(event);
    if (event.type === 'collect') audio.tone('collect');
    if (event.type === 'hit') { audio.tone('hit'); announce(`${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left. Watch the logs.`); }
    if (event.type === 'finish') {
      if (game.score > best) {
        best = game.score;
        if (!writeSetting(BEST_KEY, String(best))) el('save-note').hidden = false;
      }
      audio.tone(game.outcome === 'won' ? 'win' : 'hit');
      bridge.send('gameover', game.score);
    }
  }
  if (game.phase === 'idle' || game.phase === 'playing') animationTime += dt;
  renderer.render(game, animationTime, dt, direction);
  sync();
  requestAnimationFrame(frame);
}
updateSound(); sync(); requestAnimationFrame(frame);
