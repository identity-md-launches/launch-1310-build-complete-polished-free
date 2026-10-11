export type Phase = 'idle' | 'playing' | 'paused' | 'won' | 'lost';
export type PauseReason = 'manual' | 'host';
export type GameEvent = { type: 'collect' | 'hit' | 'finish'; x: number; y: number };
export type Entity = { id: number; kind: 'firefly' | 'log'; x: number; y: number; width: number; drift: number; rotation: number };
export const ROUND_SECONDS = 60;
export const POINTS_PER_FIREFLY = 10;

/** Game rules are independent of the renderer, browser, storage and audio. */
export class PondGame {
  width = 1000;
  height = 560;
  x = 500;
  elapsed = 0;
  score = 0;
  lives = 3;
  invulnerable = 0;
  entities: Entity[] = [];
  events: GameEvent[] = [];
  pauses = new Set<PauseReason>();
  started = false;
  outcome: 'won' | 'lost' | null = null;
  spawnClock = 0.6;
  wave = 0;
  nextId = 0;
  random: () => number;

  constructor(random: () => number = Math.random) { this.random = random; }
  get phase(): Phase {
    if (!this.started) return 'idle';
    if (this.outcome) return this.outcome;
    return this.pauses.size ? 'paused' : 'playing';
  }
  get radius() { return this.width < 600 ? 19 : 24; }
  get playerY() { return this.height * 0.78; }
  get speed() { return this.height * (0.25 + 0.25 * this.elapsed / ROUND_SECONDS); }
  get remaining() { return Math.max(0, Math.ceil(ROUND_SECONDS - this.elapsed)); }
  get margin() { return this.radius + (this.width < 600 ? 14 : 36); }

  resize(width: number, height: number) {
    const ratio = width / this.width;
    this.x *= ratio;
    for (const entity of this.entities) {
      entity.x *= ratio;
      entity.y *= height / this.height;
      entity.width *= ratio;
    }
    this.width = width;
    this.height = height;
    this.steerTo(this.x);
  }
  start() {
    this.started = true;
    this.outcome = null;
    this.pauses.delete('manual');
    this.elapsed = 0;
    this.score = 0;
    this.lives = 3;
    this.invulnerable = 0;
    this.x = this.width / 2;
    this.entities = [];
    this.events = [];
    this.spawnClock = 0.6;
    this.wave = 0;
    this.nextId = 0;
  }
  pause(reason: PauseReason = 'manual') { this.pauses.add(reason); }
  resume(reason: PauseReason = 'manual') { this.pauses.delete(reason); }
  steerTo(x: number) { this.x = Math.max(this.margin, Math.min(this.width - this.margin, x)); }

  spawn() {
    // Five readable lanes, a maximum of two logs per wave, always a clear path.
    // Fireflies appear in unblocked lanes. The first wave is a gentle introduction.
    const laneWidth = (this.width - this.margin * 2) / 5;
    const laneX = (lane: number) => this.margin + laneWidth * (lane + 0.5);
    const logLane = this.wave === 0 ? 0 : Math.floor(this.random() * 5);
    const blocked = new Set([logLane]);
    if (this.elapsed > 25 && this.wave % 3 === 0) blocked.add((logLane + 2) % 5);
    for (const lane of blocked) {
      this.entities.push({ id: this.nextId++, kind: 'log', x: laneX(lane), y: -40, width: laneWidth * 0.85, drift: (this.random() - 0.5) * 6, rotation: (this.random() - 0.5) * 0.35 });
    }
    let flyLane = this.wave === 0 ? 2 : Math.floor(this.random() * 5);
    while (blocked.has(flyLane)) flyLane = (flyLane + 1) % 5;
    for (let n = 0; n < 2; n++) {
      this.entities.push({ id: this.nextId++, kind: 'firefly', x: laneX(flyLane), y: -45 - n * 58, width: 14, drift: 0, rotation: this.random() * Math.PI * 2 });
    }
    this.wave++;
  }

  step(dt: number, direction = 0) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.1);
    this.elapsed = Math.min(ROUND_SECONDS, this.elapsed + dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.steerTo(this.x + direction * this.width * 0.7 * dt);
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      this.spawn();
      this.spawnClock = 1.4 - this.elapsed / ROUND_SECONDS * 0.45;
    }
    this.entities = this.entities.filter(entity => {
      entity.y += this.speed * dt;
      entity.x += entity.drift * dt;
      const dy = Math.abs(entity.y - this.playerY);
      const dx = Math.abs(entity.x - this.x);
      if (entity.kind === 'firefly' && dx < this.radius + 12 && dy < this.radius + 14) {
        this.score += POINTS_PER_FIREFLY;
        this.events.push({ type: 'collect', x: entity.x, y: entity.y });
        return false;
      }
      if (entity.kind === 'log' && this.invulnerable === 0 && dx < entity.width / 2 + this.radius * 0.7 && dy < this.radius * 0.7 + 12) {
        this.lives--;
        this.invulnerable = 1.65;
        this.events.push({ type: 'hit', x: this.x, y: this.playerY });
        return false;
      }
      return entity.y < this.height + 100;
    });
    if (this.lives <= 0 || this.elapsed >= ROUND_SECONDS) {
      this.outcome = this.lives <= 0 ? 'lost' : 'won';
      this.events.push({ type: 'finish', x: this.x, y: this.playerY });
    }
  }
  takeEvents() { return this.events.splice(0); }
}
