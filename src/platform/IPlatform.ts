import type { SaveData } from '../core/save';

/** The only way game code talks to a portal or store. Ads/IAP are stubs in the prototype. */
export interface IPlatform {
  init(): Promise<void>;
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
}
