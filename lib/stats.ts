import type { ExerciseMaster, Workout } from './types';
import { toDateString } from './utils';

function weekLabel(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(date);
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Numbers behind the progress screen. (To be redesigned around body parts / exercises.) */
export function computeProgress(workouts: Workout[], masters: ExerciseMaster[]) {
  const nameOf = new Map(masters.map((m) => [m.id, m.name]));
  const exName = (e: { exerciseId?: string }) => (e.exerciseId && nameOf.get(e.exerciseId)) || '';
  // Weekly workout counts (last 8 weeks)
  const now = new Date();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const monday = getMondayOf(now);
    monday.setDate(monday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday, label: weekLabel(monday) };
  }).reverse();

  const weekCounts = weeks.map((w) => ({
    label: w.label,
    count: workouts.filter((wo) => {
      const d = new Date(wo.date + 'T00:00:00');
      return d >= w.monday && d <= w.sunday;
    }).length,
  }));

  const thisWeekMonday = getMondayOf(now);
  const thisWeekCount = workouts.filter((wo) => new Date(wo.date + 'T00:00:00') >= thisWeekMonday).length;

  const thisMonth = toDateString(now).slice(0, 7);
  const thisMonthCount = workouts.filter((w) => w.date.startsWith(thisMonth)).length;

  const exerciseCount = new Set(workouts.flatMap((w) => w.exercises.map(exName)).filter(Boolean)).size;

  // Exercise PRs
  const prMap = new Map<string, number>();
  for (const wo of workouts) {
    for (const ex of wo.exercises) {
      const name = exName(ex);
      if (!name) continue;
      const maxWeight = Math.max(...ex.sets.map((s) => s.weight));
      if (maxWeight > 0) {
        const prev = prMap.get(name) ?? 0;
        if (maxWeight > prev) prMap.set(name, maxWeight);
      }
    }
  }
  const prs = Array.from(prMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxWeekCount = Math.max(...weekCounts.map((w) => w.count), 1);

  return { weekCounts, thisWeekCount, thisMonthCount, exerciseCount, prs, maxWeekCount };
}
