import { Workout } from './types';

const STORAGE_KEY = 'workout-tracker-v1';

export function loadWorkouts(): Workout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Workout[]) : [];
  } catch {
    return [];
  }
}

export function persistWorkouts(workouts: Workout[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  } catch {
    // Storage unavailable
  }
}
