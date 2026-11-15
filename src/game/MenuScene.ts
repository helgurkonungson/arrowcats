import Phaser from 'phaser';
import { utcDate } from '../core/levels';
import { CHAPTERS, INTRO, nextTask, progress, starsToScene } from '../core/meta';
import { CALENDAR, claimCalendar, Reward, streakState, tipsAvailable, tipsCap } from '../core/retention';
import { prevDate } from '../core/save';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { playMusic, setMuted, sfx } from './sfx';
import { addFish, persist, save } from './state';
import { button, C, dialog, fishLabel, txt, W, H } from './ui';

export const rewardText = (r: Reward) =>
  [r.fish ? `${r.fish} 🐟` : '', r.stars ? `${r.stars} ⭐` : ''].filter(Boolean).join(' + ');

export class MenuScene extends Phaser.Scene {
  private introDone: () => void = () => {};

  constructor() {
    super('Menu');
  }

  create() {
    this.cameras.main.setBackgroundColor(C.bg);
    playMusic('music_cafe');
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
    const tips = tipsAvailable(save.cafe, save.tips.since, Date.now());
    const ready = (!!task && save.stars >= task.cost) || tips >= tipsCap(save.cafe) / 2;
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
    const st = streakState(save.daily.last, save.daily.streak, today);
    if (st.alive) txt(this, W / 2, 1160, st.atRisk ? t('streakRisk', { n: st.streak }) : t('streakFlame', { n: st.streak }), 26, st.atRisk ? '#d0603a' : C.ink);
    txt(this, W / 2, 1220, t('tomorrow', { r: rewardText(CALENDAR[save.calendar.day % 7]) }), 24, '#9b8a7a');

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
      dialog(this, INTRO.map((who, i) => ({ who, name: t('who_' + who), text: t('intro_' + i) })), t('tapToContinue'), () => this.introDone());
    }
    // login streak + 7-day calendar (after the intro on first launch)
    if (save.login.last !== today) {
      const streak = save.login.last === prevDate(today) ? save.login.streak + 1 : 1;
      save.login = { last: today, streak };
    }
    const claim = claimCalendar(save.calendar, today);
    if (claim) {
      addFish(claim.reward.fish ?? 0);
      save.stars += claim.reward.stars ?? 0;
      persist();
      const show = () => this.showCalendar(claim.index, () => this.scene.restart());
      if (introNow) this.introDone = show;
      else show();
    }
  }

  /** 7 cells, claimed ones ticked, today's highlighted, tomorrow's reward spelled out. */
  private showCalendar(today: number, onClose: () => void) {
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45).setInteractive();
    const g = this.add.graphics();
    const top = H / 2 - 250;
    g.fillStyle(C.panel, 1).fillRoundedRect(30, top, W - 60, 500, 36);
    g.lineStyle(5, C.inkN, 1).strokeRoundedRect(30, top, W - 60, 500, 36);
    c.add([dim, g, txt(this, W / 2, top + 60, t('calendarTitle'), 40)]);
    CALENDAR.forEach((r, i) => {
      const x = 72 + i * 96;
      const y = top + 190;
      const cell = this.add.graphics();
      cell.fillStyle(i === today ? 0xfff07a : i < today ? C.green : C.gray, 1).fillRoundedRect(x - 42, y - 70, 84, 140, 16);
      cell.lineStyle(3, C.inkN, 1).strokeRoundedRect(x - 42, y - 70, 84, 140, 16);
      c.add([cell, txt(this, x, y - 45, String(i + 1), 24), txt(this, x, y + 5, i === 6 ? '🎁' : r.stars ? '⭐' : '🐟', 36),
        txt(this, x, y + 48, String((r.fish ?? 0) || r.stars), 22)]);
      if (i < today) c.add(txt(this, x + 26, y - 52, '✓', 26, '#2f7d32'));
    });
    c.add(txt(this, W / 2, top + 320, '+' + rewardText(CALENDAR[today]), 36));
    c.add(txt(this, W / 2, top + 370, t('tomorrow', { r: rewardText(CALENDAR[(today + 1) % 7]) }), 26, '#9b8a7a'));
    c.add(button(this, W / 2, top + 440, 300, 80, t('claim'), () => { if (today === 6) sfx.chest(); else sfx.coin(); c.destroy(); onClose(); }, { color: C.green }));
  }
}
