import Phaser from 'phaser';
import { sfx } from './sfx';

export const W = 720;
export const H = 1280;
export const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';
export const C = {
  bg: 0xfdf3e7,
  ink: '#5b4636',
  inkN: 0x5b4636,
  primary: 0xf6b26b,
  blue: 0x9fd0ef,
  green: 0xa8dda4,
  pink: 0xf6b3c4,
  purple: 0xcdb8ef,
  panel: 0xfffaf3,
  gray: 0xe3d9cc,
};

export function txt(s: Phaser.Scene, x: number, y: number, str: string, size = 32, color = C.ink) {
  return s.add
    .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', fontStyle: 'bold' })
    .setOrigin(0.5);
}

export interface BtnOpts {
  color?: number;
  size?: number;
  disabled?: boolean;
}

/** Rounded button. onClick is always called; disabled only changes the look. */
export function button(
  s: Phaser.Scene, x: number, y: number, w: number, h: number, label: string,
  onClick: () => void, o: BtnOpts = {},
) {
  const c = s.add.container(x, y);
  const g = s.add.graphics();
  const r = Math.min(24, h / 2);
  g.fillStyle(0x000000, 0.12).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
  g.fillStyle(o.color ?? C.primary, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(4, C.inkN, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  c.add([g, txt(s, 0, 0, label, o.size ?? 34)]);
  c.setSize(w, h);
  if (o.disabled) c.setAlpha(0.5);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (!o.disabled) {
      sfx.click();
      s.tweens.add({ targets: c, scale: 0.93, duration: 60, yoyo: true });
    }
    onClick();
  });
  return c;
}

export function toast(s: Phaser.Scene, msg: string, y = 230) {
  const t = txt(s, W / 2, y, msg, 30).setDepth(200);
  const bg = s.add.graphics().setDepth(199);
  const b = t.getBounds();
  bg.fillStyle(C.panel, 0.95).fillRoundedRect(b.x - 18, b.y - 10, b.width + 36, b.height + 20, 18);
  bg.lineStyle(3, C.inkN, 1).strokeRoundedRect(b.x - 18, b.y - 10, b.width + 36, b.height + 20, 18);
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

/** Full-screen modal; returns close(). Buttons do not close it automatically. */
export function modal(s: Phaser.Scene, title: string, lines: string[], buttons: ModalBtn[]) {
  const c = s.add.container(0, 0).setDepth(100);
  const dim = s.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45).setInteractive();
  dim.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
  const ph = 200 + lines.length * 52 + buttons.length * 110;
  const top = H / 2 - ph / 2;
  const g = s.add.graphics();
  g.fillStyle(C.panel, 1).fillRoundedRect(70, top, W - 140, ph, 36);
  g.lineStyle(5, C.inkN, 1).strokeRoundedRect(70, top, W - 140, ph, 36);
  c.add([dim, g, txt(s, W / 2, top + 70, title, 44)]);
  lines.forEach((l, i) => c.add(txt(s, W / 2, top + 140 + i * 52, l, 32)));
  const by = top + 150 + lines.length * 52 + 40;
  buttons.forEach((b, i) =>
    c.add(button(s, W / 2, by + i * 110, 440, 88, b.label, b.onClick, { color: b.color, disabled: b.disabled })),
  );
  c.setScale(0.9).setAlpha(0);
  s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'Back.Out' });
  return () => c.destroy();
}

export function fishLabel(s: Phaser.Scene, x: number, y: number, get: () => number) {
  const t = txt(s, x, y, '', 34).setOrigin(1, 0.5);
  const refresh = () => t.setText(`🐟 ${get()}`);
  refresh();
  return { text: t, refresh };
}
