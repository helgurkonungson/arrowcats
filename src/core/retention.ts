/** Daily/return hooks: 7-day calendar, café tips bank, streak state. Pure logic. */
import { prevDate } from './save';

export interface Reward {
  fish?: number;
  stars?: number;
  paws?: number;
}

/** Visible in advance; day 7 is the chest. */
export const CALENDAR: Reward[] = [
  { fish: 20 }, { fish: 30 }, { stars: 1 }, { fish: 50 }, { paws: 5 }, { fish: 80 }, { fish: 100, stars: 2 },
];

export const rewardText = (r: Reward) =>
  [r.fish ? `${r.fish} 🐟` : '', r.stars ? `${r.stars} ⭐` : '', r.paws ? `${r.paws} 🐾` : ''].filter(Boolean).join(' + ');

export interface CalendarState {
  day: number; // index of the next reward to claim, 0..6
  last: string; // date of the last claim
}

/** Claims today's reward once per UTC day. Missing days does not reset the calendar. */
export function claimCalendar(c: CalendarState, today: string): { index: number; reward: Reward } | null {
  if (c.last === today) return null;
  const index = c.day % CALENDAR.length;
  c.day = (index + 1) % CALENDAR.length;
  c.last = today;
  return { index, reward: CALENDAR[index] };
}

export const TIPS_HOURS = 8;
export const TIPS_PER_COMFORT_HOUR = 2;

/** Comfort = placed décor items; at least 1 so the jar works from day one. */
export function comfort(cafe: number[][]): number {
  return Math.max(1, cafe.flat().filter((v) => v >= 0).length);
}

export function tipsRate(cafe: number[][]) {
  return comfort(cafe) * TIPS_PER_COMFORT_HOUR;
}

export function tipsCap(cafe: number[][]) {
  return tipsRate(cafe) * TIPS_HOURS;
}

export function tipsAvailable(cafe: number[][], since: number, now: number): number {
  if (!since || now <= since) return 0;
  const hours = (now - since) / 3600000;
  return Math.min(tipsCap(cafe), Math.floor(hours * tipsRate(cafe)));
}

/** Streak is alive if the daily was solved today or yesterday; `atRisk` = not yet today. */
export function streakState(last: string, streak: number, today: string) {
  if (last === today) return { streak, alive: true, atRisk: false };
  if (last === prevDate(today)) return { streak, alive: true, atRisk: true };
  return { streak: 0, alive: false, atRisk: false };
}
