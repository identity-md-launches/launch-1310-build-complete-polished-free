import test from 'node:test';
import assert from 'node:assert/strict';
import { PondGame, ROUND_SECONDS } from '../src/game.ts';
import { ParentBridge } from '../src/bridge.ts';
import { readBest, readSetting, writeSetting } from '../src/storage.ts';

function advance(game: PondGame, seconds: number, direction = 0) {
  for (let n = 0; n < Math.ceil(seconds * 60); n++) game.step(1 / 60, direction);
}
function entity(game: PondGame, kind: 'firefly' | 'log') {
  return { id: 99, kind, x: game.x, y: game.playerY, width: 80, drift: 0, rotation: 0 };
}
test('round starts with three lives and resets all previous run state', () => {
  const game = new PondGame();
  assert.equal(game.phase, 'idle');
  game.start(); game.score = 180; game.lives = 1; game.elapsed = 30; game.pause();
  game.start();
  assert.equal(game.phase, 'playing'); assert.equal(game.score, 0); assert.equal(game.lives, 3);
  assert.equal(game.remaining, 60); assert.equal(game.entities.length, 0); assert.equal(game.invulnerable, 0);
});
test('firefly gives ten integer points and is collected once', () => {
  const game = new PondGame(); game.start(); game.entities.push(entity(game, 'firefly'));
  game.step(1 / 60); assert.equal(game.score, 10); assert.deepEqual(game.takeEvents().map(e => e.type), ['collect']);
  advance(game, 0.2); assert.equal(game.score, 10);
});
test('log takes one life with a grace period, third separate hit ends round once', () => {
  const game = new PondGame(); game.start();
  game.entities.push(entity(game, 'log'), entity(game, 'log')); game.step(1 / 60);
  assert.equal(game.lives, 2); assert.ok(game.invulnerable > 1);
  game.entities = [entity(game, 'log')]; game.step(1 / 60); assert.equal(game.lives, 2);
  for (let n = 0; n < 2; n++) { game.invulnerable = 0; game.entities = [entity(game, 'log')]; game.step(1 / 60); }
  assert.equal(game.phase, 'lost'); assert.equal(game.lives, 0);
  assert.equal(game.takeEvents().filter(e => e.type === 'finish').length, 1);
  advance(game, 2); assert.equal(game.takeEvents().length, 0);
});
test('surviving 60 seconds wins, freezes score, and reports finish once', () => {
  const game = new PondGame(() => 0); game.start(); game.steerTo(game.width - game.margin);
  advance(game, 61); assert.equal(game.phase, 'won'); assert.equal(game.remaining, 0); assert.equal(game.elapsed, ROUND_SECONDS);
  assert.equal(game.takeEvents().filter(e => e.type === 'finish').length, 1);
  advance(game, 3); assert.equal(game.takeEvents().length, 0);
});
test('speed increases continuously and entities stay bounded over an entire run', () => {
  const game = new PondGame(() => 0.2); game.start(); game.steerTo(game.width - game.margin);
  const initialSpeed = game.speed;
  advance(game, 20); assert.ok(game.speed > initialSpeed); assert.ok(game.entities.length < 30);
  advance(game, 20); assert.ok(game.speed > initialSpeed * 1.6); assert.ok(game.entities.length < 30);
  assert.ok(game.entities.every(e => Number.isFinite(e.x) && Number.isFinite(e.y)));
});
test('both pause sources freeze simulation; each must resume separately', () => {
  const game = new PondGame(); game.start(); advance(game, 2); game.pause(); game.pause('host');
  const before = JSON.stringify([game.elapsed, game.entities, game.x]);
  advance(game, 3, 1); assert.equal(JSON.stringify([game.elapsed, game.entities, game.x]), before);
  game.resume(); assert.equal(game.phase, 'paused');
  game.resume('host'); assert.equal(game.phase, 'playing');
  advance(game, 0.5); assert.ok(game.elapsed > 2);
});
test('host pause before start persists through start and restart', () => {
  const game = new PondGame(); game.pause('host'); game.start(); assert.equal(game.phase, 'paused');
  game.start(); assert.equal(game.phase, 'paused'); game.resume('host'); assert.equal(game.phase, 'playing');
});
test('steering clamps at both banks, resizing preserves position, bad deltas ignored', () => {
  const game = new PondGame(); game.start(); advance(game, 4, -1); assert.equal(game.x, game.margin);
  advance(game, 4, 1); assert.equal(game.x, game.width - game.margin);
  game.steerTo(500); game.resize(390, 537); assert.equal(game.x, 195);
  const elapsed = game.elapsed; game.step(NaN); game.step(Infinity); game.step(-1); assert.equal(game.elapsed, elapsed);
});
test('each generated wave has clear lanes and no firefly placed on a log lane', () => {
  for (const random of [0, 0.19, 0.4, 0.6, 0.99]) {
    const game = new PondGame(() => random); game.elapsed = 45; game.spawn();
    const logs = game.entities.filter(e => e.kind === 'log'); const flies = game.entities.filter(e => e.kind === 'firefly');
    assert.ok(logs.length <= 2); assert.ok(flies.every(f => logs.every(log => Math.abs(f.x - log.x) > log.width)));
  }
});
function bridgeFixture() {
  const sent: unknown[] = [], actions: string[] = [];
  const parent = { postMessage: (message: unknown, origin: string) => sent.push({ message, origin }) };
  const host = { parent, addEventListener() {}, removeEventListener() {} };
  const bridge = new ParentBridge(host as unknown as Window, action => actions.push(action));
  const receive = (data: unknown, source: unknown = parent, origin = 'https://host.example') => bridge.receive({ data, source, origin } as MessageEvent);
  return { bridge, parent, host, sent, actions, receive };
}
test('bridge only accepts parent, correct protocol, valid init and matching channel', () => {
  const f = bridgeFixture();
  const init = { protocol: 'pepe-game/1', type: 'init', channel: 'test-channel' };
  f.receive(init, {}); f.receive({ ...init, protocol: 'other' }); f.receive({ ...init, channel: '' });
  f.receive({ ...init, type: 'pause' }); f.receive(null); f.receive('init');
  assert.equal(f.sent.length, 0); assert.equal(f.actions.length, 0);
  f.receive(init);
  assert.deepEqual(f.sent, [{ message: { ...init, type: 'ready' }, origin: 'https://host.example' }]);
  f.receive({ ...init, type: 'pause', channel: 'wrong' }); f.receive({ ...init, type: 'pause' }, {});
  assert.equal(f.actions.length, 0);
  f.receive({ ...init, type: 'pause' }); f.receive({ ...init, type: 'resume' });
  assert.deepEqual(f.actions, ['pause', 'resume']);
  f.bridge.send('gameover', 123.9);
  assert.deepEqual(f.sent[1], { message: { protocol: 'pepe-game/1', type: 'gameover', channel: 'test-channel', score: 123 }, origin: 'https://host.example' });
});
test('opaque parent uses wildcard reply; standalone self-messages ignored', () => {
  const f = bridgeFixture(); f.receive({ protocol: 'pepe-game/1', type: 'init', channel: 'opaque' }, f.parent, 'null');
  assert.equal((f.sent[0] as { origin: string }).origin, '*');
  const self = { parent: null as unknown, addEventListener() {}, removeEventListener() {} }; self.parent = self;
  const standalone = new ParentBridge(self as unknown as Window, () => assert.fail());
  standalone.receive({ source: self, data: { protocol: 'pepe-game/1', type: 'init', channel: 'x' } } as unknown as MessageEvent);
  assert.equal(standalone.channel, null);
});
test('storage getter and setItem failures are caught; invalid best is rejected', () => {
  const root = globalThis as unknown as { window: unknown };
  root.window = Object.defineProperty({}, 'localStorage', { get() { throw new Error('SecurityError'); } });
  assert.equal(readSetting('anything'), null); assert.equal(readBest(), 0); assert.equal(writeSetting('x', 'y'), false);
  for (const invalid of ['NaN', '-7', '0.5', 'Infinity', '99999999999999999999999999999']) {
    root.window = { localStorage: { getItem: () => invalid } }; assert.equal(readBest(), 0);
  }
  root.window = { localStorage: { getItem: () => '70', setItem() { throw new Error('QuotaExceededError'); } } };
  assert.equal(readBest(), 70); assert.equal(writeSetting('x', 'y'), false);
});
