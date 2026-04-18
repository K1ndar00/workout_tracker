import {
  DailyNutrition,
  Exercise,
  FoodItem,
  NutritionMeal,
  PlanDay,
  PlanExercise,
  TrainingPlan,
  Workout,
  WorkoutSet,
} from './types';

export function createSet(template?: Partial<WorkoutSet>): WorkoutSet {
  return { id: crypto.randomUUID(), reps: 0, weight: 0, unit: 'kg', completed: false, ...template };
}

export function createExercise(): Exercise {
  return { id: crypto.randomUUID(), name: '', sets: [createSet()] };
}

export function createWorkout(): Workout {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    title: '新しいワークアウト',
    date: today,
    emoji: '🏋️',
    exercises: [],
    notes: '',
    createdAt: new Date().toISOString(),
  };
}

export function createPlanExercise(): PlanExercise {
  return { id: crypto.randomUUID(), name: '', sets: 3, reps: '10' };
}

export function createPlanDay(index: number): PlanDay {
  return { id: crypto.randomUUID(), label: `Day ${index}`, exercises: [] };
}

export function createPlan(): TrainingPlan {
  return {
    id: crypto.randomUUID(),
    name: '新しいプラン',
    emoji: '🗓️',
    description: '',
    frequency: 3,
    days: [createPlanDay(1), createPlanDay(2), createPlanDay(3)],
    isActive: false,
    createdAt: new Date().toISOString(),
  };
}

export function createFoodItem(): FoodItem {
  return { id: crypto.randomUUID(), name: '', amount: '', calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function createMeal(name: string): NutritionMeal {
  return { id: crypto.randomUUID(), name, foods: [] };
}

export function createNutritionDay(date: string): DailyNutrition {
  return {
    id: crypto.randomUUID(),
    date,
    meals: [createMeal('朝食'), createMeal('昼食'), createMeal('夕食')],
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

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

export function formatDayLabel(dateStr: string): string {
  if (isToday(dateStr)) return '今日';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}
