import Phaser from 'phaser';
import { BREEDS } from '../core/content';
import { setComplete, SETS } from '../core/live';
import { rewardText } from '../core/retention';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { art } from './art';
import { sfx } from './sfx';
import { grant, persist, platform, save } from './state';
import { button, C, modal, toast, txt, W, backButton, panel } from './ui';

/** Album: 3 sets of 4 breeds with set rewards; tap an owned cat to choose its accessory. */
export class CollectionScene extends Phaser.Scene {
  constructor() {
    super('Collection');
  }

  create() {
    backButton(this, () => this.scene.start('Menu'));
    txt(this, W / 2, 70, t('collection'), 40);
    txt(this, W / 2, 135, t('collectionProgress', { a: save.breeds.length, b: BREEDS.length }), 28);

    SETS.forEach((set, si) => {
      const top = 190 + si * 330;
      const done = setComplete(set.breeds, save.breeds);
      const claimed = save.setsClaimed.includes(set.key);
      txt(this, 40, top + 20, t('set_' + set.key), 30).setOrigin(0, 0.5);
      if (done && !claimed) {
        button(this, W - 170, top + 20, 280, 60, t('setClaim', { r: rewardText(set.reward) }), () => {
          save.setsClaimed.push(set.key);
          grant(set.reward);
          sfx.chest();
          platform.track('set_claim', { set: set.key });
          this.scene.restart();
        }, { color: C.green, size: 22 });
      } else if (claimed) {
        txt(this, W - 40, top + 20, t('setDone'), 24, '#2f7d32').setOrigin(1, 0.5);
      } else {
        txt(this, W - 40, top + 20, rewardText(set.reward), 24, C.muted).setOrigin(1, 0.5);
      }
      set.breeds.forEach((b, i) => this.card(b, 105 + i * 170, top + 175));
    });

    if (save.frames.length)
      txt(this, W / 2, 1210, t('frames', { list: save.frames.map((f) => t('who_' + f)).join(', ') }), 24, '#c08a00');
  }

  private card(b: number, cx: number, cy: number) {
    const breed = BREEDS[b];
    const have = save.breeds.includes(b);
    const g = this.add.graphics();
    panel(g, cx - 78, cy - 115, 156, 222, 22, breed.rare ? 0xfff1c9 : C.panel, breed.rare ? 0xe9c56a : 0xe2c7a4);
    if (have) {
      if (!art(this, `portrait_${breed.key}`, cx, cy - 20, 130, 130)) drawCat(this.add.graphics(), [{ x: cx + 25, y: cy - 25 }, { x: cx - 25, y: cy - 25 }], b, 72, 'happy', false, save.equipped[b]);
      txt(this, cx, cy + 65, t('breed_' + breed.key), 22).setWordWrapWidth(150, true);
      const zone = this.add.zone(cx, cy, 156, 230).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.pickAccessory(b));
    } else {
      g.fillStyle(C.latte, 1).fillCircle(cx, cy - 25, 40);
      txt(this, cx, cy - 25, '?', 44, '#d9bf9b');
      txt(this, cx, cy + 65, t('unknown'), 22);
    }
    if (breed.rare) txt(this, cx + 55, cy - 92, '★', 28, '#e0a100');
  }

  private pickAccessory(b: number) {
    if (!save.accessories.length) return toast(this, `${t('chooseAccessory')}: 🐾 ${t('event')}`, 1150);
    const close = modal(this, t('chooseAccessory'), [], [
      ...save.accessories.map((a) => ({
        label: (save.equipped[b] === a ? '✓ ' : '') + t('acc_' + a),
        color: C.blue,
        onClick: () => {
          save.equipped[b] = a;
          persist();
          close();
          this.scene.restart();
        },
      })),
      {
        label: t('none'), color: C.gray,
        onClick: () => {
          delete save.equipped[b];
          persist();
          close();
          this.scene.restart();
        },
      },
    ]);
  }
}
