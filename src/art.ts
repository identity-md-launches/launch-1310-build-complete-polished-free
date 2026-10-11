import type { PondGame, GameEvent } from './game.ts';

type Particle = { x: number; y: number; age: number; kind: 'collect' | 'hit' };
const TAU = Math.PI * 2;

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rotation = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, TAU); ctx.fillStyle = fill; ctx.fill();
}
function line(ctx: CanvasRenderingContext2D, points: number[], color: string, width = 2) {
  ctx.beginPath(); ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
export function drawPad(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale);
  ellipse(ctx, 0, 9, 85, 30, '#071e24');
  ctx.fillStyle = '#388e79'; ctx.beginPath(); ctx.ellipse(0, 0, 84, 34, 0, 0.18, TAU - 0.08); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6eb79a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#4d9e7c'; ctx.beginPath(); ctx.ellipse(-6, -5, 68, 24, 0, 0.2, TAU - 0.08); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
  for (const [ex, ey] of [[-65, -6], [-43, -22], [-12, -27], [23, -26], [50, -16], [-48, 18], [-9, 24], [39, 19]]) line(ctx, [4, 1, ex, ey], '#6bb08c', 1);
  ctx.restore();
}
export function drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, lean = 0, hurt = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(lean); ctx.scale(scale, scale);
  drawPad(ctx, 0, 38, 1);
  ellipse(ctx, 0, 29, 47, 11, '#27765f');
  // Resting haunches, an upright belly and two splayed surfing feet.
  ellipse(ctx, -35, 11, 24, 18, '#8fccaa', -0.4);
  ellipse(ctx, 34, 11, 24, 18, '#8fccaa', 0.4);
  ellipse(ctx, 0, -5, 34, 39, '#bce5ba');
  ellipse(ctx, 1, 4, 23, 27, '#deedc8');
  line(ctx, [-24, -10, -34, 24, -47, 29], '#bce5ba', 11);
  line(ctx, [24, -10, 34, 24, 48, 29], '#bce5ba', 11);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) line(ctx, [side * (38 + i * 5), 27, side * (39 + i * 7), 33 - i], '#cee9c2', 4);
  }
  // Asymmetric scarf tail is a small lavender nod to the controls.
  ctx.fillStyle = '#bdb0e8'; ctx.beginPath(); ctx.moveTo(-21, -28); ctx.quadraticCurveTo(13, -16, 31, -29); ctx.lineTo(26, -19); ctx.quadraticCurveTo(1, -11, -21, -20); ctx.fill();
  ctx.beginPath(); ctx.moveTo(25, -24); ctx.quadraticCurveTo(49, -31, 60, -17); ctx.lineTo(45, -15); ctx.lineTo(50, -7); ctx.quadraticCurveTo(34, -10, 25, -24); ctx.fill();
  // Wide expressive head. Eye bumps are part of the frog silhouette.
  ellipse(ctx, 0, -45, 47, 31, '#bce5ba');
  ellipse(ctx, -27, -67, 20, 23, '#bce5ba');
  ellipse(ctx, 27, -67, 20, 23, '#bce5ba');
  ellipse(ctx, -27, -70, 13, 15, '#f2f0d2');
  ellipse(ctx, 27, -70, 13, 15, '#f2f0d2');
  if (hurt) {
    line(ctx, [-34, -73, -21, -66, -34, -61], '#133f39', 3);
    line(ctx, [34, -73, 21, -66, 34, -61], '#133f39', 3);
  } else {
    ellipse(ctx, -24, -68, 5.5, 9, '#153e36');
    ellipse(ctx, 30, -68, 5.5, 9, '#153e36');
    ellipse(ctx, -22, -72, 1.8, 2.5, '#ffffff');
    ellipse(ctx, 32, -72, 1.8, 2.5, '#ffffff');
  }
  ellipse(ctx, -33, -40, 9, 4.5, '#e5b8a8', -0.1);
  ellipse(ctx, 34, -40, 9, 4.5, '#e5b8a8', 0.1);
  ellipse(ctx, -7, -48, 1.5, 1.7, '#5c937a'); ellipse(ctx, 7, -48, 1.5, 1.7, '#5c937a');
  ctx.beginPath(); ctx.moveTo(-19, -37); ctx.quadraticCurveTo(3, -22, 24, -39); ctx.strokeStyle = '#285c4b'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(21, -41); ctx.lineTo(27, -38); ctx.stroke();
  // Tiny freckles keep the portrait from feeling like a stock icon.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) ellipse(ctx, side * (35 + i * 3), -48 + i % 2 * 3, 1.1, 1.1, '#72a88a');
  ctx.restore();
}
export function drawFirefly(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t = 0) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
  glow.addColorStop(0, '#f7d77b55'); glow.addColorStop(1, '#f7d77b00');
  ellipse(ctx, x, y, size * 4, size * 4, glow);
  ellipse(ctx, x - size * 0.8, y - size * 0.5, size * 0.9, size * 0.48, '#f4edbd99', -0.6 + Math.sin(t * 6) * 0.1);
  ellipse(ctx, x + size * 0.8, y - size * 0.5, size * 0.9, size * 0.48, '#f4edbd99', 0.6 - Math.sin(t * 6) * 0.1);
  ellipse(ctx, x, y, size * 0.62, size, '#f8d778');
  ellipse(ctx, x, y - size * 0.5, size * 0.42, size * 0.48, '#ffefb0');
}
export function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ellipse(ctx, 0, 15, width * 0.57, 17, '#061d2466');
  ctx.fillStyle = '#a67b55'; roundedRect(ctx, -width / 2, -15, width, 30, 12); ctx.fill();
  ctx.fillStyle = '#be9669'; roundedRect(ctx, -width / 2 + 5, -15, width - 9, 11, 5); ctx.fill();
  line(ctx, [-width / 2 + 15, 6, width / 2 - 8, 6], '#78583d', 2);
  line(ctx, [-width / 2 + 17, -5, width / 4, -5], '#d0aa77', 2);
  ellipse(ctx, -width / 2 + 7, 0, 9, 14, '#e3bd87');
  ctx.beginPath(); ctx.ellipse(-width / 2 + 7, 0, 5, 9, 0, 0, TAU); ctx.strokeStyle = '#a77a51'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#9d8056'; ctx.beginPath(); ctx.moveTo(8, -9); ctx.lineTo(2, -28); ctx.lineTo(13, -30); ctx.lineTo(21, -10); ctx.fill();
  ellipse(ctx, width * 0.21, -12, width * 0.17, 5, '#7f9a62');
  ctx.restore();
}

// Keep the log drawable when the optional canvas roundRect API is unavailable.
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') { ctx.roundRect(x, y, width, height, radius); return; }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y); ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r); ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height); ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export class PondRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 1000;
  height = 560;
  particles: Particle[] = [];
  reduced = false;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    this.ctx = context;
  }
  resize(width: number, height: number) {
    this.width = width; this.height = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  event(event: GameEvent) {
    if (event.type !== 'finish') this.particles.push({ ...event, kind: event.type, age: 0 });
  }
  background(time: number, idle: boolean) {
    const ctx = this.ctx, w = this.width, h = this.height;
    const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
    bg.addColorStop(0, '#09262c'); bg.addColorStop(0.5, '#103c42'); bg.addColorStop(1, '#164b4e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const moonX = w * (w < 640 ? 0.86 : 0.79), moonY = h * (w < 640 ? 0.14 : 0.2), moonSize = w < 640 ? 25 : 35;
    const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 170);
    glow.addColorStop(0, '#c9dfbd13'); glow.addColorStop(1, '#c9dfbd00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ellipse(ctx, moonX, moonY, moonSize, moonSize, '#e4ebc6');
    ellipse(ctx, moonX + 10, moonY - 7, moonSize - 2, moonSize - 2, '#21494b');
    // Water contours are purposefully irregular, not a tiled texture.
    for (let n = 0; n < 17; n++) {
      const y = ((n * 59 + time * (idle ? 3 : 19)) % (h + 80)) - 20;
      const x = ((n * 179 + 23) % (w + 200)) - 100;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 36, y - 5, x + 98, y + 7, x + 150, y);
      ctx.strokeStyle = n % 3 === 0 ? '#61908b24' : '#6ba79812'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let n = 0; n < 9; n++) {
      const yy = moonY + 53 + n * 12;
      const span = 7 + n * 3;
      line(ctx, [moonX - span + Math.sin(n * 2) * 12, yy, moonX + span, yy], '#dbe5b51a', 2);
    }
    // Shadowed reeds on both banks frame the playable water.
    for (const side of [-1, 1]) {
      const edge = side < 0 ? 0 : w;
      for (let n = 0; n < 13; n++) {
        const baseY = h * 0.38 + n * h * 0.061;
        const reach = idle && (side < 0 || baseY < h - 190) ? 18 : 25 + (n * 23) % 56;
        ctx.beginPath(); ctx.moveTo(edge, baseY + 62);
        ctx.quadraticCurveTo(edge - side * reach, baseY + 15, edge - side * (reach * 0.8), baseY - 28);
        ctx.quadraticCurveTo(edge - side * (reach * 0.15), baseY + 12, edge + side * 15, baseY + 50);
        ctx.fillStyle = n % 2 ? '#1d5752' : '#103d3b'; ctx.fill();
      }
      for (let n = 0; n < 4; n++) {
        const x = edge - side * (idle && side < 0 ? 6 + n * 3 : 12 + n * 12), y = h - 25 - n * 33;
        line(ctx, [x, h + 20, x + side * 9, y - 55], '#357063', 2);
        line(ctx, [x + side * 9, y - 55, x + side * 10, y - 78], '#8a9470', 6);
      }
    }
    // Leave the compact start-screen rules on uninterrupted dark water.
    drawPad(ctx, w * 0.56, h * (w < 640 ? (idle ? 0.51 : 0.145) : 0.24), w < 640 ? 0.3 : 0.49, -0.2);
    drawPad(ctx, w * 0.94, h * 0.51, 0.54, 0.25);
    drawPad(ctx, w * 0.32, h * 0.965, 0.36, 0.2);
    // Original water lily in the foreground.
    drawPad(ctx, w - 65, h - 39, 0.66, -0.12);
    for (let n = 0; n < 7; n++) {
      const a = n * TAU / 7;
      ellipse(ctx, w - 65 + Math.cos(a) * 9, h - 51 + Math.sin(a) * 5, 5, 12, n % 2 ? '#baafcc' : '#ddd3e0', a);
    }
    ellipse(ctx, w - 65, h - 52, 5, 4, '#efd88a');
  }
  render(game: PondGame, time: number, dt: number, lean: number) {
    const ctx = this.ctx, w = this.width, h = this.height;
    const idle = game.phase === 'idle';
    const frozen = game.phase === 'paused' || game.outcome !== null;
    this.background(this.reduced ? 0 : time, idle);
    if (idle) {
      const mobile = w < 640;
      const x = w * 0.74, y = mobile ? h - 118 : h * 0.64;
      const bob = this.reduced ? 0 : Math.sin(time * 1.4) * 3;
      for (let n = 0; n < 3; n++) {
        ctx.beginPath(); ctx.ellipse(x, y + 61 + n * 7, (mobile ? 58 : 119) + n * 23, 19 + n * 8, 0, 0, TAU);
        ctx.strokeStyle = `rgba(143, 196, 169, ${0.16 - n * 0.04})`; ctx.lineWidth = 1; ctx.stroke();
      }
      drawLog(ctx, w * (mobile ? 0.2 : 0.56), mobile ? h - 82 : h * 0.79, mobile ? 70 : 106, -0.22);
      drawFrog(ctx, x, y + bob, mobile ? 0.83 : 1.65, -0.04);
      const flies = mobile ? [[0.88, (h - 230) / h, 4], [0.56, (h - 195) / h, 4], [0.92, (h - 70) / h, 4]] : [[0.62, 0.39, 6], [0.88, 0.49, 5], [0.56, 0.59, 5], [0.9, 0.75, 4]];
      for (const [xx, yy, size] of flies) {
        drawFirefly(ctx, xx * w, yy * h + (this.reduced ? 0 : Math.sin(time + xx * 20) * 5), size, this.reduced ? 0 : time);
      }
    } else {
      for (const entity of game.entities) {
        if (entity.kind === 'log') drawLog(ctx, entity.x, entity.y, entity.width, entity.rotation);
        else drawFirefly(ctx, entity.x, entity.y, 6, this.reduced ? 0 : time + entity.rotation);
      }
      if (!this.reduced) {
        for (let n = 0; n < 4; n++) {
          const offset = (time * 30 + n * 20) % 80;
          ctx.beginPath(); ctx.ellipse(game.x, game.playerY + 30 + offset, game.radius + offset * 0.35, 9 + offset * 0.09, 0, 0.2, Math.PI - 0.2);
          ctx.strokeStyle = `rgba(171, 212, 185, ${0.24 * (1 - offset / 80)})`; ctx.lineWidth = 1.3; ctx.stroke();
        }
      }
      drawFrog(ctx, game.x, game.playerY - 7, game.radius / 43, this.reduced ? 0 : lean * 0.12, game.invulnerable > 1.15);
      if (game.invulnerable > 0) {
        ctx.beginPath(); ctx.ellipse(game.x, game.playerY, game.radius * 2.2, game.radius * 1.9, 0, 0, TAU);
        ctx.strokeStyle = '#eab7a8'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    this.particles = this.particles.filter(particle => {
      if (!frozen) particle.age += dt;
      const life = 1 - particle.age / 0.8;
      if (life <= 0) return false;
      ctx.save(); ctx.globalAlpha = life;
      if (!this.reduced) {
        for (let n = 0; n < 6; n++) {
          const a = n * TAU / 6, distance = particle.age * 45;
          ellipse(ctx, particle.x + Math.cos(a) * distance, particle.y + Math.sin(a) * distance, 2, 2, particle.kind === 'collect' ? '#f8d778' : '#eab7a8');
        }
      }
      ctx.font = '600 15px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = particle.kind === 'collect' ? '#ffe5a2' : '#f5cdbd';
      ctx.fillText(particle.kind === 'collect' ? '+10' : '−1 life', particle.x, particle.y - 32 - (this.reduced ? 0 : particle.age * 28));
      ctx.restore(); return true;
    });
  }
}
