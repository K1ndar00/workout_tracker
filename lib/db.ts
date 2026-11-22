import { supabase } from './supabase';
import type { Exercise, ExerciseMaster, PartId, PlanDay, PlanExercise, TrainingPlan, Workout, WorkoutSet } from './types';

/** All database access lives here. Components never talk to Supabase directly. */

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

// ---------------------------------------------------------------------------
// Exercise master
// ---------------------------------------------------------------------------

interface ExerciseRow {
  id: string;
  user_id: string | null;
  name: string;
  part: PartId;
}

const toMaster = (r: ExerciseRow): ExerciseMaster => ({ id: r.id, name: r.name, part: r.part, builtIn: r.user_id === null });

export async function fetchExercises(): Promise<ExerciseMaster[]> {
  const { data, error } = await client().from('exercises').select('id, user_id, name, part').order('name');
  if (error) throw error;
  return (data as ExerciseRow[]).map(toMaster);
}

export async function insertExercise(name: string, part: PartId): Promise<ExerciseMaster> {
  const { data, error } = await client().from('exercises').insert({ name: name.trim(), part }).select('id, user_id, name, part').single();
  if (error) throw error;
  return toMaster(data as ExerciseRow);
}

export async function updateExercise(m: ExerciseMaster): Promise<void> {
  const { error } = await client().from('exercises').update({ name: m.name.trim(), part: m.part }).eq('id', m.id);
  if (error) throw error;
}

/** Fails (Postgres error 23503) when a workout or plan still uses the exercise. */
export async function deleteExercise(id: string): Promise<void> {
  const { error } = await client().from('exercises').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

interface WorkoutRow {
  id: string;
  title: string;
  date: string;
  emoji: string;
  notes: string;
  created_at: string;
  workout_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    workout_sets: (WorkoutSet & { position: number })[];
  }[];
}

const WORKOUT_SELECT =
  'id, title, date, emoji, notes, created_at, workout_exercises(id, exercise_id, position, workout_sets(id, position, weight, reps, unit, completed))';

export async function fetchWorkouts(): Promise<Workout[]> {
  const { data, error } = await client()
    .from('workouts')
    .select(WORKOUT_SELECT)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as WorkoutRow[]).map((w) => ({
    id: w.id,
    title: w.title,
    date: w.date,
    emoji: w.emoji,
    notes: w.notes,
    createdAt: w.created_at,
    exercises: [...w.workout_exercises].sort(byPosition).map(
      (e): Exercise => ({
        id: e.id,
        exerciseId: e.exercise_id,
        sets: [...e.workout_sets].sort(byPosition).map(({ id, weight, reps, unit, completed }) => ({ id, weight: Number(weight), reps, unit, completed })),
      })
    ),
  }));
}

/** Saves the whole workout (with exercises and sets) in one transaction. Rows not in `w` are deleted. */
export async function saveWorkout(w: Workout): Promise<void> {
  const payload = {
    id: w.id,
    title: w.title,
    date: w.date,
    emoji: w.emoji,
    notes: w.notes,
    // A row whose exercise is not chosen yet is not saved.
    exercises: w.exercises.filter((e) => e.exerciseId).map((e) => ({ id: e.id, exerciseId: e.exerciseId, sets: e.sets })),
  };
  const { error } = await client().rpc('save_workout', { p: payload });
  if (error) throw error;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await client().from('workouts').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

interface PlanRow {
  id: string;
  name: string;
  emoji: string;
  description: string;
  frequency: number;
  is_active: boolean;
  created_at: string;
  plan_days: {
    id: string;
    label: string;
    position: number;
    plan_exercises: { id: string; exercise_id: string; position: number; sets: number; reps: string; weight: number | null }[];
  }[];
}

const PLAN_SELECT =
  'id, name, emoji, description, frequency, is_active, created_at, plan_days(id, label, position, plan_exercises(id, exercise_id, position, sets, reps, weight))';

export async function fetchPlans(): Promise<TrainingPlan[]> {
  const { data, error } = await client().from('plans').select(PLAN_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as PlanRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    description: p.description,
    frequency: p.frequency,
    isActive: p.is_active,
    createdAt: p.created_at,
    days: [...p.plan_days].sort(byPosition).map(
      (d): PlanDay => ({
        id: d.id,
        label: d.label,
        exercises: [...d.plan_exercises].sort(byPosition).map(
          (e): PlanExercise => ({
            id: e.id,
            exerciseId: e.exercise_id,
            sets: e.sets,
            reps: e.reps,
            ...(e.weight !== null ? { weight: Number(e.weight) } : {}),
          })
        ),
      })
    ),
  }));
}

export async function savePlan(p: TrainingPlan): Promise<void> {
  const payload = {
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    description: p.description,
    frequency: p.frequency,
    isActive: p.isActive,
    days: p.days.map((d) => ({
      id: d.id,
      label: d.label,
      exercises: d.exercises.filter((e) => e.exerciseId),
    })),
  };
  const { error } = await client().rpc('save_plan', { p: payload });
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await client().from('plans').delete().eq('id', id);
  if (error) throw error;
}
