/**
 * Friendship with each breed (long loop): every rescued cat of a breed gives 1 point.
 * 10 levels; the last ones take weeks of play. Rewards: fish every level, stars at 5 and 10.
 */
export const FRIEND_STEPS = [5, 15, 30, 50, 80, 120, 170, 230, 300, 400];
export const FRIEND_MAX = FRIEND_STEPS.length;

export const friendLevel = (points: number) => FRIEND_STEPS.filter((s) => points >= s).length;

/** Progress inside the current level, 0..1 (1 at max). */
export function friendProgress(points: number) {
  const l = friendLevel(points);
  if (l >= FRIEND_MAX) return 1;
  const a = l ? FRIEND_STEPS[l - 1] : 0;
  return (points - a) / (FRIEND_STEPS[l] - a);
}

export const friendReward = (level: number) => ({ fish: 20 * level, stars: level === 5 ? 1 : level === 10 ? 3 : 0 });

/** Adds points per breed; returns the levels reached during this call as [breed, level]. */
export function addFriendship(friend: Record<number, number>, rescued: number[]): [number, number][] {
  const ups: [number, number][] = [];
  for (const b of rescued) {
    const before = friendLevel(friend[b] ?? 0);
    friend[b] = (friend[b] ?? 0) + 1;
    const after = friendLevel(friend[b]);
    if (after > before) ups.push([b, after]);
  }
  return ups;
}
