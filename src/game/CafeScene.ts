import Phaser from 'phaser';
import { CAFE_ROOMS, CAFE_SLOTS, CAFE_VARIANTS, slotCost } from '../core/content';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { sfx } from './sfx';
import { addFish, persist, platform, save } from './state';
import { button, C, fishLabel, modal, toast, txt, W } from './ui';

type Rect = { x: number; y: number; w: number; h: number };
const SLOT_RECT: Record<(typeof CAFE_SLOTS)[number], Rect> = {
  window: { x: 360, y: 360, w: 240, h: 170 },
  lamp: { x: 110, y: 560, w: 80, h: 220 },
  post: { x: 615, y: 720, w: 80, h: 240 },
  sofa: { x: 260, y: 840, w: 300, h: 120 },
  counter: { x: 500, y: 1000, w: 300, h: 100 },
};
const WALL = [0xf6dfc6, 0xdfe9f3];
const FLOOR = [0xe3c49f, 0xc9d6c3];

export class CafeScene extends Phaser.Scene {
  private room = 0;

  constructor() {
    super('Cafe');
  }

  init(d: { room?: number }) {
    this.room = d.room ?? 0;
  }

  private roomUnlocked(r: number) {
    return r === 0 || save.cafe[r - 1].every((v) => v >= 0);
  }

  create() {
    const r = this.room;
    const g = this.add.graphics();
    g.fillStyle(WALL[r], 1).fillRect(0, 160, W, 500);
    g.fillStyle(FLOOR[r], 1).fillRect(0, 660, W, 460);
    g.lineStyle(6, C.inkN, 1).lineBetween(0, 660, W, 660);

    button(this, 70, 70, 90, 80, '‹', () => this.scene.start('Menu'), { color: C.gray, size: 48 });
    const fish = fishLabel(this, W - 30, 70, () => save.fish);
    txt(this, W / 2, 70, `${t('cafe')} · ${t('room', { n: r + 1 })}`, 36);
    if (r > 0) button(this, 180, 130, 70, 56, '◀', () => this.scene.restart({ room: r - 1 }), { color: C.gray, size: 28 });
    if (r < CAFE_ROOMS - 1)
      button(this, W - 180, 130, 70, 56, '▶', () => {
        if (!this.roomUnlocked(r + 1)) return toast(this, t('roomLocked'));
        this.scene.restart({ room: r + 1 });
      }, { color: C.gray, size: 28 });

    CAFE_SLOTS.forEach((key, i) => {
      const rect = SLOT_RECT[key];
      const v = save.cafe[r][i];
      if (v >= 0) {
        const ig = this.add.graphics();
        this.drawItem(ig, key, rect, CAFE_VARIANTS[r][v]);
        const hit = this.add.zone(rect.x, rect.y, rect.w, rect.h).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.pickVariant(i));
      } else {
        const ph = this.add.graphics();
        ph.fillStyle(0xffffff, 0.35).fillRoundedRect(rect.x - rect.w / 2, rect.y - rect.h / 2, rect.w, rect.h, 14);
        ph.lineStyle(3, C.inkN, 0.5).strokeRoundedRect(rect.x - rect.w / 2, rect.y - rect.h / 2, rect.w, rect.h, 14);
        const cost = slotCost(r, i);
        button(this, rect.x, rect.y, Math.max(130, Math.min(rect.w, 170)), 64, '+ ' + t('buy', { n: cost }), () => {
          if (save.cafe[r][i] >= 0) return;
          if (save.fish < cost) return toast(this, t('noFish'));
          addFish(-cost);
          save.cafe[r][i] = 0;
          persist();
          sfx.coin();
          platform.track('cafe_buy', { room: r, slot: key });
          this.scene.restart({ room: r });
        }, { color: C.primary, size: 24, disabled: save.fish < cost });
      }
    });

    this.spawnCats();
    txt(this, W / 2, 1180, t('catsInCafe', { n: save.breeds.length }), 30);
    fish.refresh();
  }

  private pickVariant(slot: number) {
    const r = this.room;
    const close = modal(this, t('slot_' + CAFE_SLOTS[slot]), [t('chooseVariant')],
      CAFE_VARIANTS[r].map((color, v) => ({
        label: save.cafe[r][slot] === v ? '✓' : ' ',
        color,
        onClick: () => {
          save.cafe[r][slot] = v;
          persist();
          close();
          this.scene.restart({ room: r });
        },
      })));
  }

  private spawnCats() {
    const breeds = save.breeds.slice(0, 10);
    breeds.forEach((b, i) => {
      const g = this.add.graphics();
      const x0 = 120 + ((i * 137) % 480);
      const y0 = 720 + ((i * 89) % 330);
      const flip = i % 2 ? 1 : -1;
      drawCat(g, [{ x: x0 + 22 * flip, y: y0 }, { x: x0 - 22 * flip, y: y0 }], b, 56, i % 3 === 0 ? 'sleep' : 'happy');
      this.tweens.add({
        targets: g, x: (i % 2 ? 1 : -1) * (30 + (i * 13) % 50), duration: 2500 + i * 300,
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
    });
  }

  private drawItem(g: Phaser.GameObjects.Graphics, key: string, r: Rect, col: number) {
    const L = r.x - r.w / 2;
    const T = r.y - r.h / 2;
    g.lineStyle(4, C.inkN, 1);
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
}
