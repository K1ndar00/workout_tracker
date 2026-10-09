'use client';

import { useMemo } from 'react';
import { DailyNutrition, NutritionSettings, Workout } from '@/shared/types';
import { isToday } from '@/shared/utils';
import { computeProgress } from '@/shared/stats';

interface Props {
  workouts: Workout[];
  nutritionLogs: DailyNutrition[];
  settings: NutritionSettings;
}

export default function ProgressView({ workouts, nutritionLogs, settings }: Props) {
  const stats = useMemo(
    () => computeProgress(workouts, nutritionLogs, settings),
    [workouts, nutritionLogs, settings]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-12 md:py-14">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">進捗</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: '今週', value: stats.thisWeekCount, unit: '回' },
          { label: '今月', value: stats.thisMonthCount, unit: '回' },
          { label: '累計', value: workouts.length, unit: '回' },
          { label: '種目数', value: stats.exerciseCount, unit: '種目' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{value}<span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span></div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly frequency chart */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">週別トレーニング頻度（過去8週）</h2>
        <div className="flex items-end gap-1.5 h-32 bg-gray-50 rounded-xl p-4 border border-gray-100">
          {stats.weekCounts.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              {w.count > 0 && (
                <span className="text-[10px] text-gray-500 font-medium">{w.count}</span>
              )}
              <div
                className={`w-full rounded-t-md transition-all ${w.count > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                style={{ height: `${(w.count / stats.maxWeekCount) * 100}%`, minHeight: w.count > 0 ? '4px' : '2px' }}
              />
              <span className="text-[10px] text-gray-400 truncate w-full text-center">{w.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Exercise PRs */}
      {stats.prs.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">種目別最大重量</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {stats.prs.map(([name, weight], i) => (
              <div key={name} className={`flex items-center gap-4 px-4 py-3 ${i < stats.prs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="flex-1 text-sm text-gray-800 font-medium">{name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 md:w-40 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(weight / (stats.prs[0]?.[1] ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-16 text-right">{weight} kg</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calorie trend */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">カロリー推移（過去7日）</h2>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {stats.calTrend.map((d, i) => {
            const pct = Math.min((d.kcal / Math.max(stats.maxKcal, 1)) * 100, 100);
            const over = d.kcal > settings.targetCalories && d.kcal > 0;
            return (
              <div key={d.date} className={`flex items-center gap-3 px-4 py-2.5 ${i < 6 ? 'border-b border-gray-50' : ''} ${isToday(d.date) ? 'bg-blue-50/40' : ''}`}>
                <span className="text-xs text-gray-500 w-8 shrink-0">{d.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  {d.kcal > 0 && (
                    <div
                      className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </div>
                <span className={`text-xs font-medium w-20 text-right shrink-0 ${d.kcal === 0 ? 'text-gray-300' : over ? 'text-red-500' : 'text-gray-700'}`}>
                  {d.kcal === 0 ? '未記録' : `${d.kcal.toLocaleString()} kcal`}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-2 text-right">目標: {settings.targetCalories.toLocaleString()} kcal</p>
      </section>
    </div>
  );
}
