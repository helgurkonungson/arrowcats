import { CAFE_SLOTS } from '../core/content';

/**
 * Café screen layout (pure data, no Phaser) so tests can check that tappable things never overlap.
 * Coordinates are in the 720×1280 game space. Room art covers y 160..1120; the floor starts at
 * y≈870 in the hall art and y≈810 in the attic.
 */
export type Rect = { x: number; y: number; w: number; h: number };
export type Slot = (typeof CAFE_SLOTS)[number];

/** Where each decor piece is drawn (art is fitted into the rect). */
export const SLOT_RECT: Record<Slot, Rect>[] = [
  { // hall: classic front room
    window: { x: 360, y: 440, w: 280, h: 230 },
    lamp: { x: 95, y: 745, w: 140, h: 390 },
    post: { x: 630, y: 790, w: 140, h: 300 },
    sofa: { x: 245, y: 870, w: 360, h: 200 },
    counter: { x: 480, y: 935, w: 300, h: 180 },
  },
  { // attic: dormer on the right, pendant lantern under the beam, wall shelves, armchair, bar
    window: { x: 500, y: 430, w: 220, h: 230 },
    lamp: { x: 230, y: 360, w: 100, h: 230 },
    post: { x: 150, y: 580, w: 170, h: 190 },
    sofa: { x: 530, y: 860, w: 280, h: 210 },
    counter: { x: 290, y: 930, w: 340, h: 180 },
  },
];

/** Pieces that stand on the floor: their art is bottom-aligned to the slot so they never float. */
export const FLOOR_SLOTS: Slot[][] = [['lamp', 'post', 'sofa', 'counter'], ['sofa', 'counter']];

/** Tap areas of the decor: smaller than the drawn art where pieces overlap, never overlapping each other. */
export const SLOT_HIT: Record<Slot, Rect>[] = [
  {
    window: { x: 360, y: 440, w: 280, h: 230 },
    lamp: { x: 85, y: 660, w: 120, h: 200 }, // shade and upper pole, above the sofa
    post: { x: 640, y: 800, w: 120, h: 280 },
    sofa: { x: 240, y: 875, w: 340, h: 190 },
    counter: { x: 495, y: 935, w: 130, h: 180 }, // front of the counter, right of the sofa
  },
  {
    window: { x: 500, y: 430, w: 220, h: 230 },
    lamp: { x: 230, y: 360, w: 100, h: 230 },
    post: { x: 150, y: 580, w: 170, h: 190 },
    sofa: { x: 540, y: 870, w: 260, h: 190 },
    counter: { x: 250, y: 930, w: 260, h: 180 },
  },
];

const btn = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** Fixed controls on the café screen. */
export const CAFE_UI = {
  back: btn(64, 64, 96, 96),
  stars: btn(720 - 24 - 65, 64, 130, 56),
  // labelled pills ("◀ Hall" / "Attic ▶") so they never read as the Back button
  prevRoom: btn(96, 215, 168, 64),
  nextRoom: btn(720 - 96, 215, 168, 64),
  tips: btn(130, 1065, 210, 70),
  taskPanel: btn(360, 1190, 680, 136),
  visitor: btn(440, 710, 160, 120),
};

export const overlaps = (a: Rect, b: Rect) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
