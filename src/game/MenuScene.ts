import Phaser from 'phaser';
import { loginReward } from '../core/content';
import { utcDate } from '../core/levels';
import { CHAPTERS, INTRO, nextTask, progress, starsToScene } from '../core/meta';
import { prevDate } from '../core/save';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { setMuted, sfx } from './sfx';
import { addFish, persist, save } from './state';
import { button, C, dialog, fishLabel, modal, toast, txt, W } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.cameras.main.setBackgroundColor(C.bg);
    const fish = fishLabel(this, W - 30, 60, () => save.fish);
    txt(this, W - 30, 112, t('stars', { n: save.stars }), 34).setOrigin(1, 0.5);

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
    const task = nextTask(save.tasksDone);
    const ready = !!task && save.stars >= task.cost;
    const cafeBtn = button(this, W / 2, 910, 520, 110, '☕ ' + t('cafe') + (ready ? '  ❗' : ''), () => this.scene.start('Cafe'), {
      color: C.pink,
    });
    if (ready) this.tweens.add({ targets: cafeBtn, scale: 1.04, duration: 600, yoyo: true, repeat: -1 });
    if (task) {
      const p = progress(save.tasksDone);
      const need = starsToScene(save.tasksDone, save.stars);
      txt(this, W / 2, 520, `${t('chapter_' + CHAPTERS[p.chapter].key)} · ${need ? t('toScene', { n: need }) : t('sceneReady')}`, 26);
    }
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

    // first launch: story intro instead of a stack of popups
    const introNow = !save.introSeen;
    if (introNow) {
      save.introSeen = true;
      persist();
      dialog(this, INTRO.map((who, i) => ({ who, name: t('who_' + who), text: t('intro_' + i) })), t('tapToContinue'), () => {});
    }
    // daily login reward
    if (save.login.last !== today) {
      const streak = save.login.last === prevDate(today) ? save.login.streak + 1 : 1;
      save.login = { last: today, streak };
      const r = loginReward(streak);
      addFish(r);
      fish.refresh();
      sfx.coin();
      if (introNow) {
        toast(this, t('loginReward', { n: r, d: streak }), 300);
      } else {
        const close = modal(this, '🎁', [t('loginReward', { n: r, d: streak })], [
          { label: 'OK', color: C.green, onClick: () => close() },
        ]);
      }
    }
  }
}
