import Phaser from 'phaser';
import { BREEDS } from '../core/content';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { save } from './state';
import { button, C, txt, W } from './ui';

export class CollectionScene extends Phaser.Scene {
  constructor() {
    super('Collection');
  }

  create() {
    button(this, 70, 70, 90, 80, '‹', () => this.scene.start('Menu'), { color: C.gray, size: 48 });
    txt(this, W / 2, 70, t('collection'), 40);
    txt(this, W / 2, 140, t('collectionProgress', { a: save.breeds.length, b: BREEDS.length }), 30);
    if (save.frames.length)
      txt(this, W / 2, 1230, t('frames', { list: save.frames.map((f) => t('who_' + f)).join(', ') }), 26, '#c08a00');

    BREEDS.forEach((b, i) => {
      const cx = 130 + (i % 3) * 230;
      const cy = 300 + Math.floor(i / 3) * 240;
      const have = save.breeds.includes(i);
      const g = this.add.graphics();
      g.fillStyle(b.rare ? 0xfff1c9 : C.panel, 1).fillRoundedRect(cx - 100, cy - 105, 200, 210, 24);
      g.lineStyle(4, C.inkN, 1).strokeRoundedRect(cx - 100, cy - 105, 200, 210, 24);
      if (have) {
        const cg = this.add.graphics();
        drawCat(cg, [{ x: cx + 30, y: cy - 20 }, { x: cx - 30, y: cy - 20 }], i, 80, 'happy');
        txt(this, cx, cy + 60, t('breed_' + b.key), 24);
      } else {
        g.fillStyle(C.gray, 1).fillCircle(cx, cy - 20, 42);
        txt(this, cx, cy - 20, '?', 48, '#ffffff');
        txt(this, cx, cy + 60, t('unknown'), 24);
      }
      if (b.rare) txt(this, cx + 70, cy - 80, '★', 30, '#e0a100');
    });
  }
}
