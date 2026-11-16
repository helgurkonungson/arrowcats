import Phaser from 'phaser';
import { CAFE_ROOMS, CAFE_SLOTS, CAFE_VARIANTS } from '../core/content';
import { CHAPTERS, doTask, nextTask, progress } from '../core/meta';
import { comfort, tipsAvailable, tipsRate } from '../core/retention';
import { TAG_ICON, tagOf, TROPHY_ICON, updateVisitor, VISITORS } from '../core/live';
import { BREEDS } from '../core/content';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { art, sittingCat } from './art';
import { playMusic, sfx } from './sfx';
import { rewarded, rewardedReady } from './ads';
import { addFish, persist, platform, save, unlockBreed } from './state';
import { button, C, dialog, iconButton, modal, pill, toast, txt, W, backButton, panel } from './ui';

type Rect = { x: number; y: number; w: number; h: number };
type Slot = (typeof CAFE_SLOTS)[number];
/** Each room has its own furniture layout (and its own decor art, see Art/PROMPTS.md 1.7–1.8). */
const SLOT_RECT: Record<Slot, Rect>[] = [
  // floor starts at y≈870 in the hall art, ≈810 in the attic; floor pieces stand on it (see FLOOR_SLOTS)
  { // hall: classic front room
    window: { x: 360, y: 440, w: 280, h: 230 },
    lamp: { x: 95, y: 745, w: 140, h: 390 },
    post: { x: 630, y: 790, w: 140, h: 300 },
    sofa: { x: 245, y: 870, w: 360, h: 200 },
    counter: { x: 480, y: 935, w: 300, h: 180 },
  },
  { // attic: dormer on the right, pendant lantern under the beam, wall shelves, armchair, bar
    window: { x: 500, y: 430, w: 220, h: 230 },
    lamp: { x: 230, y: 360, w: 100, h: 230 },
    post: { x: 150, y: 580, w: 170, h: 190 },
    sofa: { x: 530, y: 860, w: 280, h: 210 },
    counter: { x: 290, y: 930, w: 340, h: 180 },
  },
];
/** Pieces that stand on the floor: their art is bottom-aligned to the slot so they never float. */
const FLOOR_SLOTS: Slot[][] = [['lamp', 'post', 'sofa', 'counter'], ['sofa', 'counter']];
const WALL = [0xf6dfc6, 0xe9e0ef]; // hall: peach, attic: dusty lavender (art bible color script)
const FLOOR = [0xe3c49f, 0xd8b98e]; // hall: honey wood, attic: pine

export class CafeScene extends Phaser.Scene {
  private room = 0;

  constructor() {
    super('Cafe');
  }

  init(d: { room?: number }) {
    this.room = d.room ?? Math.min(progress(save.tasksDone).chapter, CAFE_ROOMS - 1);
  }

  private roomUnlocked(r: number) {
    return r === 0 || CHAPTERS[r - 1].tasks.every((k) => save.tasksDone.includes(k.id));
  }

  create() {
    playMusic('music_cafe');
    const r = this.room;
    const g = this.add.graphics();
    g.fillStyle(WALL[r], 1).fillRect(0, 160, W, 500);
    g.fillStyle(FLOOR[r], 1).fillRect(0, 660, W, 460);
    g.lineStyle(6, C.inkN, 1).lineBetween(0, 660, W, 660);
    if (r === 1) {
      // sloped roof and a beam, so the attic reads differently from the hall
      g.fillStyle(0xc7b28f, 1).fillTriangle(0, 160, 200, 160, 0, 470).fillTriangle(W, 160, W - 200, 160, W, 470);
      g.lineStyle(5, C.inkN, 1).lineBetween(200, 160, 0, 470).lineBetween(W - 200, 160, W, 470);
      g.fillStyle(0xb08a5e, 1).fillRect(0, 205, W, 26).lineStyle(4, C.inkN, 1).strokeRect(-4, 205, W + 8, 26);
    }
    art(this, `cafe_room${r + 1}`, W / 2, 640, W, 960, true);

    backButton(this, () => this.scene.start('Menu'));
    txt(this, W / 2, 70, t('chapter_' + CHAPTERS[r].key), 34);
    pill(this, W - 24, 64, 'star', () => save.stars, 130);
    txt(this, W / 2, 128, t('comfort', { n: comfort(save.cafe), r: tipsRate(save.cafe) }), 24);
    // room switch arrows sit on the room edges, clear of the back button
    if (r > 0) iconButton(this, 44, 640, 'back', () => this.scene.restart({ room: r - 1 }), 72);
    if (r < CAFE_ROOMS - 1) {
      const nb = iconButton(this, W - 44, 640, 'next', () => {
        if (!this.roomUnlocked(r + 1)) return toast(this, t('roomLocked'));
        this.scene.restart({ room: r + 1 });
      }, 72);
      if (!this.roomUnlocked(r + 1)) nb.setAlpha(0.6);
    }

    const task = nextTask(save.tasksDone);
    CAFE_SLOTS.forEach((key, i) => {
      const rect = SLOT_RECT[r][key];
      const v = save.cafe[r][i];
      if (v >= 0) {
        const im = art(this, `decor_r${r + 1}_${key}_${v}`, rect.x, rect.y, rect.w * 1.15, rect.h * 1.15);
        if (im && FLOOR_SLOTS[r].includes(key)) {
          im.setOrigin(0.5, 1).setY(rect.y + rect.h / 2);
          this.add.ellipse(rect.x, rect.y + rect.h / 2 - 4, im.displayWidth * 0.8, 18, C.inkN, 0.12);
          this.children.bringToTop(im);
        }
        if (!im) {
          this.drawItem(this.add.graphics(), key, rect, CAFE_VARIANTS[r][v], r);
        }
        // tag badge sits on the item's top-right corner, not on the empty slot box
        const top = im ? im.y - im.displayHeight * im.originY : rect.y - rect.h / 2;
        const right = im ? im.x + im.displayWidth * 0.4 : rect.x + rect.w / 2 - 6;
        txt(this, right, top + 14, TAG_ICON[tagOf(i, v)], 26);
        const hit = this.add.zone(rect.x, rect.y, rect.w, rect.h).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.pickVariant(i));
      } else if (task?.kind === 'decor' && task.slot === i && CHAPTERS[progress(save.tasksDone).chapter]?.room === r) {
        // only the slot of the current task is shown: a pulsing "build here" spot
        const ph = this.add.container(rect.x, rect.y);
        const pg = this.add.graphics();
        pg.fillStyle(0xfff9f0, 0.55).fillRoundedRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h, 18);
        pg.lineStyle(4, C.primary, 1);
        const step = 22;
        for (let x = -rect.w / 2 + 10; x < rect.w / 2 - 10; x += step) {
          pg.lineBetween(x, -rect.h / 2, Math.min(x + 12, rect.w / 2 - 10), -rect.h / 2);
          pg.lineBetween(x, rect.h / 2, Math.min(x + 12, rect.w / 2 - 10), rect.h / 2);
        }
        for (let y = -rect.h / 2 + 10; y < rect.h / 2 - 10; y += step) {
          pg.lineBetween(-rect.w / 2, y, -rect.w / 2, Math.min(y + 12, rect.h / 2 - 10));
          pg.lineBetween(rect.w / 2, y, rect.w / 2, Math.min(y + 12, rect.h / 2 - 10));
        }
        ph.add([pg, txt(this, 0, 0, '+', 56, '#ff9e5e').setStroke(C.ink, 6)]);
        this.tweens.add({ targets: ph, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        const hit = this.add.zone(rect.x, rect.y, rect.w, rect.h).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.perform());
      }
    });

    if (r === 0 && save.trophies.length) {
      if (!art(this, 'trophy_shelf', 360, 590, 320, 90)) this.add.graphics().fillStyle(0xb98a5a, 1).fillRoundedRect(220, 585, 280, 18, 6).lineStyle(3, C.inkN, 1).strokeRoundedRect(220, 585, 280, 18, 6);
      save.trophies.forEach((tr, k) => art(this, `trophy_${tr}`, 255 + k * 70, 552, 62, 62) ?? txt(this, 255 + k * 70, 562, TROPHY_ICON[tr] ?? '🏆', 40));
    }
    this.spawnCats();
    this.drawVisitor();
    this.drawTaskPanel();
    const tips = tipsAvailable(save.cafe, save.tips.since, Date.now());
    button(this, 130, 1065, 210, 70, t('tipsLabel', { n: tips }), () => {
      const n = tipsAvailable(save.cafe, save.tips.since, Date.now());
      if (n <= 0) return toast(this, t('tipsEmpty'), 1000);
      const collect = (got: number) => {
        save.tips.since = Date.now();
        addFish(got);
        sfx.tips();
        platform.track('tips_collect', { n: got });
        toast(this, t('tipsCollected', { n: got }), 1000);
        this.time.delayedCall(700, () => this.scene.restart({ room: this.room }));
      };
      // GDD: a rewarded ad doubles the tips bank (opt-in; skipped when ads are unavailable)
      if (!rewardedReady() || n < 10) return collect(n);
      let busy = false;
      const close = modal(this, t('tipsTitle', { n }), [t('tipsDoubleText')], [
        { label: t('tipsTake', { n }), color: C.primary, onClick: () => { if (busy) return; busy = true; close(); collect(n); } },
        {
          label: t('adDouble', { n }), color: C.gold, onClick: async () => {
            if (busy) return;
            busy = true;
            const ok = await rewarded(this, 'tips_double');
            close();
            collect(ok ? n * 2 : n);
          },
        },
      ]);
    }, { color: C.primary, size: 28, disabled: tips <= 0 });
  }

  private drawTaskPanel() {
    const g = this.add.graphics();
    panel(g, 20, 1122, W - 40, 136, 30);
    const p = progress(save.tasksDone);
    if (p.chapter >= CHAPTERS.length) {
      txt(this, W / 2, 1195, t('allDone'), 28);
      return;
    }
    if (CHAPTERS[p.chapter].room !== this.room) {
      txt(this, W / 2 - 60, 1195, t('chapterDone'), 30);
      button(this, W - 120, 1195, 140, 80, '▶', () => this.scene.restart({ room: CHAPTERS[p.chapter].room }), {
        color: C.green, size: 34,
      });
      return;
    }
    const ch = CHAPTERS[p.chapter];
    const task = ch.tasks[p.task];
    txt(this, W / 2, 1152, t('chapterProgress', { name: t('chapter_' + ch.key), a: p.task, b: ch.tasks.length }), 22, C.muted);
    const name = task.kind === 'decor'
      ? t('task_decor', { name: t('slot_' + CAFE_SLOTS[task.slot!]) })
      : t('task_' + task.id);
    txt(this, 220, 1210, name, 28).setWordWrapWidth(360, true);
    button(this, W - 150, 1205, 240, 80, t('doTask', { n: task.cost }), () => this.perform(), {
      color: C.green, size: 28, disabled: save.stars < task.cost,
    });
  }

  private perform() {
    const task = nextTask(save.tasksDone);
    if (!task) return;
    if (save.stars < task.cost) return toast(this, t('noStars'), 1060);
    const res = doTask(save)!;
    const ch = CHAPTERS[res.chapter];
    if (task.kind === 'decor') save.cafe[ch.room][task.slot!] = 0;
    persist();
    sfx.task();
    platform.track('cafe_task', { id: task.id });
    if (task.kind === 'story') toast(this, `${t('done_story')} ${t('task_' + task.id)}`, 1060);

    const finish = () => {
      if (!res.chapterDone) return this.scene.restart({ room: ch.room });
      const lines = [t('chapterDone')];
      if (save.flawless[ch.key] !== false && !save.frames.includes(ch.resident)) {
        save.frames.push(ch.resident);
        lines.push(t('goldenFrame', { name: t('who_' + ch.resident) }));
      }
      persist();
      sfx.win();
      const close = modal(this, '🎉', lines, [{
        label: 'OK', color: C.green,
        onClick: () => {
          close();
          this.scene.restart({ room: Math.min(res.chapter + 1, CAFE_ROOMS - 1) });
        },
      }]);
    };
    this.time.delayedCall(450, () => {
      if (res.scene < 0) return finish();
      const lines = ch.scenes[res.scene].map((who, i) => ({
        who, name: t('who_' + who), text: t(`story_${ch.key}_${res.scene}_${i}`),
      }));
      sfx.scene();
      dialog(this, lines, t('tapToContinue'), finish, `chapter${res.chapter + 1}_cover`);
    });
  }

  private pickVariant(slot: number) {
    const r = this.room;
    const close = modal(this, t('slot_' + CAFE_SLOTS[slot]), [t('chooseVariant'), t('visitorHint')],
      CAFE_VARIANTS[r].map((color, v) => ({
        label: `${save.cafe[r][slot] === v ? '✓ ' : ''}${TAG_ICON[tagOf(slot, v)]} ${t('tag_' + tagOf(slot, v))}`,
        color,
        onClick: () => {
          save.cafe[r][slot] = v;
          persist();
          close();
          this.scene.restart({ room: r });
        },
      })));
  }

  /** Guests appear after 2+ hours away if the café has the tags they like. */
  private drawVisitor() {
    if (updateVisitor(save.visit, save.cafe, save.breeds, Date.now(), Math.random())) sfx.chest();
    persist();
    const b = save.visit.visitor;
    if (b < 0) return;
    const vis = VISITORS.find((v) => v.breed === b)!;
    sittingCat(this, b, 440, 720, 120);
    const bell = txt(this, 470, 660, '🔔', 40);
    this.tweens.add({ targets: bell, angle: 15, duration: 300, yoyo: true, repeat: -1 });
    const zone = this.add.zone(440, 710, 160, 120).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      const name = t('breed_' + BREEDS[b].key);
      const close = modal(this, t('visitorTitle', { name }), [t('visitorText')], [
        {
          label: t('visitorTreat', { n: vis.treat }), color: C.green, disabled: save.fish < vis.treat,
          onClick: () => {
            if (save.fish < vis.treat) return toast(this, t('noFish'));
            addFish(-vis.treat);
            unlockBreed(b);
            save.visit.visitor = -1;
            persist();
            sfx.purr();
            platform.track('visitor_adopt', { breed: b });
            close();
            toast(this, t('visitorAdopted', { name }), 1000);
            this.time.delayedCall(900, () => this.scene.restart({ room: this.room }));
          },
        },
        { label: t('visitorLater'), color: C.gray, onClick: () => close() },
      ]);
    });
  }

  private spawnCats() {
    const breeds = save.breeds.slice(0, 10);
    // resident cats sit on the floor (back row first so nearer cats overlap them)
    breeds
      .map((b, i) => ({ b, i, x: 110 + ((i * 137) % 500), y: 960 + ((i * 89) % 80) }))
      .sort((a, z) => a.y - z.y)
      .forEach(({ b, i, x, y }) => {
        const size = 90 + (y - 960) * 0.2;
        this.add.ellipse(x, y + size * 0.42, size * 0.7, size * 0.16, C.inkN, 0.12);
        const cat = sittingCat(this, b, x, y, size);
        if (i % 2) cat.setScale(-cat.scaleX, cat.scaleY);
        this.tweens.add({ targets: cat, scaleY: cat.scaleY * 1.03, duration: 1400 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      });
  }

  private drawItem(g: Phaser.GameObjects.Graphics, key: string, r: Rect, col: number, room: number) {
    const L = r.x - r.w / 2;
    const T = r.y - r.h / 2;
    g.lineStyle(4, C.inkN, 1);
    if (room === 1) return this.drawAtticItem(g, key, r, col, L, T);
    switch (key) {
      case 'window':
        g.fillStyle(0xffffff, 1).fillRoundedRect(L, T, r.w, r.h, 12).strokeRoundedRect(L, T, r.w, r.h, 12);
        g.fillStyle(col, 1).fillRect(L + 14, T + 14, r.w - 28, r.h - 28);
        g.lineBetween(r.x, T + 14, r.x, T + r.h - 14).lineBetween(L + 14, r.y, L + r.w - 14, r.y);
        break;
      case 'lamp':
        g.lineBetween(r.x, T + 50, r.x, T + r.h);
        g.fillStyle(col, 1).fillTriangle(r.x - 40, T + 60, r.x + 40, T + 60, r.x, T);
        g.strokeTriangle(r.x - 40, T + 60, r.x + 40, T + 60, r.x, T);
        g.fillStyle(0xfff2a8, 1).fillCircle(r.x, T + 68, 12);
        break;
      case 'post':
        g.fillStyle(col, 1).fillRoundedRect(L + 20, T + 30, r.w - 40, r.h - 30, 8).strokeRoundedRect(L + 20, T + 30, r.w - 40, r.h - 30, 8);
        for (let y = T + 50; y < T + r.h - 10; y += 22) g.lineBetween(L + 20, y, L + r.w - 20, y + 8);
        g.fillStyle(0xd9b48a, 1).fillRoundedRect(L, T, r.w, 34, 8).strokeRoundedRect(L, T, r.w, 34, 8);
        break;
      case 'sofa':
        g.fillStyle(col, 1).fillRoundedRect(L, T, r.w, r.h * 0.55, 20).strokeRoundedRect(L, T, r.w, r.h * 0.55, 20);
        g.fillRoundedRect(L, T + r.h * 0.4, r.w, r.h * 0.6, 20).strokeRoundedRect(L, T + r.h * 0.4, r.w, r.h * 0.6, 20);
        break;
      default:
        g.fillStyle(col, 1).fillRoundedRect(L, T, r.w, r.h, 10).strokeRoundedRect(L, T, r.w, r.h, 10);
        g.fillStyle(0xffffff, 0.6).fillRect(L + 6, T + 6, r.w - 12, 16);
        g.fillStyle(0xffffff, 1).fillCircle(r.x + 60, T - 12, 16).strokeCircle(r.x + 60, T - 12, 16);
    }
  }

  /** Attic fallback shapes (until decor_r2_* art exists): dormer, lantern, shelves, armchair, bar with stools. */
  private drawAtticItem(g: Phaser.GameObjects.Graphics, key: string, r: Rect, col: number, L: number, T: number) {
    switch (key) {
      case 'window': {
        g.fillStyle(0xb08a5e, 1).fillTriangle(L - 16, T + 50, r.x, T - 30, L + r.w + 16, T + 50).strokeTriangle(L - 16, T + 50, r.x, T - 30, L + r.w + 16, T + 50);
        g.fillStyle(0xfff9f0, 1).fillRoundedRect(L, T + 30, r.w, r.h - 30, { tl: r.w / 2, tr: r.w / 2, bl: 10, br: 10 });
        g.strokeRoundedRect(L, T + 30, r.w, r.h - 30, { tl: r.w / 2, tr: r.w / 2, bl: 10, br: 10 });
        g.fillStyle(0xbfe3f2, 1).fillRoundedRect(L + 16, T + 46, r.w - 32, r.h - 62, { tl: r.w / 2 - 16, tr: r.w / 2 - 16, bl: 6, br: 6 });
        g.fillStyle(col, 1).fillRect(L + 6, T + 70, 26, r.h - 80).fillRect(L + r.w - 32, T + 70, 26, r.h - 80);
        g.strokeRect(L + 6, T + 70, 26, r.h - 80).strokeRect(L + r.w - 32, T + 70, 26, r.h - 80);
        break;
      }
      case 'lamp':
        g.lineBetween(r.x, 232, r.x, T + 64); // hangs from the beam
        g.fillStyle(col, 1).fillCircle(r.x, T + 110, 46).strokeCircle(r.x, T + 110, 46);
        g.lineStyle(3, C.inkN, 0.5).lineBetween(r.x - 44, T + 96, r.x + 44, T + 96).lineBetween(r.x - 44, T + 124, r.x + 44, T + 124);
        g.fillStyle(0xfff2a8, 0.5).fillCircle(r.x, T + 110, 70);
        break;
      case 'post':
        for (let k = 0; k < 3; k++) {
          const x = L + (k % 2 ? 50 : 0);
          const y = T + k * 60;
          g.fillStyle(col, 1).fillRoundedRect(x, y, r.w - 50, 22, 8).strokeRoundedRect(x, y, r.w - 50, 22, 8);
        }
        g.lineStyle(3, 0x9c7449, 1).lineBetween(L + 40, T + 22, L + 80, T + 60).lineBetween(L + 80, T + 82, L + 40, T + 120);
        break;
      case 'sofa':
        g.fillStyle(col, 1).fillRoundedRect(L + 20, T, r.w - 40, r.h * 0.7, 30).strokeRoundedRect(L + 20, T, r.w - 40, r.h * 0.7, 30);
        g.fillRoundedRect(L, T + r.h * 0.35, 50, r.h * 0.65, 20).strokeRoundedRect(L, T + r.h * 0.35, 50, r.h * 0.65, 20);
        g.fillRoundedRect(L + r.w - 50, T + r.h * 0.35, 50, r.h * 0.65, 20).strokeRoundedRect(L + r.w - 50, T + r.h * 0.35, 50, r.h * 0.65, 20);
        g.fillRoundedRect(L + 40, T + r.h * 0.55, r.w - 80, r.h * 0.4, 14).strokeRoundedRect(L + 40, T + r.h * 0.55, r.w - 80, r.h * 0.4, 14);
        break;
      default:
        g.fillStyle(0xb08a5e, 1).fillRoundedRect(L, T, r.w, r.h * 0.65, 8).strokeRoundedRect(L, T, r.w, r.h * 0.65, 8);
        g.fillStyle(col, 1).fillRoundedRect(L - 10, T - 12, r.w + 20, 22, 8).strokeRoundedRect(L - 10, T - 12, r.w + 20, 22, 8);
        for (const sx of [L + 50, L + r.w - 50]) {
          g.lineBetween(sx, T + r.h * 0.75, sx, T + r.h);
          g.fillStyle(col, 1).fillEllipse(sx, T + r.h * 0.72, 56, 22).strokeEllipse(sx, T + r.h * 0.72, 56, 22);
        }
        g.fillStyle(0xfff2a8, 1).fillRoundedRect(r.x - 14, T - 52, 28, 40, 8).strokeRoundedRect(r.x - 14, T - 52, 28, 40, 8);
    }
  }
}
