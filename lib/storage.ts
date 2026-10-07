import { DailyNutrition, NutritionSettings, TrainingPlan, Workout } from './types';

function loadArr<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function loadObj<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

const K = {
  workouts: 'workout-tracker-v1',
  plans: 'workout-tracker-plans-v1',
  nutrition: 'workout-tracker-nutrition-v1',
  settings: 'workout-tracker-settings-v1',
};

export const loadWorkouts = (): Workout[] => loadArr<Workout>(K.workouts);
export const persistWorkouts = (d: Workout[]) => persist(K.workouts, d);

export const loadPlans = (): TrainingPlan[] => loadArr<TrainingPlan>(K.plans);
export const persistPlans = (d: TrainingPlan[]) => persist(K.plans, d);

export const loadNutrition = (): DailyNutrition[] => loadArr<DailyNutrition>(K.nutrition);
export const persistNutrition = (d: DailyNutrition[]) => persist(K.nutrition, d);

export const DEFAULT_SETTINGS: NutritionSettings = {
  targetCalories: 2000,
  targetProtein: 150,
  targetCarbs: 250,
  targetFat: 65,
};
export const loadSettings = (): NutritionSettings =>
  loadObj<NutritionSettings>(K.settings, DEFAULT_SETTINGS);
export const persistSettings = (d: NutritionSettings) => persist(K.settings, d);
