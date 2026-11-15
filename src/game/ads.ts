import { canOfferContinue, interstitialShown, levelDone, newAdState, wantInterstitial } from '../core/ads';
import { t } from '../i18n';
import { platform, save } from './state';
import { toast } from './ui';

/** Session ad state; placements call these helpers, rules live in core/ads.ts. */
const st = newAdState();

export const rewardedReady = () => platform.adsReady();

/** After a won level, before moving on: maybe a midgame ad (never blocks the game on error). */
export async function betweenLevels(levelN: number) {
  levelDone(st);
  if (!wantInterstitial(st, Date.now(), levelN, save.noAds)) return;
  interstitialShown(st, Date.now());
  platform.track('ad_shown', { type: 'interstitial' });
  await platform.showInterstitial();
}

/** Plays a rewarded ad; true = reward the player. Shows a short note when nothing was played. */
export async function rewarded(scene: Phaser.Scene, placement: string): Promise<boolean> {
  platform.track('ad_shown', { type: 'rewarded', placement });
  const ok = await platform.showRewarded();
  st.lastRewarded = Date.now();
  if (ok) platform.track('ad_reward', { placement });
  else toast(scene, t('adFail'));
  return ok;
}

export const continueOffered = () => rewardedReady() && canOfferContinue(st, Date.now());
export const markContinue = () => {
  st.lastContinue = Date.now();
};
