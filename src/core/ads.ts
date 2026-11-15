/**
 * Ad placement rules (GDD §monetization, portal policies). Pure logic, session state only.
 * Interstitial: never before level 6, at least 3 levels and 90 s apart, never right after a rewarded ad.
 * Rewarded "continue" after losing: at most once per 3 minutes (portals forbid offering it on every death).
 */
export const AD_RULES = { minLevel: 6, levelsGap: 3, gapMs: 90_000, afterRewardedMs: 90_000, continueGapMs: 180_000 };

export interface AdState {
  levelsSince: number;
  lastInterstitial: number;
  lastRewarded: number;
  lastContinue: number;
}

export const newAdState = (): AdState => ({
  levelsSince: 0,
  lastInterstitial: Number.NEGATIVE_INFINITY,
  lastRewarded: Number.NEGATIVE_INFINITY,
  lastContinue: Number.NEGATIVE_INFINITY,
});

/** Called on every completed level (number of the level just finished). */
export function levelDone(s: AdState) {
  s.levelsSince++;
}

export function wantInterstitial(s: AdState, now: number, levelN: number, noAds: boolean): boolean {
  return (
    !noAds &&
    levelN >= AD_RULES.minLevel &&
    s.levelsSince >= AD_RULES.levelsGap &&
    now - s.lastInterstitial >= AD_RULES.gapMs &&
    now - s.lastRewarded >= AD_RULES.afterRewardedMs
  );
}

export function interstitialShown(s: AdState, now: number) {
  s.lastInterstitial = now;
  s.levelsSince = 0;
}

export const canOfferContinue = (s: AdState, now: number) => now - s.lastContinue >= AD_RULES.continueGapMs;
