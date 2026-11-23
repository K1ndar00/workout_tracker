import type { ExerciseMaster, PartId, TrainingPlan, Workout } from './types';

export const PARTS: { id: PartId; label: string }[] = [
  { id: 'shoulder', label: '肩' },
  { id: 'chest', label: '胸' },
  { id: 'arm', label: '腕' },
  { id: 'abs', label: '腹筋' },
  { id: 'back', label: '背筋' },
  { id: 'leg', label: '脚' },
  { id: 'unclassified', label: '未分類' },
];

/** Parts a user can pick when adding an exercise ('unclassified' is only for migrated data). */
export const SELECTABLE_PARTS = PARTS.filter((p) => p.id !== 'unclassified');

export function partLabel(id: PartId): string {
  return PARTS.find((p) => p.id === id)?.label ?? '未分類';
}

/** Exercise ids referenced by any workout or plan (the database refuses to delete these). */
export function usedExerciseIds(workouts: Workout[], plans: TrainingPlan[]): Set<string> {
  const ids = new Set<string>();
  workouts.forEach((w) => w.exercises.forEach((e) => e.exerciseId && ids.add(e.exerciseId)));
  plans.forEach((p) => p.days.forEach((d) => d.exercises.forEach((e) => e.exerciseId && ids.add(e.exerciseId))));
  return ids;
}

/** Existing entry with the same name (ignoring case and surrounding spaces). */
export function findByName(masters: ExerciseMaster[], name: string): ExerciseMaster | undefined {
  const n = name.trim().toLowerCase();
  return masters.find((m) => m.name.trim().toLowerCase() === n);
}
