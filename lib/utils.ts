import {
  Exercise,
  PlanDay,
  PlanExercise,
  TrainingPlan,
  Workout,
  WorkoutSet,
} from './types';

/** crypto.randomUUID is missing in some React Native runtimes, so fall back to a v4-shaped id. */
export function uid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createSet(template?: Partial<WorkoutSet>): WorkoutSet {
  return { id: uid(), reps: 0, weight: 0, unit: 'kg', completed: false, ...template };
}

export function createExercise(): Exercise {
  return { id: uid(), sets: [createSet()] };
}

export function createWorkout(): Workout {
  return {
    id: uid(),
    title: '新しいワークアウト',
    date: today(),
    emoji: '🏋️',
    exercises: [],
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

export function createPlanExercise(): PlanExercise {
  return { id: uid(), sets: 3, reps: '10' };
}

export function createPlanDay(index: number): PlanDay {
  return { id: uid(), label: `Day ${index}`, exercises: [] };
}

export function createPlan(): TrainingPlan {
  return {
    id: uid(),
    name: '新しいプラン',
    emoji: '🗓️',
    description: '',
    frequency: 3,
    days: [createPlanDay(1), createPlanDay(2), createPlanDay(3)],
    isActive: false,
    createdAt: new Date().toISOString(),
  };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(date);
}

export function formatMonthKey(key: string): string {
  const parts = key.split('-');
  const date = new Date(parseInt(parts[0] ?? '2024'), parseInt(parts[1] ?? '1') - 1, 1);
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' }).format(date);
}

/** YYYY-MM-DD in the local time zone (toISOString would give the UTC date, which is "yesterday" in Japan until 9:00). */
export function toDateString(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function today(): string {
  return toDateString(new Date());
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

export function formatDayLabel(dateStr: string): string {
  if (isToday(dateStr)) return '今日';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}
