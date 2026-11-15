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
  });

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
    const s = migrate({ level: 7, cafe: [[2]] });
    expect(s.level).toBe(7);
    expect(s.cafe[0][0]).toBe(2);
    expect(s.cafe[0][1]).toBe(-1);
  });
});

import { CHAPTERS, chapterCost, doTask, nextTask, progress, starsToScene } from '../src/core/meta';

describe('meta', () => {
  it('chapters cost 13 stars with scenes after tasks 3, 6 and 8', () => {
    for (const c of CHAPTERS) {
      expect(chapterCost(c)).toBe(13);
      expect(c.sceneAfter).toEqual([2, 5, 7]);
      expect(c.scenes.length).toBe(3);
    }
  });

  it('walks through chapters, scenes and stars', () => {
    const st = { stars: 0, tasksDone: [] as string[] };
    expect(starsToScene(st.tasksDone, 0)).toBe(5); // 1 + 2 + 2
    expect(doTask(st)).toBeNull();
    st.stars = 100;
    const scenes: string[] = [];
    let r;
    while ((r = doTask(st))) if (r.scene >= 0) scenes.push(`${r.chapter}:${r.scene}${r.chapterDone ? '!' : ''}`);
    expect(scenes).toEqual(['0:0', '0:1', '0:2!', '1:0', '1:1', '1:2!']);
    expect(st.stars).toBe(100 - 26);
    expect(nextTask(st.tasksDone)).toBeNull();
    expect(progress(st.tasksDone).chapter).toBe(CHAPTERS.length);
  });

  it('migrates v1 cafe purchases into done tasks', () => {
    const s = migrate({ v: 1, cafe: [[0, 1, -1, -1, -1]] });
    expect(s.tasksDone).toEqual(['hall_d0', 'hall_d1']);
    expect(s.v).toBe(4);
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
