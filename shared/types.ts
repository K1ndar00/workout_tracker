export type AppView = 'workouts' | 'plans' | 'progress';

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
