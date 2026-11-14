import Phaser from 'phaser';
import { loginReward } from '../core/content';
import { utcDate } from '../core/levels';
import { prevDate } from '../core/save';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { setMuted, sfx } from './sfx';
import { addFish, persist, save } from './state';
import { button, C, fishLabel, modal, txt, W } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.cameras.main.setBackgroundColor(C.bg);
    const fish = fishLabel(this, W - 30, 60, () => save.fish);

    txt(this, W / 2, 200, t('title'), 84);
    const g = this.add.graphics();
    const pts = [[470, 380], [400, 380], [330, 380], [330, 450], [260, 450]].map(([x, y]) => ({ x, y }));
    drawCat(g, pts, 0, 90, 'happy');
    this.tweens.add({ targets: g, y: -10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const today = utcDate();
    const dailyDone = !!save.daily.results[today];
    button(this, W / 2, 620, 520, 120, '▶ ' + t('play', { n: save.level }), () =>
      this.scene.start('Level', { mode: 'level', n: save.level }), { color: C.green, size: 40 });
    button(this, W / 2, 770, 520, 110, (dailyDone ? '' : '📅 ') + t(dailyDone ? 'dailyDone' : 'daily'), () =>
      this.scene.start('Level', { mode: 'daily', date: today }), { color: C.blue });
    button(this, W / 2, 910, 520, 110, '☕ ' + t('cafe'), () => this.scene.start('Cafe'), { color: C.pink });
    button(this, W / 2, 1050, 520, 110, '🐾 ' + t('collection'), () => this.scene.start('Collection'), {
      color: C.purple,
    });
    if (save.daily.streak > 0) txt(this, W / 2, 1160, t('streak', { n: save.daily.streak }), 28);

    const sound = button(this, 80, 60, 100, 80, save.muted ? '🔇' : '🔊', () => {
      save.muted = !save.muted;
      setMuted(save.muted);
      persist();
      this.scene.restart();
    }, { color: C.gray });
    sound.setScale(0.9);

    // daily login reward
    if (save.login.last !== today) {
      const streak = save.login.last === prevDate(today) ? save.login.streak + 1 : 1;
      save.login = { last: today, streak };
      const r = loginReward(streak);
      addFish(r);
      fish.refresh();
      sfx.coin();
      const close = modal(this, '🎁', [t('loginReward', { n: r, d: streak })], [
        { label: 'OK', color: C.green, onClick: () => close() },
      ]);
    }
  }
}
