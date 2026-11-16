/**
 * Mini-tutorial (2026-11-16 playtest): every mechanic is explained once, at the moment it first
 * appears, never all at once. Pure logic; scenes show the cards (game/tips.ts) and mark them seen.
 */
export type TipKey =
  | 'fewFree' | 'hint' | 'feed' | 'hard' | 'sleepy' | 'boxes' | 'streak' | 'daily'
  | 'combo' | 'cafe' | 'collection' | 'event';

export interface LevelCtx {
  mode: 'level' | 'daily';
  n: number;
  hard: boolean;
  sleepy: boolean;
  boxes: boolean;
  winStreak: number;
}

/** First level of each booster lesson (after the 3 handcrafted tutorial levels). */
export const TIP_LEVEL = { fewFree: 4, hint: 5, feed: 7 } as const;

/** Tips to show at level start, in order, skipping the ones already seen. */
export function levelTips(c: LevelCtx, seen: readonly string[]): TipKey[] {
  const out: TipKey[] = [];
  if (c.mode === 'daily') out.push('daily');
  else {
    if (c.n >= TIP_LEVEL.fewFree) out.push('fewFree');
    if (c.n >= TIP_LEVEL.hint) out.push('hint');
    if (c.n >= TIP_LEVEL.feed) out.push('feed');
    if (c.winStreak >= 2) out.push('streak');
  }
  if (c.hard) out.push('hard');
  if (c.sleepy) out.push('sleepy');
  if (c.boxes) out.push('boxes');
  // at most two cards before a level: the rest wait for the next one
  return out.filter((k) => !seen.includes(k)).slice(0, 2);
}
