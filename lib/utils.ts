import { Exercise, Workout, WorkoutSet } from './types';

export function createSet(template?: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: crypto.randomUUID(),
    reps: 0,
    weight: 0,
    unit: 'kg',
    completed: false,
    ...template,
  };
}

export function createExercise(): Exercise {
  return {
    id: crypto.randomUUID(),
    name: '',
    sets: [createSet()],
  };
}

export function createWorkout(): Workout {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: crypto.randomUUID(),
    title: '新しいワークアウト',
    date: today ?? new Date().toISOString().slice(0, 10),
    emoji: '🏋️',
    exercises: [],
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatMonthKey(key: string): string {
  const parts = key.split('-');
  const year = parseInt(parts[0] ?? '2024');
  const month = parseInt(parts[1] ?? '1') - 1;
  const date = new Date(year, month, 1);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}
