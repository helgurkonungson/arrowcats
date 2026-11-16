import { describe, expect, it } from 'vitest';
import { CAFE_SLOTS } from '../src/core/content';
import { CAFE_UI, overlaps, SLOT_HIT } from '../src/game/cafeLayout';

/** Tappable areas must never overlap: a tap on one control must not trigger another. */
describe('café layout', () => {
  const ui = Object.entries(CAFE_UI);
  SLOT_HIT.forEach((room, r) => {
    it(`room ${r + 1}: decor tap areas do not overlap each other`, () => {
      for (let i = 0; i < CAFE_SLOTS.length; i++)
        for (let j = i + 1; j < CAFE_SLOTS.length; j++)
          expect(overlaps(room[CAFE_SLOTS[i]], room[CAFE_SLOTS[j]]), `${CAFE_SLOTS[i]} × ${CAFE_SLOTS[j]}`).toBe(false);
    });
    it(`room ${r + 1}: decor tap areas do not overlap screen controls`, () => {
      for (const s of CAFE_SLOTS)
        for (const [name, rect] of ui) expect(overlaps(room[s], rect), `${s} × ${name}`).toBe(false);
    });
    it(`room ${r + 1}: tap areas stay inside the room picture`, () => {
      for (const s of CAFE_SLOTS) {
        const h = room[s];
        expect(h.x - h.w / 2 >= 0 && h.x + h.w / 2 <= 720 && h.y - h.h / 2 >= 160 && h.y + h.h / 2 <= 1120, s).toBe(true);
      }
    });
  });
  it('screen controls do not overlap each other', () => {
    for (let i = 0; i < ui.length; i++)
      for (let j = i + 1; j < ui.length; j++) expect(overlaps(ui[i][1], ui[j][1]), `${ui[i][0]} × ${ui[j][0]}`).toBe(false);
  });
});
