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
