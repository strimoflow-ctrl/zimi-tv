// Forwarding ad requests to Adsgram (Block ID: 52491)
import { showRewardedAd as showAdsgramRewardedAd } from './adsgram';

export async function showRewardedAd() {
  return await showAdsgramRewardedAd();
}

export default {
  showRewardedAd
};
