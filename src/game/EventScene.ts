import Phaser from 'phaser';
import { ACCESSORIES, eventAt, SEASON_WEEKS, TRACK, TROPHY_ICON, TROPHIES } from '../core/live';
import { utcDate } from '../core/levels';
import { rewardText } from '../core/retention';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { save } from './state';
import { button, C, txt, W } from './ui';

/** Weekly event track + season progress. Rewards are paid automatically when paws reach a step. */
export class EventScene extends Phaser.Scene {
  constructor() {
    super('Event');
  }

  create() {
    const e = eventAt(utcDate());
    const cur = save.event.id === e.id;
    const paws = cur ? save.event.paws : 0;
    const claimed = cur ? save.event.claimed : 0;
    const tracks = save.season.id === e.season ? save.season.tracks : 0;
    const acc = ACCESSORIES[e.week];
    const trophy = TROPHIES[e.week];

    button(this, 70, 70, 90, 80, '‹', () => this.scene.start('Menu'), { color: C.gray, size: 48 });
    txt(this, W / 2, 70, t('event'), 38);
    txt(this, W / 2, 150, t('eventTitle', { name: t('acc_' + acc) }), 32);
    txt(this, W / 2, 200, `${t('eventPaws', { n: paws })}   ·   ${t('eventDays', { n: e.daysLeft })}`, 28);
    txt(this, W / 2, 245, t('eventHow'), 22, '#9b8a7a');

    const max = TRACK[TRACK.length - 1].paws;
    const g = this.add.graphics();
    g.fillStyle(C.gray, 1).fillRoundedRect(110, 330, 30, 730, 15);
    g.fillStyle(C.primary, 1).fillRoundedRect(110, 330 + 730 * (1 - Math.min(1, paws / max)), 30, 730 * Math.min(1, paws / max), 15);
    TRACK.forEach((st, i) => {
      const y = 1060 - (680 * st.paws) / max;
      const done = i < claimed;
      g.fillStyle(done ? C.green : C.panel, 1).fillRoundedRect(180, y - 50, 460, 100, 22);
      g.lineStyle(4, C.inkN, 1).strokeRoundedRect(180, y - 50, 460, 100, 22);
      g.fillStyle(done ? C.green : C.panel, 1).fillCircle(125, y, 26).strokeCircle(125, y, 26);
      txt(this, 125, y, String(st.paws), 20);
      const label = st.reward
        ? rewardText(st.reward)
        : st.trophy
          ? `${TROPHY_ICON[trophy]} ${t('trophy_' + trophy)}`
          : `🎩 ${t('acc_' + acc)}`;
      txt(this, 400, y, (done ? '✓ ' : '') + label, 28);
    });

    txt(this, W / 2, 1130, t('seasonTitle', { n: tracks }), 26);
    const cg = this.add.graphics();
    drawCat(cg, [{ x: 200, y: 1205 }, { x: 140, y: 1205 }], 11, 60, tracks >= SEASON_WEEKS ? 'happy' : 'sleep');
    txt(this, 420, 1205, t('seasonPrize'), 24, '#c08a00');
  }
}
