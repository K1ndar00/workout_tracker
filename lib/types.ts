export type AppView = 'workouts' | 'plans' | 'exercises' | 'progress';

/** Body part of an exercise. 'unclassified' holds exercises imported from old free-text records. */
export type PartId = 'shoulder' | 'chest' | 'arm' | 'abs' | 'back' | 'leg' | 'unclassified';

/** Exercise master entry. Built-in ones (builtIn) are shared by everyone and read-only. */
export interface ExerciseMaster {
  id: string;
  name: string;
  part: PartId;
  builtIn: boolean;
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
  completed: boolean;
}

export interface Exercise {
  id: string;
  /** Reference to ExerciseMaster. Missing only for a freshly added row that is not chosen yet (not saved). */
  exerciseId?: string;
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
  exerciseId?: string;
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
