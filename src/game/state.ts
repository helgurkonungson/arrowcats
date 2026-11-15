import { migrate, SaveData } from '../core/save';
import { setLang } from '../i18n';
import type { IPlatform } from '../platform/IPlatform';
import { clearLocalSave, LocalPlatform } from '../platform/local';
import { setMuted } from './sfx';

export const platform: IPlatform = new LocalPlatform();
export let save: SaveData = migrate(null);

export async function initState() {
  await platform.init();
  const q = new URLSearchParams(location.search);
  if (q.has('reset')) clearLocalSave();
  save = migrate(await platform.load());
  // dev helpers: ?level=37 jumps, ?fish=999 adds fish, ?lang=en
  if (q.get('level')) save.level = Math.max(1, Number(q.get('level')) || 1);
  if (q.get('fish')) save.fish = Number(q.get('fish')) || save.fish;
  setLang(q.get('lang') || platform.language());
  setMuted(save.muted);
  if (!save.tips.since) save.tips.since = Date.now();
}

export function persist() {
  void platform.save(save);
}

export function addFish(n: number) {
  save.fish = Math.max(0, save.fish + n);
  persist();
}

export function unlockBreed(b: number): boolean {
  if (save.breeds.includes(b)) return false;
  save.breeds.push(b);
  persist();
  return true;
}
