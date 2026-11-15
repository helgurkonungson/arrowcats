import { CAFE_ROOMS, CAFE_SLOTS } from './content';

export interface DailyResult {
  hearts: number;
  time: number;
}

export interface SaveData {
  v: 3;
  calendar: { day: number; last: string };
  /** ms timestamp since tips started accumulating (0 = not started) */
  tips: { since: number };
  level: number;
  fish: number;
  stars: number;
  /** completed café task ids, see core/meta.ts */
  tasksDone: string[];
  /** best hearts left per level number */
  best: Record<number, number>;
  /** chapter key -> still flawless (no lost hearts) */
  flawless: Record<string, boolean>;
  /** residents whose golden frame is unlocked */
  frames: string[];
  introSeen: boolean;
  breeds: number[];
  /** cafe[room][slot] = chosen variant, -1 not bought */
  cafe: number[][];
  daily: { last: string; streak: number; results: Record<string, DailyResult> };
  login: { last: string; streak: number };
  muted: boolean;
}

export const SAVE_VERSION = 3;

export function defaultSave(): SaveData {
  return {
    v: 3,
    calendar: { day: 0, last: '' },
    tips: { since: 0 },
    level: 1,
    fish: 0,
    stars: 0,
    tasksDone: [],
    best: {},
    flawless: {},
    frames: [],
    introSeen: false,
    breeds: [],
    cafe: Array.from({ length: CAFE_ROOMS }, () => CAFE_SLOTS.map(() => -1)),
    daily: { last: '', streak: 0, results: {} },
    login: { last: '', streak: 0 },
    muted: false,
  };
}

/** Accepts anything from storage and returns a valid current-version save. */
export function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Omit<Partial<SaveData>, 'v'> & { v?: number };
  const cafe = base.cafe.map((room, r) => room.map((v, i) => s.cafe?.[r]?.[i] ?? v));
  // v1 -> v2: décor bought with fish counts as done chapter tasks
  const tasksDone = s.tasksDone ?? (s.v === 1 ? v1Tasks(cafe) : []);
  return {
    ...base,
    ...s,
    v: 3,
    tasksDone,
    calendar: { ...base.calendar, ...(s.calendar ?? {}) },
    tips: { ...base.tips, ...(s.tips ?? {}) },
    daily: { ...base.daily, ...(s.daily ?? {}) },
    login: { ...base.login, ...(s.login ?? {}) },
    cafe,
  };
}

function v1Tasks(cafe: number[][]): string[] {
  const keys = ['hall', 'attic'];
  const out: string[] = [];
  cafe.forEach((room, r) => room.forEach((v, i) => v >= 0 && keys[r] && out.push(`${keys[r]}_d${i}`)));
  return out;
}

export const prevDate = (date: string) =>
  new Date(Date.parse(date + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
