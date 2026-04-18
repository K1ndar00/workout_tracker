'use client';

import { useMemo, useState } from 'react';
import { Workout } from '@/lib/types';
import { formatDate, formatMonthKey } from '@/lib/utils';
import { Dumbbell, Plus, Trash2 } from 'lucide-react';

interface SidebarProps {
  workouts: Workout[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function groupByMonth(workouts: Workout[]): [string, Workout[]][] {
  const groups = new Map<string, Workout[]>();
  for (const w of workouts) {
    const key = w.date.substring(0, 7);
    const existing = groups.get(key);
    if (existing) {
      existing.push(w);
    } else {
      groups.set(key, [w]);
    }
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function Sidebar({ workouts, selectedId, onSelect, onNew, onDelete }: SidebarProps) {
  const grouped = useMemo(() => groupByMonth(workouts), [workouts]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside className="w-60 h-full flex flex-col bg-[#f7f6f3] border-r border-gray-200 shrink-0 select-none">
      {/* Header */}
      <div className="px-3 py-3.5 flex items-center gap-2.5 border-b border-gray-200/60">
        <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
          <Dumbbell className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">Workout Tracker</span>
      </div>

      {/* Workout list */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {grouped.length === 0 && (
          <div className="px-3 py-6 text-xs text-gray-400 text-center">
            ワークアウトがありません
          </div>
        )}
        {grouped.map(([month, ws]) => (
          <div key={month} className="mb-3">
            <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {formatMonthKey(month)}
            </div>
            {ws.map((w) => (
              <div
                key={w.id}
                onClick={() => onSelect(w.id)}
                onMouseEnter={() => setHoveredId(w.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm mb-0.5
                  ${selectedId === w.id
                    ? 'bg-gray-200/80 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-200/50'
                  }
                `}
              >
                <span className="text-base leading-none shrink-0">{w.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-[13px]">{w.title}</div>
                  <div className="text-[11px] text-gray-400">{formatDate(w.date)}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(w.id);
                  }}
                  className={`shrink-0 p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-gray-300 transition-all ${
                    hoveredId === w.id ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* New workout */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新しいワークアウト
        </button>
      </div>
    </aside>
  );
}
