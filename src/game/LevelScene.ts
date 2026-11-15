import Phaser from 'phaser';
import { Board } from '../core/board';
import {
  COMBO_WINDOW_MS, COST, DAILY_REWARD, DAILY_STREAK_BONUS, FISH_PER_CAT, levelReward, BREEDS,
} from '../core/content';
import { dailyNumber, getDaily, getLevel, TUTORIAL_COUNT } from '../core/levels';
import { prevDate } from '../core/save';
import { Cat, Cell, DX, DY, Level } from '../core/types';
import { headDir } from '../core/board';
import { CHAPTERS, nextTask, progress, starsToScene } from '../core/meta';
import { t } from '../i18n';
import { drawCat, Mood } from './drawCat';
import { art, has, HEAD_MOOD } from './art';
import { playMusic, sfx } from './sfx';
import { addFish, grantPaws, persist, platform, save, unlockBreed } from './state';
import { PAWS } from '../core/live';
import { button, C, fishLabel, H, modal, toast, txt, W, backButton } from './ui';
import { icon, iconKey, IconName } from './icons';

export type LevelData = { mode: 'level'; n: number } | { mode: 'daily'; date: string };

interface CatView {
  cat: Cat;
  g: Phaser.GameObjects.Graphics;
  awake: boolean;
  busy: boolean;
  mood: Mood;
  hint: boolean;
  zz?: Phaser.GameObjects.Text;
  head?: Phaser.GameObjects.Image;
  acc?: Phaser.GameObjects.Image;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class LevelScene extends Phaser.Scene {
  private d!: LevelData;
  private level!: Level;
  private board!: Board;
  private views = new Map<number, CatView>();
  private hearts = 3;
  private cs = 64;
  private ox = 0;
  private oy = 0;
  private feedArmed = false;
  private combo = 0;
  private lastExit = -1e9;
  private earned = 0;
  private rescued: number[] = [];
  private startTime = 0;
  private ended = false;
  private heartIcons: Phaser.GameObjects.Image[] = [];
  private timerText?: Phaser.GameObjects.Text;
  private fish!: { refresh: () => void };
  private hintBtn!: Phaser.GameObjects.Container;
  private feedBtn!: Phaser.GameObjects.Container;
  private mask!: Phaser.Display.Masks.GeometryMask;

  constructor() {
    super('Level');
  }

  init(d: LevelData) {
    this.d = d;
    this.views = new Map();
    this.hearts = 3;
    this.feedArmed = false;
    this.combo = 0;
    this.lastExit = -1e9;
    this.earned = 0;
    this.rescued = [];
    this.ended = false;
    this.timerText = undefined;
  }

  create() {
    const d = this.d;
    this.level = d.mode === 'level' ? getLevel(d.n) : getDaily(d.date);
    this.board = new Board(this.level);
    const { w, h } = this.level;
    this.cameras.main.setBackgroundColor(this.level.hard ? 0xf6dfdc : C.bg);

    const top = 190;
    const bottom = 210;
    const availW = W - 40;
    const availH = H - top - bottom;
    this.cs = Math.floor(Math.min(availW / w, availH / h, 100));
    this.ox = Math.round((W - this.cs * w) / 2);
    this.oy = Math.round(top + (availH - this.cs * h) / 2);
    this.drawField();
    // cats sliding off the board are clipped to the field so they never cover the HUD
    const mg = this.make.graphics({}, false);
    mg.fillStyle(0xffffff).fillRect(this.ox - 14, this.oy - 14, this.cs * w + 28, this.cs * h + 28);
    this.mask = mg.createGeometryMask();

    for (const cat of this.board.cats.values()) {
      const v: CatView = {
        cat, g: this.add.graphics().setMask(this.mask), awake: !cat.sleepy, busy: false,
        mood: cat.sleepy ? 'sleep' : 'calm', hint: false,
      };
      if (cat.sleepy) {
        const hp = this.px(cat.cells[0]);
        v.zz = txt(this, hp.x + this.cs * 0.35, hp.y - this.cs * 0.45, 'z z', Math.max(18, this.cs * 0.3), '#7a6fb0');
        this.tweens.add({ targets: v.zz, y: '-=8', alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
      }
      this.views.set(cat.id, v);
      this.redraw(v);
    }

    const zone = this.add.zone(this.ox - this.cs / 2, this.oy - this.cs / 2, this.cs * (w + 1), this.cs * (h + 1));
    zone.setOrigin(0).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p.x, p.y));

    this.drawHud();
    if (d.mode === 'level' && d.n <= TUTORIAL_COUNT) {
      this.coach(t(d.n === 1 ? 'tut1' : 'tut2'));
      this.time.delayedCall(600, () => this.tutorialHint());
    }
    if (new URLSearchParams(location.search).has('debug')) this.exposeDebug();
    this.startTime = this.time.now;
    playMusic('music_level');
    platform.gameplayStart();
    platform.track('level_start', { id: this.level.id });
  }

  update() {
    if (this.timerText && !this.ended) this.timerText.setText('⏱ ' + fmtTime((this.time.now - this.startTime) / 1000));
  }

  // ---------- drawing ----------

  private px(c: { x: number; y: number }) {
    return { x: this.ox + (c.x + 0.5) * this.cs, y: this.oy + (c.y + 0.5) * this.cs };
  }

  private drawField() {
    const { w, h } = this.level;
    const room = CHAPTERS[Math.min(progress(save.tasksDone).chapter, CHAPTERS.length - 1)].room;
    art(this, room === 0 ? 'bg_board_floor' : 'bg_board_roof', W / 2, H / 2, W, H, true);
    const g = this.add.graphics();
    // board: one calm mid-light surface with a soft checker so lanes read at a glance
    const bx = this.ox - 16;
    const by = this.oy - 16;
    const bw = this.cs * w + 32;
    const bh = this.cs * h + 32;
    g.fillStyle(C.inkN, 0.12).fillRoundedRect(bx + 4, by + 14, bw, bh, 30);
    g.fillStyle(0xd9bf9b, 1).fillRoundedRect(bx, by + 8, bw, bh, 30);
    g.fillStyle(0xeedbbf, 1).fillRoundedRect(bx, by, bw, bh, 30);
    g.lineStyle(5, C.inkN, 1).strokeRoundedRect(bx, by, bw, bh + 8, 30);
    const r = Math.max(4, this.cs * 0.12);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = this.px({ x, y });
      const s = this.cs - 4;
      g.fillStyle((x + y) % 2 ? 0xe6cfae : 0xf3e4cc, 1).fillRoundedRect(p.x - s / 2, p.y - s / 2, s, s, r);
    }
    for (const b of this.level.boxes) {
      const p = this.px(b);
      const s = this.cs * 0.84;
      g.fillStyle(C.inkN, 0.16).fillRoundedRect(p.x - s / 2 + 4, p.y - s / 2 + 8, s, s, 8);
      g.fillStyle(0xa8784c, 1).fillRoundedRect(p.x - s / 2, p.y - s / 2, s, s, 8);
      g.fillStyle(0xc99d6b, 1).fillRoundedRect(p.x - s / 2, p.y - s / 2, s * 0.9, s * 0.9, 7);
      g.lineStyle(4, C.inkN, 1).strokeRoundedRect(p.x - s / 2, p.y - s / 2, s, s, 8);
      g.lineStyle(3, 0x9c7449, 1).lineBetween(p.x - s / 2, p.y, p.x + s / 2, p.y);
    }
  }

  private redraw(v: CatView, pts?: { x: number; y: number }[]) {
    const p = pts ?? v.cat.cells.map((c) => this.px(c));
    const key = `head_${BREEDS[v.cat.breed].key}_${HEAD_MOOD[v.mood]}`;
    const accId = save.equipped[v.cat.breed];
    const useArt = has(this, key);
    drawCat(v.g, p, v.cat.breed, this.cs, v.mood, v.hint, useArt ? undefined : accId, useArt);
    if (!useArt) return;
    // generated head looks up; rotate it toward the direction of travel
    const rot = Math.atan2(p[0].y - p[1].y, p[0].x - p[1].x) + Math.PI / 2;
    if (!v.head) v.head = this.add.image(0, 0, key).setMask(this.mask);
    v.head.setTexture(key).setDisplaySize(this.cs * 1.05, this.cs * 1.05).setPosition(p[0].x + v.g.x, p[0].y + v.g.y).setRotation(rot);
    const accKey = accId ? `acc_${accId}` : '';
    if (accKey && has(this, accKey)) {
      if (!v.acc) v.acc = this.add.image(0, 0, accKey).setMask(this.mask);
      v.acc.setTexture(accKey).setDisplaySize(this.cs * 0.9, this.cs * 0.9).setPosition(v.head.x, v.head.y).setRotation(rot);
    } else v.acc?.setVisible(false);
  }

  /** tail..head followed by `extra` cells in front of the head */
  private trajectory(cat: Cat, extra: number): Cell[] {
    const tr = [...cat.cells].reverse();
    const d = headDir(cat);
    let { x, y } = cat.cells[0];
    for (let i = 0; i < extra; i++) {
      x += DX[d];
      y += DY[d];
      tr.push({ x, y });
    }
    return tr;
  }

  private pointsAt(tr: Cell[], len: number, s: number) {
    const out: { x: number; y: number }[] = [];
    for (let j = 0; j < len; j++) {
      const k = len - 1 - j + s;
      const i = Math.floor(k);
      const f = k - i;
      const a = tr[Math.min(i, tr.length - 1)];
      const b = tr[Math.min(i + 1, tr.length - 1)];
      out.push(this.px({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }));
    }
    return out;
  }

  private drawHud() {
    const d = this.d;
    backButton(this, () => this.leave());
    const title = d.mode === 'daily'
      ? t('dailyTitle', { n: dailyNumber(d.date) })
      : t(this.level.hard ? 'hardLevel' : 'level', { n: d.n });
    const tt = txt(this, W / 2, 52, title, 38);
    if (tt.width > 330) tt.setScale(330 / tt.width); // keep clear of the back button and fish counter
    if (this.level.hard) tt.setColor('#c9482a');
    this.heartIcons = [0, 1, 2].map((i) => icon(this, 'heart', W / 2 + (i - 1) * 56, 112, 52));
    this.updateHearts();
    this.fish = fishLabel(this, W - 24, 64, () => save.fish + this.earned);
    if (d.mode === 'daily') {
      icon(this, 'clock', W - 150, 132, 34);
      this.timerText = txt(this, W - 128, 133, '', 28).setOrigin(0, 0.5);
    }

    const by = H - 118;
    this.hintBtn = this.booster(W / 2 - 168, by, 'hint', t('hint'), COST.hint, () => this.useHint());
    this.feedBtn = this.booster(W / 2 + 168, by, 'feed', t('feed'), COST.feed, () => this.useFeed());
    this.refreshUi();
  }

  /** Teal booster button with a cream price tag (fish icon + cost) hanging off the bottom edge. */
  private booster(x: number, y: number, name: IconName, label: string, cost: number, onClick: () => void) {
    const b = button(this, x, y, 304, 104, label, onClick, { color: C.blue, size: 32, icon: name });
    const g = this.add.graphics();
    g.fillStyle(C.inkN, 1).fillRoundedRect(-70, 44, 140, 44, 22);
    g.fillStyle(C.panel, 1).fillRoundedRect(-67, 47, 134, 38, 19);
    b.add([g, icon(this, 'fish', -36, 66, 40), txt(this, 14, 67, String(cost), 26)]);
    return b;
  }

  private wallet() {
    return save.fish + this.earned;
  }

  /** Spends fish earned in this level first, then the saved wallet. */
  private spend(cost: number): boolean {
    if (this.wallet() < cost) return false;
    const fromEarned = Math.min(this.earned, cost);
    this.earned -= fromEarned;
    if (cost > fromEarned) addFish(-(cost - fromEarned));
    this.refreshUi();
    return true;
  }

  private refreshUi() {
    this.fish.refresh();
    this.hintBtn.setAlpha(this.wallet() >= COST.hint ? 1 : 0.5);
    this.feedBtn.setAlpha(this.feedArmed ? 0.7 : this.wallet() >= COST.feed ? 1 : 0.5);
    this.feedBtn.setScale(this.feedArmed ? 1.06 : 1);
  }

  /** Tutorial coach mark: speech bubble above the boosters. */
  private coach(msg: string) {
    const tx = txt(this, W / 2, H - 262, msg, 26).setWordWrapWidth(600, true);
    const b = tx.getBounds();
    const g = this.add.graphics();
    g.fillStyle(C.inkN, 1).fillRoundedRect(b.x - 27, b.y - 17, b.width + 54, b.height + 34, 24);
    g.fillStyle(C.panel, 1).fillRoundedRect(b.x - 24, b.y - 14, b.width + 48, b.height + 28, 21);
    tx.setDepth(1);
  }

  /** Free pulse on a free cat in tutorial levels. */
  private tutorialHint() {
    if (this.ended) return;
    const v = this.board.freeCats().map((id) => this.views.get(id)).find((x) => x && !x.busy);
    if (!v || v.hint) return;
    v.hint = true;
    this.redraw(v);
  }

  private exposeDebug() {
    (window as unknown as Record<string, unknown>).__ac = {
      free: () => this.board.freeCats().map((id) => {
        const p = this.px(this.board.cats.get(id)!.cells[0]);
        return { x: p.x, y: p.y };
      }),
      blocked: () => [...this.board.cats.keys()].filter((id) => !this.board.check(id).free).map((id) => {
        const p = this.px(this.board.cats.get(id)!.cells[0]);
        return { x: p.x, y: p.y };
      }),
      fish: () => this.wallet(),
      state: () => ({ ended: this.ended, hearts: this.hearts, cats: this.views.size, id: this.level.id }),
    };
  }

  private updateHearts() {
    this.heartIcons.forEach((im, i) => {
      const full = i < this.hearts;
      const key = iconKey(this, full ? 'heart' : 'heart_empty');
      if (im.texture.key !== key && !full) this.tweens.add({ targets: im, scale: { from: im.scale * 1.5, to: im.scale }, duration: 250, ease: 'Back.Out' });
      im.setTexture(key).setDisplaySize(52, 52);
    });
  }

  // ---------- input & mechanics ----------

  private onTap(px: number, py: number) {
    if (this.ended) return;
    const fx = (px - this.ox) / this.cs;
    const fy = (py - this.oy) / this.cs;
    const cx = Math.floor(fx);
    const cy = Math.floor(fy);
    let id = this.board.at(cx, cy);
    if (id < 0) {
      // generous hit area: nearest cat cell around the tap
      let bd = 0.85;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const o = this.board.at(cx + dx, cy + dy);
        if (o < 0) continue;
        const dist = Math.hypot(fx - (cx + dx + 0.5), fy - (cy + dy + 0.5));
        if (dist < bd) {
          bd = dist;
          id = o;
        }
      }
    }
    const v = id >= 0 ? this.views.get(id) : undefined;
    if (!v || v.busy) return;

    if (this.feedArmed) {
      if (!this.spend(COST.feed)) return;
      this.feedArmed = false;
      this.refreshUi();
      this.feed(v);
      platform.track('booster_used', { type: 'feed' });
      return;
    }
    if (!v.awake) {
      v.awake = true;
      v.mood = 'calm';
      v.zz?.destroy();
      this.redraw(v);
      sfx.wake();
      this.tweens.add({ targets: v.g, y: -6, duration: 90, yoyo: true });
      return;
    }
    const res = this.board.check(id);
    if (res.free) this.exit(v, res.steps);
    else this.bonk(v, res.steps, res.blocker);
  }

  private exit(v: CatView, steps: number) {
    const cat = v.cat;
    this.board.remove(cat.id);
    v.busy = true;
    v.mood = 'happy';
    v.hint = false;
    const len = cat.cells.length;
    const total = steps + len + 1;
    const tr = this.trajectory(cat, total + 1);
    sfx.meow(0.9 + Math.random() * 0.3);
    sfx.slide();
    const o = { s: 0 };
    this.tweens.add({
      targets: o, s: total, duration: 160 + total * 45, ease: 'Quad.In',
      onUpdate: () => this.redraw(v, this.pointsAt(tr, len, o.s)),
      onComplete: () => this.gone(v),
    });

    const now = this.time.now;
    this.combo = now - this.lastExit < COMBO_WINDOW_MS ? this.combo + 1 : 1;
    this.lastExit = now;
    let gain = FISH_PER_CAT;
    if (this.combo >= 2) {
      gain += this.combo - 1;
      toast(this, t('combo', { n: this.combo, f: this.combo - 1 }), H - 240);
      sfx.combo(this.combo);
    }
    this.earned += gain;
    this.refreshUi();
    sfx.coin();
  }

  private gone(v: CatView) {
    v.g.destroy();
    v.zz?.destroy();
    v.head?.destroy();
    v.acc?.destroy();
    this.views.delete(v.cat.id);
    this.rescued.push(v.cat.breed);
    if (this.views.size === 0 && !this.ended) this.win();
    else if (this.d.mode === 'level' && this.d.n <= TUTORIAL_COUNT) this.tutorialHint();
  }

  private bonk(v: CatView, steps: number, blocker: number) {
    v.busy = true;
    v.mood = 'angry';
    this.hearts--;
    this.updateHearts();
    if (this.hearts <= 0) this.ended = true;
    sfx.bonk();
    this.cameras.main.shake(120, 0.004);
    const len = v.cat.cells.length;
    const tr = this.trajectory(v.cat, steps + 1);
    const o = { s: 0 };
    this.tweens.add({
      targets: o, s: steps + 0.35, duration: 80 + steps * 30, ease: 'Sine.InOut', yoyo: true,
      onUpdate: () => this.redraw(v, this.pointsAt(tr, len, o.s)),
      onComplete: () => {
        v.busy = false;
        this.redraw(v);
        this.time.delayedCall(300, () => {
          if (!v.g.active || v.busy) return;
          v.mood = 'calm';
          this.redraw(v);
        });
        if (this.hearts <= 0) this.lose();
      },
    });
    const bv = this.views.get(blocker);
    if (bv) this.tweens.add({ targets: bv.g, x: 5, duration: 50, yoyo: true, repeat: 3 });
  }

  private feed(v: CatView) {
    this.board.remove(v.cat.id);
    v.busy = true;
    v.mood = 'happy';
    this.redraw(v);
    sfx.purr();
    this.tweens.add({ targets: [v.g, v.zz, v.head, v.acc].filter(Boolean), alpha: 0, duration: 400, onComplete: () => this.gone(v) });
  }

  private useHint() {
    if (this.ended) return;
    const free = this.board.freeCats().map((id) => this.views.get(id)!).filter((v) => v && !v.busy && !v.hint);
    if (!free.length) return;
    if (!this.spend(COST.hint)) return toast(this, t('noFish'));
    const v = free.find((x) => x.awake) ?? free[0];
    v.hint = true;
    this.redraw(v);
    this.tweens.add({ targets: v.g, alpha: 0.55, duration: 250, yoyo: true, repeat: 3 });
    platform.track('booster_used', { type: 'hint' });
  }

  private useFeed() {
    if (this.ended) return;
    if (this.feedArmed) {
      // second press cancels
      this.feedArmed = false;
      this.refreshUi();
      return;
    }
    if (this.wallet() < COST.feed) return toast(this, t('noFish'));
    this.feedArmed = true;
    this.refreshUi();
    toast(this, t('pickCat'), H - 240);
  }

  // ---------- end states ----------

  private win() {
    this.ended = true;
    platform.gameplayStop();
    sfx.win();
    const d = this.d;
    const lines: string[] = [];
    let reward = 0;
    let stars = 0;
    let paws = 0;
    this.markFlawless();
    if (d.mode === 'level') {
      reward = levelReward(d.n, !!this.level.hard);
      if (d.n === save.level) {
        save.level = d.n + 1;
        stars = this.level.hard ? 2 : 1;
        paws = this.level.hard ? PAWS.hard : PAWS.level;
      }
      save.best[d.n] = Math.max(save.best[d.n] ?? 0, this.hearts);
      platform.track('level_complete', { id: this.level.id, hearts: this.hearts });
    } else {
      const time = (this.time.now - this.startTime) / 1000;
      if (!save.daily.results[d.date]) {
        save.daily.results[d.date] = { hearts: this.hearts, time };
        save.daily.streak = save.daily.last === prevDate(d.date) ? save.daily.streak + 1 : 1;
        save.daily.last = d.date;
        const bonus = DAILY_STREAK_BONUS[save.daily.streak] ?? 0;
        reward = DAILY_REWARD + bonus;
        stars = 1;
        paws = PAWS.daily;
        if (!save.dailyBest || time < save.dailyBest) save.dailyBest = time;
        platform.submitScore('daily', Math.round(time * 1000));
        if (bonus) lines.push(t('streakBonus', { n: bonus }));
      }
      lines.unshift(t('dailyResult', { t: fmtTime(time), h: this.hearts }), t('dailyBest', { t: fmtTime(save.dailyBest || time) }), t('streak', { n: save.daily.streak }));
      platform.track('daily_complete', { date: d.date, hearts: this.hearts, time });
    }
    const total = this.earned + reward;
    this.earned = 0;
    addFish(total);
    for (const b of new Set(this.rescued)) {
      if (unlockBreed(b)) lines.push(t('newBreed', { name: t('breed_' + BREEDS[b].key) }));
    }
    save.stars += stars;
    if (paws) {
      const msgs = grantPaws(paws);
      lines.push(t('pawsGain', { n: paws, total: save.event.paws }), ...msgs);
    }
    if (stars) this.time.delayedCall(500, () => sfx.star());
    persist();
    const goal = nextTask(save.tasksDone);
    const need = starsToScene(save.tasksDone, save.stars);
    if (goal) lines.push(need === 0 ? t('sceneReady') : t('toScene', { n: need }));
    lines.unshift(t('winFish', { n: total }) + (stars ? '   ' + t('winStars', { n: stars }) : ''));
    if (d.mode === 'level') lines.splice(1, 0, t('rating', { h: '♥'.repeat(this.hearts) + '♡'.repeat(3 - this.hearts) }));
    const cafeBtn = goal && save.stars >= goal.cost
      ? [{ label: t('toCafe'), color: C.pink, onClick: () => this.scene.start('Cafe') }]
      : [];

    const btns = d.mode === 'level'
      ? [
        { label: t('next'), color: C.green, onClick: () => this.scene.restart({ mode: 'level', n: d.n + 1 }) },
        ...cafeBtn,
        { label: t('menu'), color: C.gray, onClick: () => this.scene.start('Menu') },
      ]
      : [
        { label: t('share'), color: C.blue, onClick: () => this.shareDaily() },
        ...cafeBtn,
        { label: t('menu'), color: C.gray, onClick: () => this.scene.start('Menu') },
      ];
    this.time.delayedCall(350, () => modal(this, t('winTitle'), lines, btns));
  }

  /** A lost heart in the current chapter breaks its golden-frame run. */
  private markFlawless() {
    if (this.d.mode !== 'level' || this.hearts >= 3) return;
    const ch = CHAPTERS[progress(save.tasksDone).chapter];
    if (ch) save.flawless[ch.key] = false;
  }

  private lose() {
    this.markFlawless();
    persist();
    platform.gameplayStop();
    sfx.lose();
    platform.track('level_fail', { id: this.level.id });
    const close = modal(this, t('loseTitle'), [], [
      {
        label: t('continueHeart', { n: COST.heart }),
        color: C.gold,
        disabled: this.wallet() < COST.heart,
        onClick: () => {
          if (!this.spend(COST.heart)) return toast(this, t('noFish'));
          this.hearts = 1;
          this.updateHearts();
          this.ended = false;
          close();
          // cats that finished leaving while the modal was open may have emptied the board
          if (this.views.size === 0) return this.win();
          platform.gameplayStart();
        },
      },
      { label: t('retry'), color: C.green, onClick: () => this.scene.restart(this.d) },
      { label: t('menu'), color: C.gray, onClick: () => this.scene.start('Menu') },
    ]);
  }

  private shareDaily() {
    if (this.d.mode !== 'daily') return;
    const r = save.daily.results[this.d.date];
    const hearts = r?.hearts ?? this.hearts;
    const text = `Arrow Cats #${dailyNumber(this.d.date)} 🐱\n${'❤️'.repeat(hearts)}${'🖤'.repeat(3 - hearts)} ⏱ ${fmtTime(r?.time ?? 0)}\n${location.origin}${location.pathname}`;
    platform.track('share', { date: this.d.date });
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    if (nav.share) {
      nav.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => toast(this, t('copied')), () => toast(this, text));
    }
  }

  private leave() {
    platform.gameplayStop();
    this.scene.start('Menu');
  }
}
