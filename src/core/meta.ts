/** Chapters, café tasks and story scenes. Pure data + logic, no Phaser. */

export type Speaker = 'murr' | 'bun' | 'luna';

export interface Task {
  id: string;
  kind: 'decor' | 'story';
  cost: number;
  /** index in CAFE_SLOTS for decor tasks */
  slot?: number;
}

export interface Chapter {
  key: string;
  room: number;
  /** renovation stage of the room: 0 furnish, 1 cozy, 2 deluxe (= décor variant it unlocks) */
  stage: number;
  resident: Speaker;
  tasks: Task[];
  /** a scene plays after completing task with this index */
  sceneAfter: number[];
  /** speakers of each scene line; text is i18n `story_<key>_<scene>_<line>` */
  scenes: Speaker[][];
}

// slot indices follow CAFE_SLOTS: window, lamp, post, sofa, counter.
// Every task changes something you can see (playtest: story-only tasks felt like nothing happened).
// Costs grow with the renovation stage: 15 / 25 / 35 ⭐ per chapter, like area tasks in Royal Match.
const tasks = (key: string, stage = 0): Task[] =>
  [0, 1, 2, 3, 4].map((slot) => ({ id: `${key}_d${slot}`, kind: 'decor' as const, cost: 3 + 2 * stage, slot }));

const chapter = (key: string, room: number, stage: number, resident: Speaker, scenes: Speaker[][]): Chapter =>
  ({ key, room, stage, resident, tasks: tasks(key, stage), sceneAfter: [1, 3, 4], scenes });

/** Hall and attic are renovated three times: furnish → cozy → deluxe (the 3 art variants of each piece). */
export const CHAPTERS: Chapter[] = [
  chapter('hall', 0, 0, 'bun', [['murr', 'bun', 'murr'], ['bun', 'murr', 'bun'], ['murr', 'bun', 'murr']]),
  chapter('attic', 1, 0, 'luna', [['luna', 'murr', 'luna'], ['luna', 'murr'], ['luna', 'murr']]),
  chapter('hall2', 0, 1, 'bun', [['murr', 'bun'], ['bun', 'murr'], ['murr', 'bun']]),
  chapter('attic2', 1, 1, 'luna', [['luna', 'murr'], ['luna', 'murr'], ['luna', 'murr']]),
  chapter('hall3', 0, 2, 'bun', [['murr', 'bun'], ['bun', 'murr'], ['murr', 'bun']]),
  chapter('attic3', 1, 2, 'luna', [['luna', 'murr'], ['luna', 'murr'], ['luna', 'murr']]),
];

/**
 * Unlocked look per piece, derived from finished décor tasks (the source of truth for save.cafeTier):
 * tier[room][slot] = highest renovation stage done for it, -1 if never built.
 */
export function tiersFromTasks(done: readonly string[], rooms: number, slots: number): number[][] {
  const tier = Array.from({ length: rooms }, () => Array<number>(slots).fill(-1));
  for (const ch of CHAPTERS)
    for (const k of ch.tasks)
      if (k.kind === 'decor' && done.includes(k.id) && ch.room < rooms) tier[ch.room][k.slot!] = Math.max(tier[ch.room][k.slot!], ch.stage);
  return tier;
}

/** Chest for a finished chapter: grows with the chapter number. */
export const chapterChest = (c: number) => ({ fish: 100 + 50 * c, paws: 2 + c });

/** Latest chapter played in this room (for the café title), never past the current one. */
export function roomChapter(done: readonly string[], room: number): number {
  const cur = Math.min(progress(done).chapter, CHAPTERS.length - 1);
  for (let c = cur; c >= 0; c--) if (CHAPTERS[c].room === room) return c;
  return CHAPTERS.findIndex((ch) => ch.room === room);
}

/** Story intro shown once before the first task of the game. */
export const INTRO: Speaker[] = ['murr', 'murr'];

export const chapterCost = (c: Chapter) => c.tasks.reduce((n, t) => n + t.cost, 0);

export interface Progress {
  chapter: number; // index in CHAPTERS, CHAPTERS.length when all done
  task: number; // index of the next task inside the chapter
}

export function progress(done: readonly string[]): Progress {
  for (let c = 0; c < CHAPTERS.length; c++) {
    const i = CHAPTERS[c].tasks.findIndex((t) => !done.includes(t.id));
    if (i !== -1) return { chapter: c, task: i };
  }
  return { chapter: CHAPTERS.length, task: 0 };
}

export function nextTask(done: readonly string[]): Task | null {
  const p = progress(done);
  return p.chapter < CHAPTERS.length ? CHAPTERS[p.chapter].tasks[p.task] : null;
}

/** Stars still missing to reach the next story scene (0 = can get there now). */
export function starsToScene(done: readonly string[], stars: number): number {
  const p = progress(done);
  if (p.chapter >= CHAPTERS.length) return 0;
  const ch = CHAPTERS[p.chapter];
  const end = ch.sceneAfter.find((i) => i >= p.task) ?? ch.tasks.length - 1;
  let need = 0;
  for (let i = p.task; i <= end; i++) need += ch.tasks[i].cost;
  return Math.max(0, need - stars);
}

export interface TaskResult {
  task: Task;
  chapter: number;
  /** scene index inside the chapter that should play now, or -1 */
  scene: number;
  chapterDone: boolean;
}

/** Spends stars on the next task. Mutates state; returns null if not affordable. */
export function doTask(state: { stars: number; tasksDone: string[] }): TaskResult | null {
  const p = progress(state.tasksDone);
  if (p.chapter >= CHAPTERS.length) return null;
  const ch = CHAPTERS[p.chapter];
  const task = ch.tasks[p.task];
  if (state.stars < task.cost) return null;
  state.stars -= task.cost;
  state.tasksDone.push(task.id);
  return {
    task,
    chapter: p.chapter,
    scene: ch.sceneAfter.indexOf(p.task),
    chapterDone: p.task === ch.tasks.length - 1,
  };
}
