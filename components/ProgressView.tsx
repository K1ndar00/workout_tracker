'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExerciseDay, ExerciseSummary, PartId, PartWeek, Workout } from '@/lib/types';
import { PARTS, partLabel } from '@/lib/exercises';
import { addDays, formatDate, toDateString } from '@/lib/utils';
import { fetchExerciseHistory, fetchExerciseSummary, fetchPartWeekly } from '@/lib/db';
import type { SaveStatus } from '@/lib/useData';

const WEEKS = 8;

interface Props {
  workouts: Workout[];
  /** Reloads the numbers when a save has finished, so the screen never shows stale totals. */
  saveStatus: SaveStatus;
}

/** Monday of the week containing `d` (local time). */
function mondayOf(d: Date): string {
  const copy = new Date(d);
  const diff = copy.getDay() === 0 ? -6 : 1 - copy.getDay();
  copy.setDate(copy.getDate() + diff);
  return toDateString(copy);
}

const fmt = (n: number) => Math.round(n).toLocaleString();

export default function ProgressView({ workouts, saveStatus }: Props) {
  const [weekly, setWeekly] = useState<PartWeek[]>([]);
  const [summary, setSummary] = useState<ExerciseSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partFilter, setPartFilter] = useState<PartId | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, ExerciseDay[]>>({});

  // The last WEEKS Mondays, oldest first.
  const weeks = useMemo(() => {
    const thisMonday = mondayOf(new Date());
    return Array.from({ length: WEEKS }, (_, i) => addDays(thisMonday, -7 * (WEEKS - 1 - i)));
  }, []);

  useEffect(() => {
    if (saveStatus !== 'saved') return;
    let cancelled = false;
    Promise.all([fetchPartWeekly(weeks[0]!), fetchExerciseSummary()])
      .then(([w, s]) => {
        if (cancelled) return;
        setWeekly(w);
        setSummary(s);
        setHistory({}); // opened exercises are fetched again
        setError(null);
        setLoaded(true);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [saveStatus, weeks]);

  useEffect(() => {
    if (!openId || history[openId]) return;
    fetchExerciseHistory(openId)
      .then((rows) => setHistory((h) => ({ ...h, [openId]: rows })))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [openId, history]);

  // ---- numbers -------------------------------------------------------------

  const counts = useMemo(() => {
    const now = new Date();
    const thisMonday = mondayOf(now);
    const thisMonth = toDateString(now).slice(0, 7);
    return {
      week: workouts.filter((w) => w.date >= thisMonday).length,
      month: workouts.filter((w) => w.date.startsWith(thisMonth)).length,
      total: workouts.length,
    };
  }, [workouts]);

  /** Per body part: weekly volume (oldest week first), 8-week total. Parts without data are left out. */
  const partRows = useMemo(() => {
    const rows = PARTS.map((p) => {
      const perWeek = weeks.map((w) => weekly.find((r) => r.part === p.id && r.weekStart === w)?.volumeKg ?? 0);
      const sets = weekly.filter((r) => r.part === p.id).reduce((a, r) => a + r.sets, 0);
      return { part: p.id, label: p.label, perWeek, total: perWeek.reduce((a, v) => a + v, 0), sets };
    });
    return rows.filter((r) => r.total > 0 || (r.part !== 'unclassified'));
  }, [weekly, weeks]);
  const maxWeekVolume = Math.max(1, ...partRows.flatMap((r) => r.perWeek));
  const hasAnyVolume = partRows.some((r) => r.total > 0);

  const visibleExercises = summary.filter((s) => partFilter === 'all' || s.part === partFilter);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-12 md:py-14">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">進捗</h1>
      <p className="text-xs text-gray-400 mb-8">「完了」にしたセットだけを集計しています(重量は kg に換算)。</p>

      {error && <p className="text-xs text-red-500 mb-4 break-all">{error}</p>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { label: '今週', value: counts.week },
          { label: '今月', value: counts.month },
          { label: '累計', value: counts.total },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">
              {value}
              <span className="text-sm font-normal text-gray-400 ml-0.5">回</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{label}のワークアウト</div>
          </div>
        ))}
      </div>

      {!loaded && !error && <p className="text-sm text-gray-400">読み込み中…</p>}

      {loaded && (
        <>
          {/* By body part */}
          <section className="mb-12">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">部位別ボリューム(過去{WEEKS}週)</h2>
            <p className="text-[11px] text-gray-400 mb-4">棒は週ごとの重量×回数の合計。右端は{WEEKS}週の合計とセット数。</p>
            {!hasAnyVolume ? (
              <p className="text-sm text-gray-400">完了にしたセットがまだありません。</p>
            ) : (
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {partRows.map((r) => (
                  <div key={r.part} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-12 text-sm font-medium text-gray-800 shrink-0">{r.label}</span>
                    <div className="flex-1 flex items-end gap-1 h-10" aria-label={`${r.label}の週別ボリューム`}>
                      {r.perWeek.map((v, i) => (
                        <div key={weeks[i]} className="flex-1 h-full flex items-end" title={`${formatDate(weeks[i]!)}〜 ${fmt(v)} kg`}>
                          <div
                            className={`w-full rounded-t ${v > 0 ? 'bg-blue-500' : 'bg-gray-100'}`}
                            style={{ height: v > 0 ? `${Math.max((v / maxWeekVolume) * 100, 8)}%` : '4%' }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="w-28 text-right shrink-0">
                      <div className="text-sm font-bold text-gray-700">{fmt(r.total)} kg</div>
                      <div className="text-[11px] text-gray-400">{r.sets} セット</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* By exercise */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">種目別</h2>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {([{ id: 'all', label: 'すべて' }, ...PARTS] as { id: PartId | 'all'; label: string }[]).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPartFilter(p.id)}
                  className={`text-xs px-3 py-1 rounded-full ${partFilter === p.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {visibleExercises.length === 0 ? (
              <p className="text-sm text-gray-400">該当する種目の記録がありません。</p>
            ) : (
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {visibleExercises.map((s) => (
                  <div key={s.exerciseId}>
                    <button
                      onClick={() => setOpenId(openId === s.exerciseId ? null : s.exerciseId)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                      aria-expanded={openId === s.exerciseId}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {partLabel(s.part)} · {s.sessions}回 · 最終 {formatDate(s.lastDate)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-700">{s.bestWeightKg} kg</div>
                        <div className="text-[11px] text-gray-400">最大重量</div>
                      </div>
                    </button>
                    {openId === s.exerciseId && <Trend rows={history[s.exerciseId]} />}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Max weight per training day (most recent 12), as bars. */
function Trend({ rows }: { rows: ExerciseDay[] | undefined }) {
  if (!rows) return <p className="px-4 pb-3 text-xs text-gray-400">読み込み中…</p>;
  const max = Math.max(1, ...rows.map((r) => r.maxWeightKg));
  return (
    <div className="px-4 pb-4 bg-gray-50/60">
      <p className="text-[11px] text-gray-400 py-2">最大重量の推移(直近{rows.length}回)</p>
      <div className="flex items-end gap-1.5 h-24">
        {rows.map((r) => (
          <div key={r.date} className="flex-1 h-full flex flex-col items-center justify-end gap-1" title={`${r.date}: ${r.maxWeightKg} kg / ${r.sets} セット / ${fmt(r.volumeKg)} kg`}>
            <span className="text-[10px] text-gray-500">{r.maxWeightKg}</span>
            <div className="w-full rounded-t bg-blue-500" style={{ height: `${Math.max((r.maxWeightKg / max) * 70, 4)}%` }} />
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{formatDate(r.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
