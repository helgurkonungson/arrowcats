import Phaser from 'phaser';
import { drawCat } from './drawCat';
import { has, SPEAKER_ART } from './art';
import { sfx } from './sfx';
import { icon, IconName } from './icons';

export const W = 720;
export const H = 1280;
export const FONT = '"Nunito", "Trebuchet MS", "Segoe UI", Arial, sans-serif';

/**
 * Palette "Warm café storybook" (Art/PROMPTS.md, art bible). Warm low-chroma world,
 * saturated characters, one hero accent (apricot) and one cool accent (teal = fish, boosters).
 */
export const C = {
  bg: 0xfbf1e3, // cream paper
  ink: '#4a3328', // cocoa, all text and outlines
  inkN: 0x4a3328,
  muted: '#7a604e', // secondary text, 5:1 on cream
  primary: 0xff9e5e, // apricot, hero CTA
  green: 0x8fd07a, // success / done states
  blue: 0x6cc6bd, // teal, boosters and sharing
  pink: 0xf7b9c4,
  purple: 0xc9b6ee,
  gold: 0xffc94a, // rewards, rewarded ads
  panel: 0xfff9f0,
  latte: 0xf1e0c8,
  gray: 0xeadbc6,
  coral: 0xf0606e,
};

/** Face / lip (3D bottom edge) / text style per button kind. */
type Kind = 'primary' | 'gold' | 'teal' | 'secondary';
const KIND: Record<Kind, { face: number; lip: number; top: number; text: string; stroke: boolean }> = {
  primary: { face: 0xff9e5e, lip: 0xd9713a, top: 0xffb985, text: '#ffffff', stroke: true },
  gold: { face: 0xffc94a, lip: 0xd99a22, top: 0xffdb80, text: C.ink, stroke: false },
  teal: { face: 0x6cc6bd, lip: 0x3f958d, top: 0x93d8d1, text: '#ffffff', stroke: true },
  secondary: { face: 0xfff9f0, lip: 0xe2c7a4, top: 0xffffff, text: C.ink, stroke: false },
};
const kindOf = (color?: number): Kind =>
  color === C.primary || color === C.green ? 'primary' : color === C.gold ? 'gold' : color === C.blue ? 'teal' : 'secondary';

export function txt(s: Phaser.Scene, x: number, y: number, str: string, size = 32, color = C.ink) {
  return s.add
    .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', fontStyle: '800' })
    .setOrigin(0.5);
}

/** Card / panel with a soft 3D lip. */
export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r = 30, face: number = C.panel, lip = 0xe2c7a4) {
  g.fillStyle(lip, 1).fillRoundedRect(x, y + 8, w, h, r);
  g.fillStyle(face, 1).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(5, C.inkN, 1).strokeRoundedRect(x, y, w, h + 8, r);
  return g;
}

export interface BtnOpts {
  color?: number;
  size?: number;
  disabled?: boolean;
  icon?: IconName;
}

/** Rounded 3D button. onClick is always called; disabled only changes the look. */
export function button(
  s: Phaser.Scene, x: number, y: number, w: number, h: number, label: string,
  onClick: () => void, o: BtnOpts = {},
) {
  const k = KIND[o.disabled ? 'secondary' : kindOf(o.color)];
  const c = s.add.container(x, y);
  const face = s.add.container(0, 0);
  const g = s.add.graphics();
  const r = Math.min(30, h / 2);
  const lip = Math.max(6, Math.round(h * 0.08));
  g.fillStyle(C.inkN, 1).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + lip + 6, r + 3);
  g.fillStyle(k.lip, 1).fillRoundedRect(-w / 2, -h / 2 + lip, w, h, r);
  const fg = s.add.graphics();
  fg.fillStyle(k.face, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
  fg.fillStyle(k.top, 1).fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, Math.min(16, h * 0.18), 8);
  const t = txt(s, 0, 0, label, o.size ?? 34, o.disabled ? C.muted : k.text);
  if (k.stroke && !o.disabled) t.setStroke(C.ink, 6);
  face.add([fg, t]);
  if (o.icon) {
    const is = Math.min(h * 0.62, (o.size ?? 34) * 1.6);
    const im = icon(s, o.icon, 0, 0, is);
    if (label) {
      const total = is + 12 + t.width;
      im.x = -total / 2 + is / 2;
      t.x = im.x + is / 2 + 12 + t.width / 2;
    }
    if (o.disabled) im.setAlpha(0.55);
    face.add(im);
  }
  c.add([g, face]);
  c.setSize(w, h + lip);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (!o.disabled) {
      sfx.click();
      s.tweens.add({ targets: face, y: lip - 2, duration: 60, yoyo: true });
    } else s.tweens.add({ targets: c, x: x + 6, duration: 40, yoyo: true, repeat: 1 });
    onClick();
  });
  return c;
}

/** Round icon-only button (back, sound, arrows). */
export function iconButton(s: Phaser.Scene, x: number, y: number, name: IconName, onClick: () => void, size = 84) {
  return button(s, x, y, size, size - 8, '', onClick, { icon: name });
}

export const backButton = (s: Phaser.Scene, onClick: () => void) => iconButton(s, 64, 64, 'back', onClick);

/** Red notification dot with "!" on the top-right corner of a container. */
export function badge(s: Phaser.Scene, parent: Phaser.GameObjects.Container, dx: number, dy: number) {
  const g = s.add.graphics();
  g.fillStyle(C.inkN, 1).fillCircle(dx, dy, 22);
  g.fillStyle(C.coral, 1).fillCircle(dx, dy, 18);
  parent.add([g, txt(s, dx, dy - 1, '!', 26, '#ffffff')]);
  s.tweens.add({ targets: g, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
}

/** Square menu tile: big icon on top, label below. */
export function tile(s: Phaser.Scene, x: number, y: number, w: number, h: number, name: IconName, label: string, onClick: () => void) {
  const b = button(s, x, y, w, h, '', onClick);
  const face = b.list[1] as Phaser.GameObjects.Container;
  face.add(icon(s, name, 0, -h * 0.13, h * 0.5));
  const t = txt(s, 0, h * 0.3, label, 26);
  if (t.width > w - 16) t.setScale((w - 16) / t.width);
  face.add(t);
  return b;
}

/** One toast at a time per scene: a new one replaces the previous instantly (no stacking). */
export function toast(s: Phaser.Scene, msg: string, y = 230) {
  const prev = s.data.get('toast') as Phaser.GameObjects.GameObject[] | undefined;
  if (prev) {
    s.tweens.killTweensOf(prev);
    prev.forEach((o) => o.destroy());
  }
  const t = txt(s, W / 2, y, msg, 30, '#fff9f0').setDepth(200);
  t.setWordWrapWidth(W - 120, true);
  const bg = s.add.graphics().setDepth(199);
  s.data.set('toast', [t, bg]);
  s.tweens.add({ targets: t, scale: { from: 1.15, to: 1 }, duration: 120 });
  const b = t.getBounds();
  const r = Math.min(34, (b.height + 28) / 2);
  bg.fillStyle(C.inkN, 0.94).fillRoundedRect(b.x - 30, b.y - 14, b.width + 60, b.height + 28, r);
  s.tweens.add({
    targets: [t, bg], alpha: 0, y: '-=40', delay: 1300, duration: 400,
    onComplete: () => { t.destroy(); bg.destroy(); },
  });
}

export interface ModalBtn {
  label: string;
  onClick: () => void;
  color?: number;
  disabled?: boolean;
}

export const DIM = 0x2b1d16; // warm cocoa scrim instead of black

function scrim(s: Phaser.Scene, alpha = 0.55) {
  const dim = s.add.rectangle(W / 2, H / 2, W, H, DIM, alpha).setInteractive();
  dim.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
  return dim;
}

/** Full-screen modal; returns close(). Buttons do not close it automatically. */
export function modal(s: Phaser.Scene, title: string, lines: string[], buttons: ModalBtn[]) {
  const c = s.add.container(0, 0).setDepth(100);
  const dim = scrim(s);
  const ph = 190 + lines.length * 52 + buttons.length * 118;
  const top = H / 2 - ph / 2;
  const g = s.add.graphics();
  panel(g, 60, top, W - 120, ph, 40);
  g.fillStyle(C.latte, 1).fillRoundedRect(63, top + 3, W - 126, 104, { tl: 37, tr: 37, bl: 0, br: 0 });
  g.lineStyle(3, 0xe2c7a4, 1).lineBetween(64, top + 107, W - 64, top + 107);
  const tt = txt(s, W / 2, top + 56, title, 46);
  if (tt.width > W - 180) tt.setScale((W - 180) / tt.width);
  c.add([dim, g, tt]);
  lines.forEach((l, i) => c.add(txt(s, W / 2, top + 150 + i * 52, l, 32).setWordWrapWidth(W - 180, true)));
  const by = top + 160 + lines.length * 52 + 46;
  buttons.forEach((b, i) =>
    c.add(button(s, W / 2, by + i * 118, 460, i === 0 ? 96 : 84, b.label, b.onClick, {
      color: b.color, disabled: b.disabled, size: i === 0 ? 36 : 32,
    })),
  );
  c.setScale(0.9).setAlpha(0);
  s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'Back.Out' });
  return () => c.destroy();
}

/** Currency capsule: icon overlapping the left end, value right-aligned. Right edge at x. */
export function pill(s: Phaser.Scene, x: number, y: number, name: IconName, get: () => number, w = 156) {
  const g = s.add.graphics();
  const l = x - w;
  g.fillStyle(C.inkN, 1).fillRoundedRect(l - 3, y - 27, w + 6, 54, 27);
  g.fillStyle(C.panel, 1).fillRoundedRect(l, y - 24, w, 48, 24);
  icon(s, name, l + 6, y, 62);
  const t = txt(s, x - 22, y + 1, '', 32).setOrigin(1, 0.5);
  const refresh = () => t.setText(String(get()));
  refresh();
  return { text: t, refresh };
}

export const fishLabel = (s: Phaser.Scene, x: number, y: number, get: () => number) => pill(s, x, y, 'fish', get);

const SPEAKER_BREED: Record<string, number> = { murr: 1, bun: 0, luna: 2 };

export interface DialogLine {
  who: string;
  name: string;
  text: string;
}

/** Story dialog at the bottom of the screen; tap anywhere to advance. */
export function dialog(s: Phaser.Scene, lines: DialogLine[], hint: string, onDone: () => void) {
  const c = s.add.container(0, 0).setDepth(150);
  const dim = s.add.rectangle(W / 2, H / 2, W, H, DIM, 0.4).setInteractive();
  const g = s.add.graphics();
  const top = H - 430;
  panel(g, 30, top, W - 60, 350, 36);
  const tag = s.add.graphics();
  const pg = s.add.graphics();
  const name = txt(s, 200, top, '', 32, '#ffffff').setOrigin(0, 0.5).setStroke(C.ink, 6);
  const body = s.add.text(64, top + 110, '', {
    fontFamily: FONT, fontStyle: '800', fontSize: '31px', color: C.ink, wordWrap: { width: W - 120, useAdvancedWrap: true }, lineSpacing: 6,
  });
  const tip = txt(s, W / 2, H - 112, hint, 22, C.muted);
  const face = s.add.image(105, top + 30, '__DEFAULT').setVisible(false);
  c.add([dim, g, tag, pg, face, name, body, tip]);
  let i = 0;
  const show = () => {
    const l = lines[i];
    name.setText(l.name);
    tag.clear().fillStyle(C.inkN, 1).fillRoundedRect(178, top - 29, name.width + 50, 58, 29);
    tag.fillStyle(C.primary, 1).fillRoundedRect(181, top - 26, name.width + 44, 52, 26);
    body.setText(l.text);
    const key = SPEAKER_ART[l.who];
    if (key && has(s, key)) {
      pg.clear();
      face.setTexture(key).setDisplaySize(170, 170).setVisible(true);
      return;
    }
    face.setVisible(false);
    drawCat(pg, [{ x: 105, y: top + 45 }, { x: 105, y: top + 62 }], SPEAKER_BREED[l.who] ?? 0, 90, 'happy');
    if (l.who === 'murr') {
      pg.lineStyle(4, 0x8a6a2a, 1).strokeCircle(92, top + 40, 10).strokeCircle(118, top + 40, 10).lineBetween(102, top + 40, 108, top + 40);
    }
  };
  show();
  dim.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    sfx.click();
    i++;
    if (i >= lines.length) {
      c.destroy();
      onDone();
    } else show();
  });
}
