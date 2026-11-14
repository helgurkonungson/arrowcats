import Phaser from 'phaser';
import { BREEDS } from '../core/content';

export type Mood = 'calm' | 'happy' | 'angry' | 'sleep';
type P = { x: number; y: number };

const OUTLINE = 0x5b4636;

/** Draws a stretchy cat along points (pts[0] = head) in pixel space. */
export function drawCat(
  g: Phaser.GameObjects.Graphics, pts: P[], breed: number, size: number,
  mood: Mood = 'calm', highlight = false,
) {
  g.clear();
  const b = BREEDS[breed] ?? BREEDS[0];
  const w = size * 0.56;
  const n = pts.length;

  const stroke = (width: number, color: number) => {
    g.lineStyle(width, color, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    g.fillStyle(color, 1);
    for (const p of pts) g.fillCircle(p.x, p.y, width / 2);
  };

  // tail sticking out of the last segment
  const t1 = pts[n - 1];
  const t0 = pts[n - 2] ?? t1;
  const tl = Math.hypot(t1.x - t0.x, t1.y - t0.y) || 1;
  const tail = { x: t1.x + ((t1.x - t0.x) / tl) * size * 0.45, y: t1.y + ((t1.y - t0.y) / tl) * size * 0.45 };

  if (highlight) {
    g.lineStyle(w + 22, 0xfff07a, 0.9);
    g.strokePoints([...pts, tail]);
  }
  g.lineStyle(size * 0.2, OUTLINE, 1).lineBetween(t1.x, t1.y, tail.x, tail.y);
  g.fillStyle(OUTLINE, 1).fillCircle(tail.x, tail.y, size * 0.1);
  g.lineStyle(size * 0.12, b.accent, 1).lineBetween(t1.x, t1.y, tail.x, tail.y);
  g.fillStyle(b.accent, 1).fillCircle(tail.x, tail.y, size * 0.06);

  stroke(w + 7, OUTLINE);
  stroke(w, b.body);
  // stripes / spots
  g.fillStyle(b.accent, 1);
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1];
    const c = pts[i];
    g.fillCircle((a.x + c.x) / 2, (a.y + c.y) / 2, w * 0.2);
  }

  // head
  const h = pts[0];
  const nx = pts[1] ?? { x: h.x, y: h.y + 1 };
  const ang = Math.atan2(h.y - nx.y, h.x - nx.x);
  const R = size * 0.43;
  const fx = Math.cos(ang);
  const fy = Math.sin(ang);
  const sx = -fy;
  const sy = fx;

  for (const s of [-1, 1]) {
    const a1 = ang + s * 0.35;
    const a2 = ang + s * 1.15;
    const tipA = ang + s * 0.8;
    const tri = [
      { x: h.x + Math.cos(a1) * R * 0.8, y: h.y + Math.sin(a1) * R * 0.8 },
      { x: h.x + Math.cos(tipA) * R * 1.55, y: h.y + Math.sin(tipA) * R * 1.55 },
      { x: h.x + Math.cos(a2) * R * 0.8, y: h.y + Math.sin(a2) * R * 0.8 },
    ];
    g.fillStyle(b.body, 1).fillTriangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y);
    g.lineStyle(4, OUTLINE, 1).strokeTriangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y);
  }
  g.fillStyle(OUTLINE, 1).fillCircle(h.x, h.y, R + 4);
  g.fillStyle(b.body, 1).fillCircle(h.x, h.y, R);

  // face: eyes are ahead of center and spread sideways
  const ex = (s: number) => h.x + fx * R * 0.25 + sx * s * R * 0.4;
  const ey = (s: number) => h.y + fy * R * 0.25 + sy * s * R * 0.4;
  const er = R * 0.13;
  for (const s of [-1, 1]) {
    const x = ex(s);
    const y = ey(s);
    if (mood === 'calm') {
      g.fillStyle(0x2b2228, 1).fillCircle(x, y, er);
      g.fillStyle(0xffffff, 1).fillCircle(x + er * 0.35, y - er * 0.35, er * 0.35);
    } else if (mood === 'sleep' || mood === 'happy') {
      g.lineStyle(4, 0x2b2228, 1).lineBetween(x - sx * er, y - sy * er, x + sx * er, y + sy * er);
    } else {
      g.fillStyle(0x2b2228, 1).fillCircle(x, y, er);
      // angry brows tilted towards the center
      const bx = x + fx * er * 2;
      const by = y + fy * er * 2;
      g.lineStyle(4, 0x2b2228, 1).lineBetween(
        bx + sx * s * er * 1.4, by + sy * s * er * 1.4,
        bx - sx * s * er * 0.6 - fx * er, by - sy * s * er * 0.6 - fy * er,
      );
    }
  }
  // nose
  g.fillStyle(0xf08a9a, 1).fillCircle(h.x + fx * R * 0.6, h.y + fy * R * 0.6, R * 0.1);
}
