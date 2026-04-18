'use client';

import { useEffect, useRef, useState } from 'react';
import { Exercise, Workout } from '@/lib/types';
import { createExercise } from '@/lib/utils';
import ExerciseBlock from './ExerciseBlock';
import { Calendar, FileText, Plus } from 'lucide-react';

const EMOJIS = ['🏋️', '💪', '🤸', '🏃', '🚴', '🧘', '⚽', '🏊', '🥊', '🎯', '🔥', '⚡', '🦵', '🦾', '🏆', '🎽'];

interface WorkoutDetailProps {
  workout: Workout;
  onChange: (workout: Workout) => void;
}

export default function WorkoutDetail({ workout, onChange }: WorkoutDetailProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function update(partial: Partial<Workout>) {
    onChange({ ...workout, ...partial });
  }

  function addExercise() {
    const exercise = createExercise();
    setNewExerciseId(exercise.id);
    update({ exercises: [...workout.exercises, exercise] });
  }

  function updateExercise(updated: Exercise) {
    update({ exercises: workout.exercises.map((e) => (e.id === updated.id ? updated : e)) });
  }

  function deleteExercise(id: string) {
    update({ exercises: workout.exercises.filter((e) => e.id !== id) });
  }

  const totalSets = workout.exercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSets = workout.exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.completed).length,
    0
  );
  const totalVolume = workout.exercises.reduce(
    (acc, e) =>
      acc + e.sets.filter((s) => s.completed).reduce((a, s) => a + s.weight * s.reps, 0),
    0
  );

  return (
    <div className="max-w-3xl mx-auto px-12 py-14">
      {/* Emoji picker */}
      <div className="relative mb-3" ref={pickerRef}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-5xl hover:bg-gray-100 rounded-lg p-1.5 transition-colors leading-none"
          title="絵文字を変更"
        >
          {workout.emoji}
        </button>
        {showEmojiPicker && (
          <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 grid grid-cols-8 gap-0.5 w-60">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  update({ emoji: e });
                  setShowEmojiPicker(false);
                }}
                className="text-xl p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <input
        value={workout.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="ワークアウト名"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 border-none outline-none bg-transparent mb-4 leading-tight"
      />

      {/* Metadata bar */}
      <div className="flex items-center gap-4 mb-10 pb-8 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={workout.date}
            onChange={(e) => update({ date: e.target.value })}
            className="text-sm text-gray-500 bg-transparent border-none outline-none cursor-pointer hover:text-gray-800 transition-colors"
          />
        </div>
        {totalSets > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span
              className={`px-2 py-0.5 rounded-full ${
                completedSets === totalSets && totalSets > 0
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {completedSets}/{totalSets} セット完了
            </span>
            {totalVolume > 0 && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">
                総ボリューム {totalVolume.toLocaleString()} kg
              </span>
            )}
          </div>
        )}
      </div>

      {/* Exercises */}
      {workout.exercises.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-gray-400 text-sm mb-4">エクササイズがまだありません</p>
          <button
            onClick={addExercise}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            エクササイズを追加
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {workout.exercises.map((exercise) => (
              <ExerciseBlock
                key={exercise.id}
                exercise={exercise}
                onChange={updateExercise}
                onDelete={() => deleteExercise(exercise.id)}
                autoFocus={exercise.id === newExerciseId}
              />
            ))}
          </div>

          <button
            onClick={addExercise}
            className="mt-6 flex items-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            エクササイズを追加
          </button>
        </>
      )}

      {/* Notes */}
      <div className="mt-12 border-t border-gray-100 pt-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" />
          <span>メモ</span>
        </div>
        <textarea
          value={workout.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="ワークアウトに関するメモを追加..."
          rows={4}
          className="w-full text-sm text-gray-700 placeholder-gray-300 border-none outline-none bg-transparent resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
