export type AppView = 'workouts' | 'plans' | 'nutrition' | 'progress';

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  title: string;
  date: string;
  emoji: string;
  exercises: Exercise[];
  notes: string;
  createdAt: string;
}

// Training Plans
export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: number;
}

export interface PlanDay {
  id: string;
  label: string;
  exercises: PlanExercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  emoji: string;
  description: string;
  frequency: number;
  days: PlanDay[];
  isActive: boolean;
  createdAt: string;
}

// Nutrition
export interface FoodItem {
  id: string;
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionMeal {
  id: string;
  name: string;
  foods: FoodItem[];
}

export interface DailyNutrition {
  id: string;
  date: string;
  meals: NutritionMeal[];
}

export interface NutritionSettings {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}
