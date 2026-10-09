import type { AppData, KeyValueStorage } from '@/shared/sync';
import { DEFAULT_SETTINGS } from '@/shared/sync';

// Keys used before accounts/sync existed.
const LEGACY = {
  workouts: 'workout-tracker-v1',
  plans: 'workout-tracker-plans-v1',
  nutrition: 'workout-tracker-nutrition-v1',
  settings: 'workout-tracker-settings-v1',
};
const LEGACY_CLAIMED = 'workout-tracker-legacy-claimed';
const DATA_KEY = /^wt:[^:]+:data$/;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Data saved by the pre-sync version, claimed once by whichever account opens the app first. */
function claimLegacyData(): string | null {
  if (localStorage.getItem(LEGACY_CLAIMED)) return null;
  const data: AppData = {
    workouts: readJson(LEGACY.workouts, []),
    plans: readJson(LEGACY.plans, []),
    nutrition: readJson(LEGACY.nutrition, []),
    settings: { ...DEFAULT_SETTINGS, ...readJson(LEGACY.settings, {}) },
  };
  const empty = !data.workouts.length && !data.plans.length && !data.nutrition.length;
  if (empty) return null;
  localStorage.setItem(LEGACY_CLAIMED, '1');
  return JSON.stringify(data);
}

export const webStorage: KeyValueStorage = {
  async getItem(key) {
    try {
      const value = localStorage.getItem(key);
      if (value === null && DATA_KEY.test(key)) return claimLegacyData();
      return value;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  async removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
