/**
 * Win streak (short loop): consecutive won levels. Losing a level (retry/quit after running out of
 * hearts, or leaving a level) resets it. Bonuses apply at the start of the next level:
 * 3+ wins: one free hint, 5+ wins: +1 heart, 7+ wins: both plus +1 extra fish per cat.
 */
export interface StreakBonus {
  freeHint: boolean;
  extraHeart: boolean;
  fishBonus: number;
}

export const STREAK_TIERS = [3, 5, 7] as const;

export const streakBonus = (streak: number): StreakBonus => ({
  freeHint: streak >= 3,
  extraHeart: streak >= 5,
  fishBonus: streak >= 7 ? 1 : 0,
});

/** The tier reached exactly at this streak value (for a "new bonus" toast), or 0. */
export const newTier = (streak: number) => (STREAK_TIERS as readonly number[]).includes(streak) ? streak : 0;
