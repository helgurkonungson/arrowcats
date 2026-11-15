/** Dev page: browse generated levels with metrics and the greedy solution order (waves). */
import { headDir } from './core/board';
import { BREEDS } from './core/content';
import { getDaily, getLevel, levelParams } from './core/levels';
import { metrics, solve } from './core/solver';
import { DX, DY, Level } from './core/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const cv = $<HTMLCanvasElement>('c');
const ctx = cv.getContext('2d')!;
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

function draw(lv: Level, info: string) {
  const s = Math.floor(Math.min(cv.width / lv.w, cv.height / lv.h));
  const wave = new Map<number, number>();
  solve(lv).waves.forEach((w, i) => w.forEach((id) => wave.set(id, i + 1)));
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const b of lv.boxes) {
    ctx.fillStyle = '#c99d6b';
    ctx.fillRect(b.x * s + 4, b.y * s + 4, s - 8, s - 8);
  }
  for (const c of lv.cats) {
    const p = c.cells.map((q) => [q.x * s + s / 2, q.y * s + s / 2]);
    ctx.strokeStyle = hex(BREEDS[c.breed].body);
    ctx.lineWidth = s * 0.5;
    ctx.beginPath();
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    const d = headDir(c);
    const [hx, hy] = p[0];
    ctx.fillStyle = c.sleepy ? '#7a6fb0' : '#5b4636';
    ctx.beginPath();
    ctx.arc(hx, hy, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + DX[d] * s * 0.35, hy + DY[d] * s * 0.35);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(String(wave.get(c.id) ?? '?'), hx - 4, hy + 4);
  }
  const m = metrics(lv);
  $('m').textContent = `${info}\n${lv.id} ${lv.w}×${lv.h} hard=${!!lv.hard} cats=${m.cats} depth=${m.depth} narrow=${m.narrow} fill=${m.fill.toFixed(2)} solvable=${m.solvable}\nnumbers on heads = greedy wave in which the cat can leave`;
}

const showLevel = (n: number) => {
  $<HTMLInputElement>('n').value = String(n);
  draw(getLevel(n), `params ${JSON.stringify(levelParams(n))}`);
};
$('prev').onclick = () => showLevel(Math.max(1, Number($<HTMLInputElement>('n').value) - 1));
$('next').onclick = () => showLevel(Number($<HTMLInputElement>('n').value) + 1);
$('n').onchange = () => showLevel(Number($<HTMLInputElement>('n').value) || 1);
$('day').onclick = () => {
  const d = $<HTMLInputElement>('d').value;
  if (d) draw(getDaily(d), `daily ${d}`);
};
document.onkeydown = (e) => {
  if (e.key === 'ArrowRight') $('next').click();
  if (e.key === 'ArrowLeft') $('prev').click();
};
showLevel(Number(new URLSearchParams(location.search).get('n')) || 1);
