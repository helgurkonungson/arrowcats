import Phaser from 'phaser';
import { bakeIcons } from './icons';

const BASE = `${import.meta.env.BASE_URL}art/`;

/** Loads generated art listed in public/art/manifest.json ({ key: "folder/file.png" }); none is fine. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.load.json('art_manifest', BASE + 'manifest.json');
  }

  create() {
    bakeIcons(this);
    const m = (this.cache.json.get('art_manifest') ?? {}) as Record<string, string>;
    const keys = Object.keys(m);
    if (!keys.length) return this.scene.start('Menu');
    for (const k of keys) this.load.image(k, BASE + m[k]);
    this.load.once('complete', () => this.scene.start('Menu'));
    this.load.start();
  }
}

export const has = (s: Phaser.Scene, key: string) => s.textures.exists(key);

/** Image fitted into a box (contain) or covering it; null when the art is not generated yet. */
export function art(s: Phaser.Scene, key: string, x: number, y: number, w: number, h: number, cover = false) {
  if (!has(s, key)) return null;
  const im = s.add.image(x, y, key);
  const k = cover ? Math.max(w / im.width, h / im.height) : Math.min(w / im.width, h / im.height);
  return im.setScale(k);
}

export const HEAD_MOOD: Record<string, string> = { calm: 'calm', happy: 'happy', angry: 'offended', sleep: 'calm' };
export const SPEAKER_ART: Record<string, string> = {
  murr: 'mentor_murr_calm', bun: 'resident_bun_calm', luna: 'resident_luna_calm',
};
