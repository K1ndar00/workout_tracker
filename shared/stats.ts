import type { Workout } from './types';

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

/** Numbers behind the progress screen; shared so web and mobile always agree. */
export function computeProgress(workouts: Workout[]) {
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

  const thisMonth = now.toISOString().slice(0, 7);
  const thisMonthCount = workouts.filter((w) => w.date.startsWith(thisMonth)).length;

  const exerciseCount = new Set(workouts.flatMap((w) => w.exercises.map((e) => e.name)).filter(Boolean)).size;

  // Exercise PRs
  const prMap = new Map<string, number>();
  for (const wo of workouts) {
    for (const ex of wo.exercises) {
      if (!ex.name) continue;
      const maxWeight = Math.max(...ex.sets.map((s) => s.weight));
      if (maxWeight > 0) {
        const prev = prMap.get(ex.name) ?? 0;
        if (maxWeight > prev) prMap.set(ex.name, maxWeight);
      }
    }
  }
  const prs = Array.from(prMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxWeekCount = Math.max(...weekCounts.map((w) => w.count), 1);

  return { weekCounts, thisWeekCount, thisMonthCount, exerciseCount, prs, maxWeekCount };
}
