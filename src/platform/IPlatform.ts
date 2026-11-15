import type { SaveData } from '../core/save';

/** The only way game code talks to a portal or store. Ads/IAP are stubs in the prototype. */
export interface IPlatform {
  init(): Promise<void>;
  /** first screen is shown (portals measure loading time) */
  ready(): void;
  /** platform asks to mute/unmute all game audio (ads, portal setting); called by the adapter */
  onMute(cb: (muted: boolean) => void): void;
  language(): string;
  gameplayStart(): void;
  gameplayStop(): void;
  showInterstitial(): Promise<void>;
  showRewarded(): Promise<boolean>;
  setBanner(visible: boolean): void;
  save(data: SaveData): Promise<void>;
  load(): Promise<unknown>;
  purchase(sku: string): Promise<boolean>;
  restorePurchases(): Promise<string[]>;
  track(event: string, params?: Record<string, unknown>): void;
  /** leaderboards where the platform supports them (no-op otherwise) */
  submitScore(board: string, value: number): void;
  /** link to the game carrying params (portals give their own invite links) */
  shareUrl(params: Record<string, string>): string;
  /** params the game was opened with (from the link or the portal SDK) */
  launchParams(): Record<string, string>;
}
