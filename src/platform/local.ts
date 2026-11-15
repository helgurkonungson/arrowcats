import type { IPlatform } from './IPlatform';

const KEY = 'arrowcats.save';

/** Local/dev adapter: localStorage saves, no ads, no purchases. */
export class LocalPlatform implements IPlatform {
  async init() {}
  language() {
    return (navigator.language || 'en').slice(0, 2);
  }
  gameplayStart() {}
  gameplayStop() {}
  async showInterstitial() {}
  async showRewarded() {
    return false;
  }
  setBanner() {}
  async save(data: unknown) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage may be unavailable */
    }
  }
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  async purchase() {
    return false;
  }
  async restorePurchases() {
    return [];
  }
  submitScore() {}
  track(event: string, params?: Record<string, unknown>) {
    if (import.meta.env.DEV) console.debug('[track]', event, params ?? '');
  }
}

export function clearLocalSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
