/** 0 up, 1 right, 2 down, 3 left */
export type Dir = 0 | 1 | 2 | 3;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export interface Cell {
  x: number;
  y: number;
}

export interface Cat {
  id: number;
  /** cells[0] is the head, last is the tail */
  cells: Cell[];
  breed: number;
  sleepy?: boolean;
}

export interface Level {
  id: string;
  w: number;
  h: number;
  cats: Cat[];
  boxes: Cell[];
  hard?: boolean;
}
