/**
 * Mini-tutorial: every mechanic is explained once, when it first appears, one lesson per level
 * (2026-11-16 playtest). Core rules first (levels 1–10), café and other activities on first visit.
 * Boosters and the sleepy cat are hands-on: after the card the player must do it (free, the rest of
 * the screen is locked). Pure logic; scenes show the cards (game/tips.ts) and mark them seen.
 */
import { LESSON } from './levels';

export type TipKey =
  | 'fewFree' | 'hint' | 'feed' | 'hard' | 'sleepy' | 'boxes' | 'streak' | 'daily'
  | 'combo' | 'cafe' | 'collection' | 'event';

/** Tips that end in a forced, free action. */
export const HANDS_ON: readonly TipKey[] = ['hint', 'sleepy', 'feed'];

export interface LevelCtx {
  mode: 'level' | 'daily';
  n: number;
  hard: boolean;
  sleepy: boolean;
  boxes: boolean;
  winStreak: number;
}

/** The daily puzzle opens after level 5 (it may contain sleepy cats, taught on level 5). */
export const DAILY_FROM_LEVEL = LESSON.sleepy + 1;

/** The tip to show at level start (at most one), skipping the ones already seen. */
export function levelTips(c: LevelCtx, seen: readonly string[]): TipKey[] {
  const out: TipKey[] = [];
  if (c.mode === 'daily') out.push('daily');
  else {
    if (c.n >= LESSON.fewFree) out.push('fewFree');
    if (c.n >= LESSON.hint) out.push('hint');
  }
  if (c.sleepy) out.push('sleepy');
  if (c.mode === 'level' && c.n >= LESSON.feed) out.push('feed');
  if (c.boxes) out.push('boxes');
  if (c.hard) out.push('hard');
  if (c.mode === 'level' && c.winStreak >= 2) out.push('streak');
  return out.filter((k) => !seen.includes(k)).slice(0, 1);
}
