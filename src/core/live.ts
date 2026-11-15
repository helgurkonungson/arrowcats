/** Visitors, collection sets, accessories, weekly events and seasons. Pure logic. */
import type { Reward } from './retention';

// ---------- café tags & visitors ----------

export type Tag = 'cozy' | 'play' | 'sun';
export const TAGS: Tag[] = ['cozy', 'play', 'sun'];
export const TAG_ICON: Record<Tag, string> = { cozy: '🛋', play: '🧶', sun: '☀' };
/** Every décor variant carries one tag; rotating by slot keeps rooms varied. */
export const tagOf = (slot: number, variant: number): Tag => TAGS[(slot + variant) % 3];

export function tagCounts(cafe: number[][]): Record<Tag, number> {
  const c: Record<Tag, number> = { cozy: 0, play: 0, sun: 0 };
  cafe.forEach((room) => room.forEach((v, slot) => v >= 0 && c[tagOf(slot, v)]++));
  return c;
}

export const VISITORS = [
  { breed: 8, tag: 'play' as Tag, need: 2, treat: 80 }, // maine coon
  { breed: 9, tag: 'cozy' as Tag, need: 2, treat: 100 }, // sphynx
  { breed: 10, tag: 'sun' as Tag, need: 3, treat: 150 }, // bengal
];
export const VISIT_AFTER_MS = 2 * 3600000;
export const VISIT_STAY_MS = 24 * 3600000;

export interface VisitState {
  visitor: number; // breed, -1 none
  until: number;
  lastSeen: number;
}

/** Call on every café/menu open. A visitor may arrive if the player was away 2+ hours. */
export function updateVisitor(v: VisitState, cafe: number[][], owned: number[], now: number, rnd: number): boolean {
  if (v.visitor >= 0 && (now > v.until || owned.includes(v.visitor))) v.visitor = -1;
  let arrived = false;
  if (v.visitor < 0 && v.lastSeen && now - v.lastSeen >= VISIT_AFTER_MS) {
    const counts = tagCounts(cafe);
    const ok = VISITORS.filter((x) => !owned.includes(x.breed) && counts[x.tag] >= x.need);
    if (ok.length) {
      v.visitor = ok[Math.floor(rnd * ok.length)].breed;
      v.until = now + VISIT_STAY_MS;
      arrived = true;
    }
  }
  v.lastSeen = now;
  return arrived;
}

// ---------- collection sets & accessories ----------

export const SETS: { key: 'home' | 'street' | 'rare'; breeds: number[]; reward: Reward }[] = [
  { key: 'home', breeds: [0, 1, 2, 3], reward: { fish: 100 } },
  { key: 'street', breeds: [4, 5, 6, 7], reward: { fish: 200, stars: 2 } },
  { key: 'rare', breeds: [8, 9, 10, 11], reward: { fish: 500, stars: 3 } },
];
export const setComplete = (breeds: number[], owned: number[]) => breeds.every((b) => owned.includes(b));

export const ACCESSORIES = ['pompom_hat', 'earmuffs', 'scarf', 'snow_crown'] as const;
export const TROPHIES = ['snowglobe', 'mitten', 'lantern', 'gingerbread_house'] as const;
export const TROPHY_ICON: Record<string, string> = { snowglobe: '🔮', mitten: '🧤', lantern: '🏮', gingerbread_house: '🏠' };
export const GOLDEN = 11;

// ---------- weekly events & season ----------

const EVENT_EPOCH = Date.UTC(2026, 10, 9); // Monday
export const SEASON_WEEKS = 4;

export function eventAt(date: string) {
  const days = Math.floor((Date.parse(date + 'T00:00:00Z') - EVENT_EPOCH) / 86400000);
  const week = Math.floor(days / 7);
  return {
    id: `w${week}`,
    season: Math.floor(week / SEASON_WEEKS),
    week: ((week % SEASON_WEEKS) + SEASON_WEEKS) % SEASON_WEEKS,
    daysLeft: 7 - (((days % 7) + 7) % 7),
  };
}

export interface TrackStep {
  paws: number;
  reward?: Reward;
  trophy?: boolean;
  accessory?: boolean;
}
export const TRACK: TrackStep[] = [
  { paws: 10, reward: { fish: 50 } },
  { paws: 25, reward: { stars: 1 } },
  { paws: 45, reward: { fish: 100 } },
  { paws: 70, trophy: true },
  { paws: 100, accessory: true },
];
export const PAWS = { level: 1, hard: 3, daily: 3 };

export interface EventState {
  id: string;
  paws: number;
  claimed: number;
}
export interface SeasonState {
  id: number;
  tracks: number;
}

/** Rolls state into the current week/season, adds paws and returns newly reached steps. */
export function addPaws(ev: EventState, season: SeasonState, date: string, n: number) {
  const e = eventAt(date);
  if (ev.id !== e.id) Object.assign(ev, { id: e.id, paws: 0, claimed: 0 });
  if (season.id !== e.season) Object.assign(season, { id: e.season, tracks: 0 });
  ev.paws += n;
  const steps: TrackStep[] = [];
  let trackDone = false;
  while (ev.claimed < TRACK.length && ev.paws >= TRACK[ev.claimed].paws) {
    steps.push(TRACK[ev.claimed]);
    ev.claimed++;
    if (ev.claimed === TRACK.length) {
      season.tracks++;
      trackDone = true;
    }
  }
  return { steps, week: e.week, seasonComplete: trackDone && season.tracks >= SEASON_WEEKS };
}
