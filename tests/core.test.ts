import { describe, expect, it } from 'vitest';
import { Board, headDir } from '../src/core/board';
import { generateOnce } from '../src/core/generator';
import { getDaily, getLevel, levelParams } from '../src/core/levels';
import { migrate, defaultSave } from '../src/core/save';
import { metrics, solve } from '../src/core/solver';
import { Level } from '../src/core/types';

const lv = (cats: [number, number][][]): Level => ({
  id: 't', w: 4, h: 4, boxes: [],
  cats: cats.map((c, id) => ({ id, breed: 0, cells: c.map(([x, y]) => ({ x, y })) })),
});

describe('board', () => {
  it('detects head direction and blockers', () => {
    const l = lv([[[1, 1], [1, 2]], [[0, 0], [1, 0], [2, 0]]]);
    const b = new Board(l);
    expect(headDir(b.cats.get(0)!)).toBe(0);
    expect(b.check(0)).toEqual({ free: false, steps: 0, blocker: 1 });
    expect(b.check(1).free).toBe(true);
    b.remove(1);
    expect(b.check(0)).toEqual({ free: true, steps: 1, blocker: -1 });
  });

  it('solver finds deadlock', () => {
    // two cats facing each other on one row
    const l = lv([[[1, 0], [0, 0]], [[2, 0], [3, 0]]]);
    expect(solve(l).solvable).toBe(false);
  });
});

describe('levels', () => {
  it('first 300 levels are solvable, valid and deterministic', () => {
    for (let n = 1; n <= 300; n++) {
      const l = getLevel(n);
      const m = metrics(l);
      expect(m.solvable, `level ${n}`).toBe(true);
      expect(m.cats).toBeGreaterThanOrEqual(2);
      const seen = new Set<number>();
      for (const c of l.cats)
        for (const p of c.cells) {
          const k = p.y * l.w + p.x;
          expect(seen.has(k)).toBe(false);
          seen.add(k);
          expect(p.x >= 0 && p.y >= 0 && p.x < l.w && p.y < l.h).toBe(true);
        }
    }
    const p = levelParams(50);
    expect(generateOnce(123, p, 'a')).toEqual(generateOnce(123, p, 'a'));
  }, 60_000);

  it('daily levels are solvable', () => {
    for (let d = 0; d < 60; d++) {
      const date = new Date(Date.UTC(2026, 10, 15 + d)).toISOString().slice(0, 10);
      expect(solve(getDaily(date)).solvable).toBe(true);
    }
  });
});

describe('save', () => {
  it('migrates garbage and partial saves', () => {
    expect(migrate(null)).toEqual(defaultSave());
    const s = migrate({ v: 5, level: 7, cafe: [[2]] });
    expect(s.level).toBe(7);
    expect(s.cafe[0][0]).toBe(-1); // a look is only kept when its renovation task is done
    expect(s.cafe[0][1]).toBe(-1);
    const t = migrate({ v: 5, cafe: [[2, 1]], tasksDone: ['hall_d0', 'hall_d1', 'hall2_d0'] });
    expect(t.cafeTier[0].slice(0, 2)).toEqual([1, 0]);
    expect(t.cafe[0].slice(0, 2)).toEqual([1, 0]);
  });
});

import { CHAPTERS, chapterCost, doTask, nextTask, progress, starsToScene } from '../src/core/meta';

describe('meta', () => {
  it('chapters cost 15 / 25 / 35 stars by stage with scenes after tasks 2, 4 and 5', () => {
    for (const c of CHAPTERS) {
      expect(chapterCost(c)).toBe([15, 25, 35][c.stage]);
      expect(c.sceneAfter).toEqual([1, 3, 4]);
      expect(c.scenes.length).toBe(3);
    }
  });

  it('walks through chapters, scenes and stars', () => {
    const st = { stars: 0, tasksDone: [] as string[] };
    expect(starsToScene(st.tasksDone, 0)).toBe(6); // 3 + 3
    expect(doTask(st)).toBeNull();
    st.stars = 500;
    const scenes: string[] = [];
    let r;
    while ((r = doTask(st))) if (r.scene >= 0) scenes.push(`${r.chapter}:${r.scene}${r.chapterDone ? '!' : ''}`);
    expect(scenes).toEqual(CHAPTERS.flatMap((_, c) => [`${c}:0`, `${c}:1`, `${c}:2!`]));
    expect(st.stars).toBe(500 - CHAPTERS.reduce((n, c) => n + chapterCost(c), 0));
    expect(nextTask(st.tasksDone)).toBeNull();
    expect(progress(st.tasksDone).chapter).toBe(CHAPTERS.length);
  });
});

import { CALENDAR, claimCalendar, streakState, tipsAvailable, tipsCap } from '../src/core/retention';

describe('retention', () => {
  it('calendar gives one reward per day and loops after 7', () => {
    const c = { day: 0, last: '' };
    expect(claimCalendar(c, '2026-11-15')?.index).toBe(0);
    expect(claimCalendar(c, '2026-11-15')).toBeNull();
    for (let d = 16; d <= 21; d++) claimCalendar(c, `2026-11-${d}`);
    expect(c.day).toBe(0);
    expect(CALENDAR[6].stars).toBe(2);
  });

  it('tips grow with comfort and stop at the 8 h cap', () => {
    const empty = [[-1, -1, -1, -1, -1]];
    const two = [[0, 1, -1, -1, -1]];
    const h = 3600000;
    expect(tipsAvailable(empty, 0, 10 * h)).toBe(0); // not started
    expect(tipsAvailable(empty, 1, 1 + 3 * h)).toBe(6);
    expect(tipsAvailable(two, 1, 1 + 3 * h)).toBe(12);
    expect(tipsAvailable(two, 1, 1 + 30 * h)).toBe(tipsCap(two));
  });

  it('streak is at risk the day after and lost after that', () => {
    expect(streakState('2026-11-15', 4, '2026-11-15')).toEqual({ streak: 4, alive: true, atRisk: false });
    expect(streakState('2026-11-14', 4, '2026-11-15').atRisk).toBe(true);
    expect(streakState('2026-11-12', 4, '2026-11-15').alive).toBe(false);
  });
});

import { addPaws, eventAt, setComplete, SETS, tagCounts, TRACK, updateVisitor } from '../src/core/live';

describe('live', () => {
  it('visitor arrives only after 2 h away and with enough tags', () => {
    const v = { visitor: -1, until: 0, lastSeen: 0 };
    const cafe = [[0, 2, -1, -1, -1]]; // slot0 v0 -> cozy, slot1 v2 -> cozy
    expect(tagCounts(cafe).cozy).toBe(2);
    expect(updateVisitor(v, cafe, [], 1000, 0)).toBe(false); // first sight only stamps time
    expect(updateVisitor(v, cafe, [], 1000 + 3600000, 0)).toBe(false); // 1 h away
    expect(updateVisitor(v, cafe, [], 1000 + 3600000 * 4, 0)).toBe(true);
    expect(v.visitor).toBe(9); // sphynx likes cozy
    updateVisitor(v, cafe, [9], 1000 + 3600000 * 5, 0);
    expect(v.visitor).toBe(-1); // adopted -> leaves
  });

  it('sets complete when all four breeds are owned', () => {
    expect(setComplete(SETS[0].breeds, [0, 1, 2])).toBe(false);
    expect(setComplete(SETS[0].breeds, [3, 2, 1, 0, 5])).toBe(true);
  });

  it('event track pays out in order and four tracks finish a season', () => {
    const ev = { id: '', paws: 0, claimed: 0 };
    const season = { id: -999, tracks: 0 };
    const weeks = ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'];
    expect(eventAt(weeks[0]).season).toBe(eventAt(weeks[3]).season);
    let done = false;
    weeks.forEach((d, i) => {
      const r = addPaws(ev, season, d, 100);
      expect(r.steps.length).toBe(TRACK.length);
      expect(r.week).toBe(eventAt(d).week);
      if (i === 3) done = r.seasonComplete;
    });
    expect(done).toBe(true);
    expect(addPaws(ev, season, '2026-12-01', 5).steps.length).toBe(0); // same week, track already done
  });
});

import { enDict } from '../src/i18n';
import * as fs from 'fs';

describe('i18n', () => {
  it('every locale keeps placeholders and covers the visible keys', () => {
    const unused = ['title', 'loginReward', 'room', 'buy', 'back', 'rare', 'sound', 'catsInCafe', 'task_story', 'trophyShelf'];
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const f of fs.readdirSync('src/i18n/locales')) {
      const d = JSON.parse(fs.readFileSync('src/i18n/locales/' + f, 'utf8')) as Record<string, string>;
      for (const [k, v] of Object.entries(enDict)) {
        if (unused.includes(k)) continue;
        expect(d[k], `${f}: ${k}`).toBeTypeOf('string');
        expect(ph(d[k]), `${f}: ${k}`).toBe(ph(v));
      }
    }
  });
});

import { challengeParams, parseChallenge, tapPattern } from '../src/core/share';

describe('share', () => {
  it('turns taps into emoji rows and cuts long solves', () => {
    expect(tapPattern(['exit', 'bonk', 'exit'])).toBe('🐈💥🐈');
    const long = tapPattern(Array(30).fill('exit'), 8, 3);
    expect(long.split('\n').length).toBe(3);
    expect(long.endsWith('…')).toBe(true);
  });

  it('round-trips a challenge and rejects junk', () => {
    const c = { date: '2026-11-15', time: 52, hearts: 3 };
    expect(parseChallenge(challengeParams(c))).toEqual(c);
    expect(parseChallenge({ c: '2026-11-15', t: '-1' })).toBeNull();
    expect(parseChallenge({ c: 'x', t: '50' })).toBeNull();
    expect(parseChallenge({ c: '2026-11-15', t: '50', h: '7' })).toBeNull();
    expect(parseChallenge({})).toBeNull();
  });
});

import { AD_RULES, canOfferContinue, interstitialShown, levelDone, newAdState, wantInterstitial } from '../src/core/ads';
describe('ads', () => {
  it('interstitial only from level 6, every 3 levels, 90 s apart, not after rewarded, never with No Ads', () => {
    const s = newAdState();
    let now = 1_000_000;
    for (let i = 0; i < 3; i++) levelDone(s);
    expect(wantInterstitial(s, now, 5, false)).toBe(false);
    expect(wantInterstitial(s, now, 6, false)).toBe(true);
    expect(wantInterstitial(s, now, 6, true)).toBe(false);
    interstitialShown(s, now);
    for (let i = 0; i < 3; i++) levelDone(s);
    expect(wantInterstitial(s, now + 60_000, 9, false)).toBe(false);
    now += AD_RULES.gapMs;
    s.lastRewarded = now - 10_000;
    expect(wantInterstitial(s, now, 9, false)).toBe(false);
    expect(wantInterstitial(s, now + AD_RULES.afterRewardedMs, 9, false)).toBe(true);
  });
  it('continue offer cooldown', () => {
    const s = newAdState();
    expect(canOfferContinue(s, 0)).toBe(true);
    s.lastContinue = 0;
    expect(canOfferContinue(s, 60_000)).toBe(false);
    expect(canOfferContinue(s, AD_RULES.continueGapMs)).toBe(true);
  });
});

import { chapterChest, CHAPTERS as CH, roomChapter } from '../src/core/meta';
import { addFriendship, FRIEND_MAX, FRIEND_STEPS, friendLevel, friendProgress } from '../src/core/friend';
import { newTier, streakBonus } from '../src/core/streak';
describe('loops', () => {
  it('renovation chapters: rooms alternate, stages 0..2, costs grow, enough for ~100+ levels', () => {
    expect(CH.map((c) => c.stage)).toEqual([0, 0, 1, 1, 2, 2]);
    expect(CH.map((c) => c.room)).toEqual([0, 1, 0, 1, 0, 1]);
    const costs = CH.map(chapterCost);
    for (let i = 2; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 2]);
    expect(costs.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(120);
    expect(new Set(CH.flatMap((c) => c.tasks.map((t) => t.id))).size).toBe(CH.length * 5);
    expect(chapterChest(5).fish).toBeGreaterThan(chapterChest(0).fish);
    expect(roomChapter([], 0)).toBe(0);
    expect(roomChapter([], 1)).toBe(1);
  });
  it('friendship levels and rewards', () => {
    expect(friendLevel(0)).toBe(0);
    expect(friendLevel(FRIEND_STEPS[0])).toBe(1);
    expect(friendLevel(10_000)).toBe(FRIEND_MAX);
    expect(friendProgress(10_000)).toBe(1);
    const f: Record<number, number> = {};
    const ups = addFriendship(f, [0, 0, 0, 0, 0, 1]);
    expect(f[0]).toBe(5);
    expect(ups).toEqual([[0, 1]]);
  });
  it('win streak bonuses', () => {
    expect(streakBonus(2)).toEqual({ freeHint: false, extraHeart: false, fishBonus: 0 });
    expect(streakBonus(3).freeHint).toBe(true);
    expect(streakBonus(5).extraHeart).toBe(true);
    expect(streakBonus(7).fishBonus).toBe(1);
    expect(newTier(5)).toBe(5);
    expect(newTier(6)).toBe(0);
  });
});

describe('fish sink and board ramp (2026-11-16)', () => {
  it('treat adds friendship once per day', async () => {
    const { addFriendship, canTreat, TREAT } = await import('../src/core/friend');
    const f: Record<number, number> = {};
    expect(addFriendship(f, [2], TREAT.points)).toEqual([[2, 1]]);
    expect(f[2]).toBe(5);
    expect(canTreat({ 2: '2026-11-16' }, 2, '2026-11-16')).toBe(false);
    expect(canTreat({ 2: '2026-11-15' }, 2, '2026-11-16')).toBe(true);
  });
  it('boards grow fast: ~9x11 by level 10, max 11x14', async () => {
    const { levelParams } = await import('../src/core/levels');
    const p10 = levelParams(10), p30 = levelParams(30);
    expect(p10.w * p10.h).toBeGreaterThanOrEqual(130);
    expect(p30.w).toBe(11); expect(p30.h).toBe(14);
    for (let n = 1; n <= 300; n++) { const p = levelParams(n); expect(p.w).toBeLessThanOrEqual(11); expect(p.h).toBeLessThanOrEqual(14); }
  });
});

describe('few free cats + mini-tutorial + v5 reset (2026-11-16)', () => {
  it('levels respect the free-cat limit (3 early → 1 late, at most +1 slack)', async () => {
    const { getLevel, levelParams } = await import('../src/core/levels');
    const { metrics } = await import('../src/core/solver');
    let strict = 0;
    const ns = [6, 9, 12, 17, 20, 25, 30, 41, 55];
    for (const n of ns) {
      const p = levelParams(n);
      const m = metrics(getLevel(n));
      expect(m.solvable).toBe(true);
      expect(m.peak).toBeLessThanOrEqual(p.maxFree! + 1);
      if (m.peak <= p.maxFree!) strict++;
    }
    expect(strict).toBeGreaterThanOrEqual(ns.length - 2);
    expect(levelParams(6).maxFree).toBe(3);
    expect(levelParams(13).maxFree).toBe(1);
    expect(levelParams(40).maxFree).toBe(1);
  }, 60000);
  it('one lesson per level, core rules first, never twice', async () => {
    const { levelTips, DAILY_FROM_LEVEL } = await import('../src/core/tutorial');
    const { getLevel, LESSON } = await import('../src/core/levels');
    const ctx = { mode: 'level' as const, n: 3, hard: false, sleepy: false, boxes: false, winStreak: 0 };
    expect(levelTips(ctx, [])).toEqual(['fewFree']);
    expect(levelTips({ ...ctx, n: 4, winStreak: 3 }, ['fewFree'])).toEqual(['hint']);
    expect(levelTips({ ...ctx, n: 5, sleepy: true }, ['fewFree', 'hint'])).toEqual(['sleepy']);
    expect(levelTips({ ...ctx, n: 6 }, ['fewFree', 'hint', 'sleepy'])).toEqual(['feed']);
    expect(levelTips({ ...ctx, n: 7, winStreak: 3 }, ['fewFree', 'hint', 'sleepy', 'feed'])).toEqual(['streak']);
    expect(levelTips({ ...ctx, mode: 'daily' }, ['daily'])).toEqual([]);
    expect(DAILY_FROM_LEVEL).toBe(6);
    // the sleepy lesson level has exactly one sleepy cat and it can leave at once
    const { Board } = await import('../src/core/board');
    const lv = getLevel(LESSON.sleepy);
    const sl = lv.cats.filter((c) => c.sleepy);
    expect(sl.length).toBe(1);
    expect(new Board(lv).freeCats()).toContain(sl[0].id);
    expect(getLevel(LESSON.boxes).boxes.length).toBeGreaterThan(0);
    for (let n = 1; n < LESSON.sleepy; n++) expect(getLevel(n).cats.some((c) => c.sleepy)).toBe(false);
    for (let n = 1; n < LESSON.boxes; n++) expect(getLevel(n).boxes.length).toBe(0);
  });
  it('breeds arrive slowly: home set at 18, street at 75, daily only home', async () => {
    const { getLevel, getDaily, BREED_AT } = await import('../src/core/levels');
    const seen = new Set<number>();
    for (let n = 1; n <= 17; n++) getLevel(n).cats.forEach((c) => seen.add(c.breed));
    expect([...seen].sort()).toEqual([0, 1, 2]);
    expect(getLevel(18).cats.some((c) => c.breed === 3)).toBe(true);
    expect(BREED_AT[7]).toBe(75);
    expect(getDaily('2026-11-16').cats.every((c) => c.breed < 4)).toBe(true);
  }, 60000);
  it('v4 saves start over (purchases kept)', async () => {
    const { migrate } = await import('../src/core/save');
    const s = migrate({ v: 4, level: 35, fish: 3494, noAds: true, purchases: ['no_ads'] });
    expect(s.level ?? 1).toBeLessThanOrEqual(1);
    expect(s.fish).toBeLessThan(3494);
    expect(s.noAds).toBe(true);
  });
});
