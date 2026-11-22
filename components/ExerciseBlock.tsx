'use client';

import { useEffect, useRef, useState } from 'react';
import { Exercise, ExerciseMaster, PartId, WorkoutSet } from '@/shared/types';
import ExercisePicker from './ExercisePicker';
import { createSet } from '@/shared/utils';
import { Check, GripVertical, Plus, Trash2 } from 'lucide-react';

interface ExerciseBlockProps {
  exercise: Exercise;
  onChange: (exercise: Exercise) => void;
  onDelete: () => void;
  autoFocus?: boolean;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}

export default function ExerciseBlock({ exercise, onChange, onDelete, autoFocus, masters, onCreateMaster }: ExerciseBlockProps) {
  const [hovered, setHovered] = useState(false);
  const nameRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (autoFocus && nameRef.current) {
      nameRef.current.focus();
    }
  }, [autoFocus]);

  function updateSet(updated: WorkoutSet) {
    onChange({ ...exercise, sets: exercise.sets.map((s) => (s.id === updated.id ? updated : s)) });
  }

  function addSet() {
    const last = exercise.sets[exercise.sets.length - 1];
    onChange({
      ...exercise,
      sets: [
        ...exercise.sets,
        createSet({ weight: last?.weight, reps: last?.reps, unit: last?.unit }),
      ],
    });
  }

  function removeSet(id: string) {
    if (exercise.sets.length <= 1) return;
    onChange({ ...exercise, sets: exercise.sets.filter((s) => s.id !== id) });
  }

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalVolume = exercise.sets
    .filter((s) => s.completed)
    .reduce((acc, s) => acc + s.weight * s.reps, 0);

  return (
    <div
      className="group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Exercise header */}
      <div className="flex items-center gap-1.5 mb-3">
        <span
          className={`text-gray-300 transition-opacity cursor-grab ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <GripVertical className="w-4 h-4" />
        </span>
        <ExercisePicker
          ref={nameRef}
          exerciseId={exercise.exerciseId}
          name={exercise.name}
          masters={masters}
          onSelect={(m) => onChange({ ...exercise, exerciseId: m.id, name: m.name })}
          onCreate={onCreateMaster}
        />
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <span className="text-xs text-gray-400">
              {completedCount}/{exercise.sets.length}セット
              {totalVolume > 0 && ` · ${totalVolume.toLocaleString()}kg`}
            </span>
          )}
          <button
            onClick={onDelete}
            className={`p-1 rounded hover:bg-red-50 hover:text-red-400 text-gray-300 transition-all ${
              hovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sets table */}
      <div className="ml-0 md:ml-5 rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[280px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2 px-3 text-[11px] font-semibold text-gray-400 text-center w-10">
                セット
              </th>
              <th className="py-2 px-3 text-[11px] font-semibold text-gray-400 text-center">
                重量 (kg)
              </th>
              <th className="py-2 px-3 text-[11px] font-semibold text-gray-400 text-center">
                回数
              </th>
              <th className="py-2 px-3 text-[11px] font-semibold text-gray-400 text-center w-14">
                完了
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {exercise.sets.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                index={index + 1}
                onChange={updateSet}
                onDelete={() => removeSet(set.id)}
                canDelete={exercise.sets.length > 1}
              />
            ))}
          </tbody>
        </table>
        <div className="border-t border-gray-100">
          <button
            onClick={addSet}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3 h-3" />
            セットを追加
          </button>
        </div>
      </div>
    </div>
  );
}

interface SetRowProps {
  set: WorkoutSet;
  index: number;
  onChange: (set: WorkoutSet) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function SetRow({ set, index, onChange, onDelete, canDelete }: SetRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      className={`border-b border-gray-50 last:border-0 transition-colors ${
        set.completed ? 'bg-emerald-50/60' : 'bg-white hover:bg-gray-50/50'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="py-2 px-3 text-center">
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            set.completed
              ? 'text-emerald-600 bg-emerald-100'
              : 'text-gray-400 bg-gray-100'
          }`}
        >
          {index}
        </span>
      </td>
      <td className="py-1.5 px-3">
        <input
          type="number"
          value={set.weight || ''}
          onChange={(e) => onChange({ ...set, weight: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          min="0"
          step="0.5"
          className="w-full text-center text-sm text-gray-700 bg-transparent border-none outline-none focus:bg-white focus:ring-1 focus:ring-gray-200 rounded px-2 py-0.5 transition-all"
        />
      </td>
      <td className="py-1.5 px-3">
        <input
          type="number"
          value={set.reps || ''}
          onChange={(e) => onChange({ ...set, reps: parseInt(e.target.value) || 0 })}
          placeholder="0"
          min="0"
          className="w-full text-center text-sm text-gray-700 bg-transparent border-none outline-none focus:bg-white focus:ring-1 focus:ring-gray-200 rounded px-2 py-0.5 transition-all"
        />
      </td>
      <td className="py-1.5 px-3 text-center">
        <button
          onClick={() => onChange({ ...set, completed: !set.completed })}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${
            set.completed
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {set.completed && <Check className="w-3 h-3" strokeWidth={3} />}
        </button>
      </td>
      <td className="py-1.5 px-1 text-center">
        {hovered && canDelete && (
          <button
            onClick={onDelete}
            className="p-0.5 text-gray-300 hover:text-red-400 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </td>
    </tr>
  );
}
