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

/** Parts a user can pick when adding an exercise ('unclassified' is only for imported data). */
export const SELECTABLE_PARTS = PARTS.filter((p) => p.id !== 'unclassified');

export function partLabel(id: PartId): string {
  return PARTS.find((p) => p.id === id)?.label ?? '未分類';
}

const DEFAULT_PREFIX = 'default:';

/** Built-in exercises. They live in code, so they are never stored or synced. */
export const DEFAULT_EXERCISES: ExerciseMaster[] = (
  [
    ['chest', 'bench-press', 'ベンチプレス'],
    ['chest', 'dumbbell-press', 'ダンベルプレス'],
    ['chest', 'dumbbell-fly', 'ダンベルフライ'],
    ['chest', 'dips', 'ディップス'],
    ['chest', 'push-up', '腕立て伏せ'],
    ['back', 'deadlift', 'デッドリフト'],
    ['back', 'lat-pulldown', 'ラットプルダウン'],
    ['back', 'pull-up', '懸垂'],
    ['back', 'bent-over-row', 'ベントオーバーロウ'],
    ['back', 'seated-row', 'シーテッドロウ'],
    ['shoulder', 'shoulder-press', 'ショルダープレス'],
    ['shoulder', 'side-raise', 'サイドレイズ'],
    ['shoulder', 'front-raise', 'フロントレイズ'],
    ['shoulder', 'rear-raise', 'リアレイズ'],
    ['shoulder', 'upright-row', 'アップライトロウ'],
    ['arm', 'barbell-curl', 'バーベルカール'],
    ['arm', 'dumbbell-curl', 'ダンベルカール'],
    ['arm', 'hammer-curl', 'ハンマーカール'],
    ['arm', 'triceps-extension', 'トライセプスエクステンション'],
    ['arm', 'cable-pushdown', 'ケーブルプッシュダウン'],
    ['abs', 'crunch', 'クランチ'],
    ['abs', 'leg-raise', 'レッグレイズ'],
    ['abs', 'plank', 'プランク'],
    ['abs', 'ab-roller', 'アブローラー'],
    ['leg', 'squat', 'スクワット'],
    ['leg', 'leg-press', 'レッグプレス'],
    ['leg', 'leg-extension', 'レッグエクステンション'],
    ['leg', 'leg-curl', 'レッグカール'],
    ['leg', 'lunge', 'ランジ'],
    ['leg', 'calf-raise', 'カーフレイズ'],
  ] as [PartId, string, string][]
).map(([part, slug, name]) => ({ id: DEFAULT_PREFIX + slug, name, part }));

export function isDefaultExercise(id: string): boolean {
  return id.startsWith(DEFAULT_PREFIX);
}

/** Defaults followed by the user's own entries (an entry reusing a default id is ignored). */
export function allExercises(user: ExerciseMaster[]): ExerciseMaster[] {
  return [...DEFAULT_EXERCISES, ...user.filter((u) => !isDefaultExercise(u.id))];
}

const norm = (name: string) => name.trim().toLowerCase();

/** Id derived from the name, so two devices importing the same name produce the same entry. */
function customId(name: string, taken: Set<string>): string {
  const base = `custom:${name.trim()}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}#${n}`;
  return id;
}

/** Existing entry with the same name (ignoring case/spaces), or a new one. Never mutates `user`. */
export function findOrCreateExercise(
  user: ExerciseMaster[],
  name: string,
  part: PartId
): { master: ExerciseMaster; created: boolean } {
  const all = allExercises(user);
  const found = all.find((m) => norm(m.name) === norm(name));
  if (found) return { master: found, created: false };
  const master = { id: customId(name, new Set(all.map((m) => m.id))), name: name.trim(), part };
  return { master, created: true };
}

/** Exercise ids referenced by any workout or plan. Used entries cannot be deleted. */
export function usedExerciseIds(workouts: Workout[], plans: TrainingPlan[]): Set<string> {
  const ids = new Set<string>();
  workouts.forEach((w) => w.exercises.forEach((e) => e.exerciseId && ids.add(e.exerciseId)));
  plans.forEach((p) => p.days.forEach((d) => d.exercises.forEach((e) => e.exerciseId && ids.add(e.exerciseId))));
  return ids;
}

/** Name to show for a record: the master's current name, else the name saved with the record. */
export function exerciseName(ref: { exerciseId?: string; name: string }, masters: ExerciseMaster[]): string {
  return masters.find((m) => m.id === ref.exerciseId)?.name ?? ref.name;
}

/**
 * One-time import of old free-text records: every exercise without an exerciseId is linked to the
 * master entry with the same name, creating a user entry (part: unclassified) when none exists.
 * Safe to run repeatedly. Returns null when nothing needed to change.
 */
export function linkExercises(
  workouts: Workout[],
  plans: TrainingPlan[],
  user: ExerciseMaster[]
): { workouts: Workout[]; plans: TrainingPlan[]; exercises: ExerciseMaster[] } | null {
  let masters = user;
  let changed = false;

  const link = <T extends { exerciseId?: string; name: string }>(e: T): T => {
    const name = e.name.trim();
    if (e.exerciseId || !name) return e;
    const { master, created } = findOrCreateExercise(masters, name, 'unclassified');
    if (created) masters = [...masters, master];
    changed = true;
    return { ...e, exerciseId: master.id, name: master.name };
  };

  const newWorkouts = workouts.map((w) => {
    const exercises = w.exercises.map(link);
    return exercises.some((e, i) => e !== w.exercises[i]) ? { ...w, exercises } : w;
  });
  const newPlans = plans.map((p) => {
    const days = p.days.map((d) => {
      const exercises = d.exercises.map(link);
      return exercises.some((e, i) => e !== d.exercises[i]) ? { ...d, exercises } : d;
    });
    return days.some((d, i) => d !== p.days[i]) ? { ...p, days } : p;
  });

  return changed ? { workouts: newWorkouts, plans: newPlans, exercises: masters } : null;
}
