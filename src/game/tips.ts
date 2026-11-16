import Phaser from 'phaser';
import { TipKey } from '../core/tutorial';
import { t } from '../i18n';
import { persist, save } from './state';
import { C, modal } from './ui';

/** Shows the explanation cards one after another (each once per save), then calls done. */
export function showTips(s: Phaser.Scene, keys: TipKey[], done: () => void = () => {}) {
  const next = (i: number) => {
    const k = keys[i];
    if (!k) return done();
    if (!save.tipsSeen.includes(k)) {
      save.tipsSeen.push(k);
      persist();
    }
    const close = modal(s, t(`tip_${k}_t`), [t(`tip_${k}`)], [
      { label: t('gotIt'), color: C.green, onClick: () => { close(); next(i + 1); } },
    ]);
  };
  next(0);
}

/** One card if not seen yet; returns true when it was shown. */
export function tipOnce(s: Phaser.Scene, key: TipKey, done?: () => void) {
  if (save.tipsSeen.includes(key)) return false;
  showTips(s, [key], done);
  return true;
}
