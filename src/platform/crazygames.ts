import { KEY, LocalPlatform } from './local';

/* Minimal typing of the CrazyGames HTML5 SDK v3 (script tag in index.html, see vite.config.ts). */
type AdCallbacks = { adStarted?: () => void; adFinished?: () => void; adError?: (e: { code: string; message: string }) => void };
interface CGSdk {
  init(): Promise<void>;
  environment: 'local' | 'crazygames' | 'disabled';
  ad: { requestAd(type: 'midgame' | 'rewarded', cb: AdCallbacks): void; hasAdblock(): Promise<boolean> };
  data: { getItem(k: string): string | null; setItem(k: string, v: string): void };
  user?: { systemInfo?: { locale?: string } };
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
    inviteLink(p: Record<string, string>): string;
    inviteParams: Record<string, string> | null;
    settings: { muteAudio?: boolean };
    addSettingsChangeListener(cb: (s: { muteAudio?: boolean }) => void): void;
  };
}
const sdk = (): CGSdk | undefined => (window as unknown as { CrazyGames?: { SDK: CGSdk } }).CrazyGames?.SDK;

/**
 * CrazyGames adapter. Saves go to the SDK Data module (cloud for signed-in players, local for guests).
 * Outside CrazyGames (SDK missing or environment "disabled") it behaves like the local adapter.
 * Ads are disabled by the portal during Basic Launch: requests end with adError and the game goes on.
 */
export class CrazyGamesPlatform extends LocalPlatform {
  private on = false;
  private playing = false;
  private loadingDone = false;
  private mute: (m: boolean) => void = () => {};
  private settingsMute = false;
  private adMute = false;
  /** set when the portal says ads are off for this session (Basic Launch, adblock, kids mode, offline) */
  private adsOff = false;

  async init() {
    const s = sdk();
    if (!s) return;
    try {
      await s.init();
      this.on = s.environment !== 'disabled';
    } catch {
      this.on = false;
    }
    if (!this.on) return;
    s.game.loadingStart();
    this.settingsMute = !!s.game.settings?.muteAudio;
    s.game.addSettingsChangeListener((st) => {
      this.settingsMute = !!st.muteAudio;
      this.applyMute();
    });
    this.applyMute();
    void s.ad.hasAdblock().then((b) => b && (this.adsOff = true)).catch(() => undefined);
  }

  /** QA requirement: use the locale from the SDK system info, fall back to the browser / English. */
  language() {
    const loc = this.on ? sdk()?.user?.systemInfo?.locale : undefined;
    return loc ? loc.slice(0, 2).toLowerCase() : super.language();
  }

  adsReady() {
    return this.on && !this.adsOff;
  }

  ready() {
    if (!this.on || this.loadingDone) return;
    this.loadingDone = true;
    sdk()!.game.loadingStop();
  }

  onMute(cb: (muted: boolean) => void) {
    this.mute = cb;
  }

  private applyMute() {
    this.mute(this.settingsMute || this.adMute);
  }

  gameplayStart() {
    if (!this.on || this.playing) return;
    this.playing = true;
    sdk()!.game.gameplayStart();
  }

  gameplayStop() {
    if (!this.on || !this.playing) return;
    this.playing = false;
    sdk()!.game.gameplayStop();
  }

  private ad(type: 'midgame' | 'rewarded'): Promise<boolean> {
    if (!this.on) return Promise.resolve(false);
    return new Promise((resolve) => {
      const end = (ok: boolean) => {
        this.adMute = false;
        this.applyMute();
        resolve(ok);
      };
      try {
        sdk()!.ad.requestAd(type, {
          adStarted: () => {
            this.adMute = true;
            this.applyMute();
          },
          adFinished: () => end(true),
          adError: (e) => {
            if (e?.code === 'adsDisabled' || e?.code === 'adblock') this.adsOff = true;
            end(false);
          },
        });
      } catch {
        end(false);
      }
    });
  }

  async showInterstitial() {
    await this.ad('midgame');
  }

  showRewarded() {
    return this.ad('rewarded');
  }

  async save(data: unknown) {
    if (!this.on) return super.save(data);
    try {
      sdk()!.data.setItem(KEY, JSON.stringify(data));
    } catch {
      /* data module disabled or over 1 MB: keep playing */
    }
  }

  async load() {
    if (!this.on) return super.load();
    try {
      const raw = sdk()!.data.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* fall through */
    }
    return null;
  }

  shareUrl(params: Record<string, string>) {
    if (!this.on) return super.shareUrl(params);
    try {
      return sdk()!.game.inviteLink(params);
    } catch {
      return super.shareUrl(params);
    }
  }

  launchParams() {
    const fromUrl = super.launchParams();
    if (!this.on) return fromUrl;
    return { ...fromUrl, ...(sdk()!.game.inviteParams ?? {}) };
  }
}
