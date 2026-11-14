import { CAFE_ROOMS, CAFE_SLOTS } from './content';

export interface DailyResult {
  hearts: number;
  time: number;
}

export interface SaveData {
  v: 1;
  level: number;
  fish: number;
  breeds: number[];
  /** cafe[room][slot] = chosen variant, -1 not bought */
  cafe: number[][];
  daily: { last: string; streak: number; results: Record<string, DailyResult> };
  login: { last: string; streak: number };
  muted: boolean;
}

export const SAVE_VERSION = 1;

export function defaultSave(): SaveData {
  return {
    v: 1,
    level: 1,
    fish: 0,
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
  const s = raw as Partial<SaveData>;
  return {
    ...base,
    ...s,
    v: 1,
    daily: { ...base.daily, ...(s.daily ?? {}) },
    login: { ...base.login, ...(s.login ?? {}) },
    cafe: base.cafe.map((room, r) => room.map((v, i) => s.cafe?.[r]?.[i] ?? v)),
  };
}

export const prevDate = (date: string) =>
  new Date(Date.parse(date + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
