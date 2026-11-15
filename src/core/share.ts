/** Pure helpers for sharing daily results and reading friend challenges from the link. */

export type Tap = 'exit' | 'bonk' | 'feed' | 'hint';
const EMOJI: Record<Tap, string> = { exit: '🐈', bonk: '💥', feed: '🍗', hint: '💡' };

/** Wordle-style replay of the solve: one emoji per action, rows of `per`. Long solves are cut with "…". */
export function tapPattern(taps: Tap[], per = 8, maxRows = 3): string {
  const rows: string[] = [];
  for (let i = 0; i < taps.length && rows.length < maxRows; i += per) {
    rows.push(taps.slice(i, i + per).map((t) => EMOJI[t]).join(''));
  }
  if (taps.length > per * maxRows) rows[rows.length - 1] += '…';
  return rows.join('\n');
}

export interface Challenge {
  date: string; // YYYY-MM-DD of the daily puzzle
  time: number; // seconds
  hearts: number; // 1..3
}

export const challengeParams = (c: Challenge): Record<string, string> => ({
  c: c.date, t: String(Math.round(c.time)), h: String(c.hearts),
});

/** Reads ?c=2026-11-15&t=52&h=3; anything malformed gives null. */
export function parseChallenge(p: Record<string, string | undefined>): Challenge | null {
  const date = p.c ?? '';
  const time = Number(p.t);
  const hearts = Number(p.h ?? 3);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!Number.isFinite(time) || time <= 0 || time > 24 * 3600) return null;
  if (!Number.isInteger(hearts) || hearts < 1 || hearts > 3) return null;
  return { date, time, hearts };
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
