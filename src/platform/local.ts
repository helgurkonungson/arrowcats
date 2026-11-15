import type { IPlatform } from './IPlatform';

export const KEY = 'kittangle.save';

/** Local/dev adapter: localStorage saves, no ads, no purchases. */
export class LocalPlatform implements IPlatform {
  async init() {}
  ready() {}
  onMute(_cb: (muted: boolean) => void) {}
  language() {
    return (navigator.language || 'en').slice(0, 2);
  }
  gameplayStart() {}
  gameplayStop() {}
  // `?ads=mock` fakes ads locally (grey overlay for 1.5 s) to test placements without a portal
  private mockAds = typeof location !== 'undefined' && new URLSearchParams(location.search).get('ads') === 'mock';
  adsReady() {
    return this.mockAds;
  }
  async showInterstitial() {
    if (this.mockAds) await mockAd('Interstitial');
  }
  async showRewarded() {
    return this.mockAds ? mockAd('Rewarded') : false;
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
  shareUrl(params: Record<string, string>) {
    const q = new URLSearchParams({ ...params, utm_source: 'share' });
    return `${location.origin}${location.pathname}?${q}`;
  }
  launchParams() {
    return Object.fromEntries(new URLSearchParams(location.search));
  }
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

/** Full-screen stand-in for a video ad (dev only). */
function mockAd(label: string): Promise<boolean> {
  return new Promise((res) => {
    const d = document.createElement('div');
    d.textContent = `${label} ad (mock)`;
    d.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:#333c;color:#fff;font:24px sans-serif';
    document.body.appendChild(d);
    setTimeout(() => {
      d.remove();
      res(true);
    }, 1500);
  });
}
