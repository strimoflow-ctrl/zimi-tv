// ====================================================
// ADSGRAM TELEGRAM MINI APP REWARDED AD INTEGRATION
// Block ID: 52491
// Documentation: https://adsgram.ai
// ====================================================

const ADSGRAM_BLOCK_ID = "52491";

let adController = null;

/**
 * Lazy loads or returns existing Adsgram controller instance
 */
function getAdController() {
  if (typeof window !== 'undefined' && window.Adsgram) {
    if (!adController) {
      try {
        adController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
        console.log(`[Adsgram] Controller initialized for Block ID: ${ADSGRAM_BLOCK_ID}`);
      } catch (err) {
        console.warn('[Adsgram] Initialization error:', err);
      }
    }
    return adController;
  }
  return null;
}

/**
 * Triggers rewarded ad via Adsgram with graceful fallback
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function showRewardedAd() {
  // 1. Trigger haptic feedback if inside Telegram
  try {
    if (window.Telegram?.WebApp?.HapticFeedback?.impactOccurred) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  } catch (e) {}

  // 2. Ensure Adsgram SDK is available
  let controller = getAdController();

  if (!controller && typeof window !== 'undefined') {
    // If not ready yet, wait up to 1 second
    let attempts = 0;
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        attempts++;
        if (window.Adsgram || attempts > 10) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    controller = getAdController();
  }

  // 3. Show Adsgram Rewarded Ad
  if (controller) {
    return new Promise((resolve) => {
      console.log(`[Adsgram] Showing Rewarded Video Ad (Block: ${ADSGRAM_BLOCK_ID})...`);
      controller.show()
        .then((result) => {
          console.log('🎉 [Adsgram] Ad completed successfully!', result);
          try {
            if (window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
          } catch (e) {}
          resolve({ success: true, provider: 'adsgram' });
        })
        .catch((err) => {
          console.warn('[Adsgram] Ad skipped, closed or failed:', err);
          try {
            if (window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
            }
          } catch (e) {}

          const msg = (err && (err.description || err.message)) 
            || 'Ad was closed early. Please watch the full ad to earn watch time.';
          resolve({ success: false, error: msg, provider: 'adsgram' });
        });
    });
  }

  // 4. Fallback if Adsgram SDK was blocked
  console.warn('[Adsgram] SDK not detected on window, checking fallback...');
  if (typeof window !== 'undefined' && typeof window.show_11964194 === 'function') {
    try {
      await window.show_11964194();
      return { success: true, provider: 'fallback' };
    } catch (e) {
      return { success: false, error: 'Ad closed early.', provider: 'fallback' };
    }
  }

  return {
    success: false,
    error: '⚠️ Ad network unavailable. Please disable Ad-Blockers or VPN and retry.'
  };
}

module.exports = {
  showRewardedAd,
  ADSGRAM_BLOCK_ID
};
