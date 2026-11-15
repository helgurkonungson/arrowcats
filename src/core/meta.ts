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
  key: 'hall' | 'attic';
  room: number;
  resident: Speaker;
  tasks: Task[];
  /** a scene plays after completing task with this index */
  sceneAfter: number[];
  /** speakers of each scene line; text is i18n `story_<key>_<scene>_<line>` */
  scenes: Speaker[][];
}

// slot indices follow CAFE_SLOTS: window, lamp, post, sofa, counter
const tasks = (key: string): Task[] => [
  { id: `${key}_s1`, kind: 'story', cost: 1 },
  { id: `${key}_d0`, kind: 'decor', cost: 2, slot: 0 },
  { id: `${key}_d1`, kind: 'decor', cost: 2, slot: 1 },
  { id: `${key}_s2`, kind: 'story', cost: 1 },
  { id: `${key}_d2`, kind: 'decor', cost: 2, slot: 2 },
  { id: `${key}_d3`, kind: 'decor', cost: 2, slot: 3 },
  { id: `${key}_s3`, kind: 'story', cost: 1 },
  { id: `${key}_d4`, kind: 'decor', cost: 2, slot: 4 },
];

export const CHAPTERS: Chapter[] = [
  {
    key: 'hall', room: 0, resident: 'bun', tasks: tasks('hall'), sceneAfter: [2, 5, 7],
    scenes: [['murr', 'bun', 'murr'], ['bun', 'murr', 'bun'], ['murr', 'bun', 'murr']],
  },
  {
    key: 'attic', room: 1, resident: 'luna', tasks: tasks('attic'), sceneAfter: [2, 5, 7],
    scenes: [['luna', 'murr', 'luna'], ['luna', 'murr'], ['luna', 'murr']],
  },
];

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
