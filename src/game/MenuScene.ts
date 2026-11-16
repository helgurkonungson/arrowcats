import Phaser from 'phaser';
import { utcDate } from '../core/levels';
import { CHAPTERS, INTRO, nextTask, progress, starsToScene } from '../core/meta';
import { CALENDAR, claimCalendar, rewardText, streakState, tipsAvailable, tipsCap } from '../core/retention';
import { prevDate } from '../core/save';
import { eventAt, updateVisitor } from '../core/live';
import { t } from '../i18n';
import { drawCat } from './drawCat';
import { playMusic, setMuted, sfx } from './sfx';
import { grant, persist, platform, save } from './state';
import { art, artCat } from './art';
import { DIM, badge, button, C, dialog, iconButton, modal, panel, pill, tile, toast, txt, W, H } from './ui';
import { icon } from './icons';
import { challenge, challengeOffered, markChallengeOffered } from './share';
import { fmtTime } from '../core/share';

export class MenuScene extends Phaser.Scene {
  private introDone: () => void = () => {};

  constructor() {
    super('Menu');
  }

  create() {
    platform.ready();
    this.cameras.main.setBackgroundColor(C.bg);
    if (art(this, 'bg_menu', W / 2, H / 2, W, H, true)) this.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.35);
    playMusic('music_cafe');
    const fish = pill(this, W - 28, 64, 'fish', () => save.fish);
    pill(this, W - 228, 64, 'star', () => save.stars, 130);
    iconButton(this, 64, 64, save.muted ? 'mute' : 'sound', () => {
      save.muted = !save.muted;
      setMuted(save.muted);
      persist();
      this.scene.restart();
    });

    // logo: generated art, text fallback
    if (!art(this, 'logo', W / 2, 215, W - 80, 230)) {
      const logo = txt(this, W / 2, 215, t('title'), 96, C.ink).setStroke('#fff9f0', 14);
      logo.setShadow(0, 8, '#e2c7a4', 0, true, false);
      if (logo.width > W - 60) logo.setScale((W - 60) / logo.width);
    }

    // mascot on a soft floor shadow
    this.add.ellipse(W / 2, 452, 330, 46, C.inkN, 0.1);
    const pts = [[470, 380], [400, 380], [330, 380], [330, 440], [260, 440]].map(([x, y]) => ({ x, y }));
    const g = artCat(this, pts, 0, 90, 'happy');
    this.tweens.add({ targets: g, y: -10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const today = utcDate();
    const dailyDone = !!save.daily.results[today];
    const task = nextTask(save.tasksDone);
    if (task) {
      const p = progress(save.tasksDone);
      const need = starsToScene(save.tasksDone, save.stars);
      const chip = txt(this, W / 2, 545, `${t('chapter_' + CHAPTERS[p.chapter].key)} · ${need ? t('toScene', { n: need }) : t('sceneReady')}`, 26, C.muted);
      const cg = this.add.graphics();
      cg.fillStyle(C.latte, 1).fillRoundedRect(W / 2 - chip.width / 2 - 24, 545 - 24, chip.width + 48, 48, 24);
      chip.setDepth(1);
    }
    // hero CTA: one big apricot button, gently breathing
    const play = button(this, W / 2, 665, 560, 132, t('play', { n: save.level }), () =>
      this.scene.start('Level', { mode: 'level', n: save.level }), { color: C.primary, size: 46, icon: 'play' });
    this.tweens.add({ targets: play, scale: 1.035, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    button(this, W / 2, 815, 560, 96, t(dailyDone ? 'dailyDone' : 'daily'), () =>
      this.scene.start('Level', { mode: 'daily', date: today }), { color: C.panel, size: 34, icon: 'daily' });

    const tips = tipsAvailable(save.cafe, save.tips.since, Date.now());
    if (updateVisitor(save.visit, save.cafe, save.breeds, Date.now(), Math.random())) this.time.delayedCall(400, () => toast(this, t('visitorArrived'), 470));
    persist();
    const ready = (!!task && save.stars >= task.cost) || tips >= tipsCap(save.cafe) / 2 || save.visit.visitor >= 0;
    // secondary destinations as a row of tiles
    const ev = eventAt(today);
    const tw = 176;
    const ty = 1000;
    const cafe = tile(this, W / 2 - tw - 14, ty, tw, 170, 'cafe', t('cafe'), () => this.scene.start('Cafe'));
    if (ready) badge(this, cafe, tw / 2 - 8, -78);
    tile(this, W / 2, ty, tw, 170, 'collection', t('collection'), () => this.scene.start('Collection'));
    const evTile = tile(this, W / 2 + tw + 14, ty, tw, 170, 'paw', `${t('event')}`, () => this.scene.start('Event'));
    const paws = save.event.id === ev.id ? save.event.paws : 0;
    if (paws > 0) evTile.add(txt(this, tw / 2 - 18, -70, String(paws), 24, '#ffffff').setStroke(C.ink, 6));

    const st = streakState(save.daily.last, save.daily.streak, today);
    if (st.alive) {
      txt(this, W / 2, 1160, st.atRisk ? t('streakRisk', { n: st.streak }) : t('streakFlame', { n: st.streak }), 26, st.atRisk ? '#c9482a' : C.ink);
    }
    txt(this, W / 2, 1222, t('tomorrow', { r: rewardText(CALENDAR[save.calendar.day % 7]) }), 24, C.muted);
    void fish;

    // first launch: story intro instead of a stack of popups
    const introNow = !save.introSeen;
    if (introNow) {
      save.introSeen = true;
      persist();
      dialog(this, INTRO.map((who, i) => ({ who, name: t('who_' + who), text: t('intro_' + i) })), t('tapToContinue'), () => this.introDone(), 'chapter1_cover');
    }
    // login streak + 7-day calendar (after the intro on first launch)
    if (save.login.last !== today) {
      const streak = save.login.last === prevDate(today) ? save.login.streak + 1 : 1;
      save.login = { last: today, streak };
    }
    const claim = claimCalendar(save.calendar, today);
    if (claim) {
      grant(claim.reward);
      const show = () => this.showCalendar(claim.index, () => this.scene.restart());
      if (introNow) this.introDone = show;
      else show();
    } else if (introNow) this.introDone = () => this.offerChallenge(today);
    else this.offerChallenge(today);
  }

  /** Opened from a friend's share link: invite straight into today's puzzle. */
  private offerChallenge(today: string) {
    const ch = challenge();
    if (!ch || challengeOffered() || save.daily.results[today]) return;
    markChallengeOffered();
    platform.track('challenge_open', { sameDay: ch.date === today });
    const close = modal(this, t('challengeTitle'), [ch.date === today ? t('challengeText', { t: fmtTime(ch.time) }) : t('challengeTextOld')], [
      { label: t('challengeAccept'), color: C.primary, onClick: () => { close(); this.scene.start('Level', { mode: 'daily', date: today }); } },
      { label: t('visitorLater'), color: C.gray, onClick: () => close() },
    ]);
  }

  /** 7 cells, claimed ones ticked, today's highlighted, tomorrow's reward spelled out. */
  private showCalendar(today: number, onClose: () => void) {
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, DIM, 0.55).setInteractive();
    const g = this.add.graphics();
    const top = H / 2 - 250;
    panel(g, 30, top, W - 60, 510, 40);
    c.add([dim, g, txt(this, W / 2, top + 60, t('calendarTitle'), 40)]);
    CALENDAR.forEach((r, i) => {
      const x = 72 + i * 96;
      const y = top + 190;
      const cell = this.add.graphics();
      cell.fillStyle(i === today ? C.gold : i < today ? 0xd8eccf : C.latte, 1).fillRoundedRect(x - 42, y - 70, 84, 140, 16);
      cell.lineStyle(3, C.inkN, 1).strokeRoundedRect(x - 42, y - 70, 84, 140, 16);
      c.add([cell, txt(this, x, y - 45, String(i + 1), 24), icon(this, i === 6 ? 'gift' : r.stars ? 'star' : r.paws ? 'paw' : 'fish', x, y + 5, 52),
        txt(this, x, y + 48, String(r.fish ?? r.stars ?? r.paws), 22)]);
      if (i < today) c.add(icon(this, 'check', x + 26, y - 50, 34));
    });
    c.add(txt(this, W / 2, top + 320, '+' + rewardText(CALENDAR[today]), 36));
    c.add(txt(this, W / 2, top + 370, t('tomorrow', { r: rewardText(CALENDAR[(today + 1) % 7]) }), 26, C.muted));
    c.add(button(this, W / 2, top + 445, 320, 88, t('claim'), () => { if (today === 6) sfx.chest(); else sfx.coin(); c.destroy(); onClose(); }, { color: C.primary, size: 38 }));
  }
}
