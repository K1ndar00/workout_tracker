'use client';

import { useMemo, useState } from 'react';
import { AppView, TrainingPlan, Workout } from '@/lib/types';
import { formatDate, formatMonthKey } from '@/lib/utils';
import { BarChart2, ClipboardList, Dumbbell, ListChecks, LogOut, Plus, Trash2, TrendingUp, X } from 'lucide-react';
import type { SaveStatus } from '@/lib/useData';

const NAV: { id: AppView; label: string; Icon: React.ElementType }[] = [
  { id: 'workouts', label: '記録', Icon: Dumbbell },
  { id: 'plans', label: '計画', Icon: ClipboardList },
  { id: 'exercises', label: '種目', Icon: ListChecks },
  { id: 'progress', label: '進捗', Icon: TrendingUp },
];

interface SidebarProps {
  view: AppView;
  onViewChange: (v: AppView) => void;
  isOpen: boolean;
  onClose: () => void;
  // workouts
  workouts: Workout[];
  selectedWorkoutId: string | null;
  onSelectWorkout: (id: string) => void;
  onNewWorkout: () => void;
  onDeleteWorkout: (id: string) => void;
  // plans
  plans: TrainingPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (id: string) => void;
  onNewPlan: () => void;
  onDeletePlan: (id: string) => void;
  // account / sync
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  onSignOut: () => void;
}

const SAVE_LABEL: Record<SaveStatus, { text: string; dot: string }> = {
  saved: { text: '保存済み', dot: 'bg-emerald-500' },
  saving: { text: '保存中…', dot: 'bg-amber-400' },
  error: { text: '保存できていません', dot: 'bg-red-500' },
};

function groupByMonth(workouts: Workout[]): [string, Workout[]][] {
  const groups = new Map<string, Workout[]>();
  for (const w of workouts) {
    const key = w.date.substring(0, 7);
    const arr = groups.get(key);
    if (arr) arr.push(w); else groups.set(key, [w]);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function Sidebar(props: SidebarProps) {
  const { view, onViewChange, isOpen, onClose } = props;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const grouped = useMemo(() => groupByMonth(props.workouts), [props.workouts]);

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:w-60
        flex flex-col bg-[#f7f6f3] border-r border-gray-200 shrink-0 select-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header */}
      <div className="px-3 py-3.5 flex items-center gap-2.5 border-b border-gray-200/60 shrink-0">
        <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
          <Dumbbell className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate flex-1">Workout Tracker</span>
        <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-gray-200 text-gray-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="grid grid-cols-4 gap-0.5 p-2 border-b border-gray-200/60 shrink-0">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { onViewChange(id); onClose(); }}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-colors ${
              view === id
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-500 hover:bg-gray-200/60 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Contextual list */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {/* Workouts list */}
        {view === 'workouts' && (
          <>
            {grouped.length === 0 && (
              <p className="px-3 py-6 text-xs text-gray-400 text-center">ワークアウトがありません</p>
            )}
            {grouped.map(([month, ws]) => (
              <div key={month} className="mb-3">
                <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {formatMonthKey(month)}
                </div>
                {ws.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => { props.onSelectWorkout(w.id); onClose(); }}
                    onMouseEnter={() => setHoveredId(w.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer mb-0.5 ${
                      props.selectedWorkoutId === w.id
                        ? 'bg-gray-200/80 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-200/50 active:bg-gray-200'
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{w.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-[13px]">{w.title}</div>
                      <div className="text-[11px] text-gray-400">{formatDate(w.date)}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); props.onDeleteWorkout(w.id); }}
                      className={`shrink-0 p-1 rounded hover:bg-red-100 hover:text-red-500 text-gray-300 transition-all ${hoveredId === w.id ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Plans list */}
        {view === 'plans' && (
          <>
            {props.plans.length === 0 && (
              <p className="px-3 py-6 text-xs text-gray-400 text-center">プランがありません</p>
            )}
            {props.plans.map((p) => (
              <div
                key={p.id}
                onClick={() => { props.onSelectPlan(p.id); onClose(); }}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer mb-0.5 ${
                  props.selectedPlanId === p.id
                    ? 'bg-gray-200/80 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-200/50 active:bg-gray-200'
                }`}
              >
                <span className="text-base leading-none shrink-0">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-[13px]">{p.name}</div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    週{p.frequency}回
                    {p.isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); props.onDeletePlan(p.id); }}
                  className={`shrink-0 p-1 rounded hover:bg-red-100 hover:text-red-500 text-gray-300 transition-all ${hoveredId === p.id ? 'opacity-100' : 'opacity-0'}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </>
        )}

        {/* Exercise master: managed in the main pane */}
        {view === 'exercises' && (
          <div className="px-3 py-6 text-xs text-gray-400 text-center">
            <ListChecks className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            記録・計画で選べる種目
          </div>
        )}

        {/* Progress: no list needed */}
        {view === 'progress' && (
          <div className="px-3 py-6 text-xs text-gray-400 text-center">
            <BarChart2 className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            記録から自動集計
          </div>
        )}
      </div>

      {/* Bottom action */}
      {(view === 'workouts' || view === 'plans') && (
        <div className="p-2 border-t border-gray-200 shrink-0">
          <button
            onClick={view === 'workouts' ? props.onNewWorkout : props.onNewPlan}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {view === 'workouts' ? '新しいワークアウト' : '新しいプラン'}
          </button>
        </div>
      )}

      {/* Sync status / account */}
      <div className="px-3 py-2.5 border-t border-gray-200 shrink-0 flex items-center gap-2 text-[11px] text-gray-500">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SAVE_LABEL[props.saveStatus].dot}`} />
        <span className="flex-1 truncate">{SAVE_LABEL[props.saveStatus].text}</span>
        {props.saveStatus === 'error' && (
          <button onClick={props.onRetrySave} className="px-1.5 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700">
            再試行
          </button>
        )}
        <button onClick={props.onSignOut} title="ログアウト" className="p-1 rounded hover:bg-gray-200 text-gray-500">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
