const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from process or .env files
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAppNCKOa8etecb8OaLPkkbgGgO-1ntNWY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "zimitv-62421.firebaseapp.com",
  databaseURL: (process.env.FIREBASE_DATABASE_URL || "https://zimitv-62421-default-rtdb.firebaseio.com").replace(/\/$/, ''),
  projectId: process.env.FIREBASE_PROJECT_ID || "zimitv-62421",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "zimitv-62421.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1014899153633",
  appId: process.env.FIREBASE_APP_ID || "1:1014899153633:web:c6120981057e17cc86f5a0"
};

const DB_URL = (process.env.FIREBASE_DATABASE_URL || firebaseConfig.databaseURL).replace(/\/$/, '');
console.log(`[Firebase] Configured Database URL: ${DB_URL}`);

// Default fallback settings if none in DB
const DEFAULT_BOT_SETTINGS = {
  welcomeText: "Welcome to Zimi TV! 💦\n\nEnjoy streaming your favorite premium videos directly inside Telegram.\n\nClick the button below to start watching!",
  lockMessage: "To access Zimi TV and stream all premium uncut videos, you must join all official Telegram channels below:",
  channels: [
    { name: "📢 Join New Hot Content 🔥", url: "https://t.me/newhotcontent2026", username: "@newhotcontent2026" },
    { name: "📢 Join Hot Videooo 💦", url: "https://t.me/hotvideooo2026", username: "@hotvideooo2026" },
    { name: "📢 Join Hot Videoo 🍿", url: "https://t.me/hotvideoo2026", username: "@hotvideoo2026" },
    { name: "📢 Join Seema Hot 💎", url: "https://t.me/seemahotveet", username: "@seemahotveet" }
  ],
  postChannels: [
    "@newhotcontent2026",
    "@hotvideooo2026",
    "@hotvideoo2026",
    "@seemahotveet"
  ],
  supportUrl: "https://t.me/newhotcontent2026",
  channelLockEnabled: true
};

let cachedSettings = null;
let lastSettingsFetch = 0;
const SETTINGS_CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Fetch bot settings from Firebase Realtime Database
 */
async function getBotSettings() {
  const now = Date.now();
  if (cachedSettings && (now - lastSettingsFetch < SETTINGS_CACHE_TTL)) {
    return cachedSettings;
  }

  try {
    const res = await axios.get(`${DB_URL}/bot_settings.json`, { timeout: 6000 });
    if (res.data) {
      cachedSettings = { ...DEFAULT_BOT_SETTINGS, ...res.data };
      lastSettingsFetch = now;
      return cachedSettings;
    } else {
      // Initialize defaults in Firebase
      await axios.put(`${DB_URL}/bot_settings.json`, DEFAULT_BOT_SETTINGS, { timeout: 6000 });
      cachedSettings = DEFAULT_BOT_SETTINGS;
      lastSettingsFetch = now;
      return cachedSettings;
    }
  } catch (err) {
    console.warn('[Firebase DB] Could not fetch bot settings, using defaults:', err.message);
    return cachedSettings || DEFAULT_BOT_SETTINGS;
  }
}

/**
 * Update bot settings in Firebase
 */
async function updateBotSettings(settings) {
  try {
    const updated = { ...(cachedSettings || DEFAULT_BOT_SETTINGS), ...settings };
    await axios.put(`${DB_URL}/bot_settings.json`, updated, { timeout: 6000 });
    cachedSettings = updated;
    lastSettingsFetch = Date.now();
    return { success: true, settings: updated };
  } catch (err) {
    console.error('[Firebase DB] Update settings error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Save or update user in Firebase
 */
async function saveOrUpdateUser(user) {
  if (!user || !user.id) return null;
  const userId = String(user.id);
  const now = Date.now();

  try {
    // Check existing
    let existing = null;
    try {
      const getRes = await axios.get(`${DB_URL}/users/${userId}.json`, { timeout: 5000 });
      existing = getRes.data;
    } catch (e) {}

    const payload = {
      id: userId,
      first_name: user.first_name !== undefined ? user.first_name : (existing?.first_name || ''),
      last_name: user.last_name !== undefined ? user.last_name : (existing?.last_name || ''),
      username: user.username !== undefined ? user.username : (existing?.username || ''),
      photo_url: user.photo_url !== undefined ? user.photo_url : (existing?.photo_url || ''),
      isBlocked: typeof user.isBlocked === 'boolean' ? user.isBlocked : Boolean(existing?.isBlocked),
      joinedAt: existing?.joinedAt || now,
      lastActive: now,
      // Default 180s (3 minutes) free watch time gift for new users
      watchTimeSeconds: existing?.watchTimeSeconds !== undefined ? existing.watchTimeSeconds : 180,
      savedVideos: existing?.savedVideos || [],
      adPacksProgress: existing?.adPacksProgress || {}
    };

    await axios.put(`${DB_URL}/users/${userId}.json`, payload, { timeout: 5000 });
    return payload;
  } catch (err) {
    console.warn(`[Firebase DB] Error saving user ${userId}:`, err.message);
    return null;
  }
}

/**
 * Get User Data from Firebase
 */
async function getUserData(userId) {
  try {
    const res = await axios.get(`${DB_URL}/users/${userId}.json`, { timeout: 5000 });
    return res.data || null;
  } catch (e) {
    return null;
  }
}

/**
 * Update User Watch Time (add/subtract delta seconds)
 */
async function updateUserWatchTime(userId, deltaSeconds) {
  try {
    const uData = await getUserData(userId);
    let current = uData?.watchTimeSeconds !== undefined ? uData.watchTimeSeconds : 180;
    let newTime = Math.max(0, current + Number(deltaSeconds));
    await axios.patch(`${DB_URL}/users/${userId}.json`, { watchTimeSeconds: newTime, lastActive: Date.now() }, { timeout: 5000 });
    return newTime;
  } catch (e) {
    console.warn(`[Firebase DB] Error updating watch time for ${userId}:`, e.message);
    return null;
  }
}

/**
 * Save / Update User Saved Videos in Firebase
 */
async function updateUserSavedVideos(userId, savedVideos) {
  try {
    const validList = Array.isArray(savedVideos) ? savedVideos : [];
    await axios.patch(`${DB_URL}/users/${userId}.json`, { savedVideos: validList, lastActive: Date.now() }, { timeout: 5000 });
    return validList;
  } catch (e) {
    console.warn(`[Firebase DB] Error saving videos for ${userId}:`, e.message);
    return [];
  }
}

/**
 * Update Ad Pack Progress & Add Bonus Time
 */
async function updateAdPackProgress(userId, packId, increment = 1, targetCount = 5, rewardSeconds = 300) {
  try {
    const uData = await getUserData(userId);
    const progress = uData?.adPacksProgress || {};
    let currentCount = (progress[packId] || 0) + increment;
    let watchTime = uData?.watchTimeSeconds !== undefined ? uData.watchTimeSeconds : 180;
    let claimed = false;

    if (currentCount >= targetCount) {
      currentCount = 0; // Reset after claiming reward
      watchTime += rewardSeconds;
      claimed = true;
    }

    progress[packId] = currentCount;

    await axios.patch(`${DB_URL}/users/${userId}.json`, {
      adPacksProgress: progress,
      watchTimeSeconds: watchTime,
      lastActive: Date.now()
    }, { timeout: 5000 });

    return {
      progress: currentCount,
      target: targetCount,
      watchTimeSeconds: watchTime,
      claimed
    };
  } catch (e) {
    console.warn(`[Firebase DB] Error updating ad pack for ${userId}:`, e.message);
    return null;
  }
}

/**
 * Check if a user is blocked
 */
async function isUserBlocked(userId) {
  try {
    const res = await axios.get(`${DB_URL}/users/${userId}/isBlocked.json`, { timeout: 5000 });
    return Boolean(res.data);
  } catch (e) {
    return false;
  }
}

/**
 * Helper to generate Firebase-safe key from URL
 */
function getVideoKey(url) {
  return Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
}

/**
 * Check if a video was already posted to the channel
 */
async function isVideoAlreadyPosted(url) {
  try {
    const key = getVideoKey(url);
    const res = await axios.get(`${DB_URL}/posted_videos/${key}.json`, { timeout: 5000 });
    return Boolean(res.data);
  } catch (e) {
    return false;
  }
}

/**
 * Mark a video as posted in Firebase (records timestamp & channel)
 */
async function markVideoPosted(video, channelId = '') {
  try {
    const key = getVideoKey(video.url);
    await axios.put(`${DB_URL}/posted_videos/${key}.json`, {
      title: video.title || '',
      url: video.url,
      channel: channelId || '',
      postedAt: Date.now()
    }, { timeout: 5000 });
    return true;
  } catch (e) {
    console.warn('[Firebase DB] Could not mark video as posted:', e.message);
    return false;
  }
}

module.exports = {
  firebaseConfig,
  DB_URL,
  getBotSettings,
  updateBotSettings,
  saveOrUpdateUser,
  isUserBlocked,
  getUserData,
  updateUserWatchTime,
  updateUserSavedVideos,
  updateAdPackProgress,
  isVideoAlreadyPosted,
  markVideoPosted
};

