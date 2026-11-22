'use client';

import { useState } from 'react';
import { ExerciseMaster, PartId, PlanDay, PlanExercise, TrainingPlan } from '@/shared/types';
import ExercisePicker from './ExercisePicker';
import { createPlanDay, createPlanExercise } from '@/shared/utils';
import { ChevronDown, ChevronRight, Dumbbell, Plus, Trash2 } from 'lucide-react';

const EMOJIS = ['🗓️', '💪', '🏋️', '🤸', '🏃', '🚴', '🔥', '⚡', '🦵', '🦾', '🏆', '🎯'];

interface Props {
  plan: TrainingPlan;
  onChange: (plan: TrainingPlan) => void;
  onNew: () => void;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}

export default function PlansView({ plan, onChange, onNew, masters, onCreateMaster }: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set(plan.days.map((d) => d.id)));

  function update(partial: Partial<TrainingPlan>) {
    onChange({ ...plan, ...partial });
  }

  function toggleDay(id: string) {
    setOpenDays((prev) => {
      const arr = Array.from(prev);
      if (prev.has(id)) return new Set(arr.filter((x) => x !== id));
      return new Set(arr.concat(id));
    });
  }

  function addDay() {
    const day = createPlanDay(plan.days.length + 1);
    setOpenDays((prev) => new Set(Array.from(prev).concat(day.id)));
    update({ days: [...plan.days, day] });
  }

  function updateDay(updated: PlanDay) {
    update({ days: plan.days.map((d) => (d.id === updated.id ? updated : d)) });
  }

  function deleteDay(id: string) {
    update({ days: plan.days.filter((d) => d.id !== id) });
  }

  function toggleActive() {
    update({ isActive: !plan.isActive });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-12 md:py-14">
      {/* Emoji */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className="text-5xl hover:bg-gray-100 rounded-lg p-1.5 transition-colors leading-none"
        >
          {plan.emoji}
        </button>
        {showEmoji && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 grid grid-cols-6 gap-0.5 w-48">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { update({ emoji: e }); setShowEmoji(false); }}
                className="text-xl p-2 hover:bg-gray-100 rounded-lg">
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <input
        value={plan.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder="プラン名"
        className="w-full text-3xl md:text-4xl font-bold text-gray-900 placeholder-gray-200 border-none outline-none bg-transparent mb-3 leading-tight"
      />

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <span>週</span>
          <select
            value={plan.frequency}
            onChange={(e) => update({ frequency: parseInt(e.target.value) })}
            className="text-sm text-gray-700 bg-gray-100 border-none rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n}回</option>
            ))}
          </select>
        </label>

        <button
          onClick={toggleActive}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            plan.isActive
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${plan.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {plan.isActive ? '実施中' : 'プランを開始'}
        </button>
      </div>

      {/* Description */}
      <textarea
        value={plan.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="プランの説明・目標を追加..."
        rows={2}
        className="w-full text-sm text-gray-600 placeholder-gray-300 border-none outline-none bg-transparent resize-none mb-8 leading-relaxed"
      />

      {/* Days */}
      <div className="space-y-3">
        {plan.days.map((day) => (
          <DaySection
            key={day.id}
            day={day}
            isOpen={openDays.has(day.id)}
            onToggle={() => toggleDay(day.id)}
            onChange={updateDay}
            onDelete={() => deleteDay(day.id)}
            canDelete={plan.days.length > 1}
            masters={masters}
            onCreateMaster={onCreateMaster}
          />
        ))}
      </div>

      <button
        onClick={addDay}
        className="mt-4 flex items-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        デイを追加
      </button>
    </div>
  );
}

function DaySection({
  day, isOpen, onToggle, onChange, onDelete, canDelete, masters, onCreateMaster,
}: {
  day: PlanDay;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (d: PlanDay) => void;
  onDelete: () => void;
  canDelete: boolean;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}) {
  function updateExercise(ex: PlanExercise) {
    onChange({ ...day, exercises: day.exercises.map((e) => (e.id === ex.id ? ex : e)) });
  }

  function addExercise() {
    onChange({ ...day, exercises: [...day.exercises, createPlanExercise()] });
  }

  function deleteExercise(id: string) {
    onChange({ ...day, exercises: day.exercises.filter((e) => e.id !== id) });
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <input
            value={day.label}
            onChange={(e) => onChange({ ...day, label: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-sm text-gray-800 bg-transparent border-none outline-none flex-1"
          />
        </button>
        <span className="text-xs text-gray-400">{day.exercises.length}種目</span>
        {canDelete && (
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 hover:text-red-400 text-gray-300">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Exercises */}
      {isOpen && (
        <div className="divide-y divide-gray-100">
          {day.exercises.length === 0 && (
            <p className="px-4 py-4 text-xs text-gray-400 text-center">種目がありません</p>
          )}
          {day.exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              onChange={updateExercise}
              onDelete={() => deleteExercise(ex.id)}
              masters={masters}
              onCreateMaster={onCreateMaster}
            />
          ))}
          <button
            onClick={addExercise}
            className="w-full flex items-center gap-2 px-4 py-3 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            種目を追加
          </button>
        </div>
      )}
    </div>
  );
}

function ExerciseRow({
  ex, onChange, onDelete, masters, onCreateMaster,
}: {
  ex: PlanExercise;
  onChange: (e: PlanExercise) => void;
  onDelete: () => void;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50/50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Dumbbell className="w-3.5 h-3.5 text-gray-300 shrink-0" />
      <ExercisePicker
        exerciseId={ex.exerciseId}
        name={ex.name}
        masters={masters}
        onSelect={(m) => onChange({ ...ex, exerciseId: m.id, name: m.name })}
        onCreate={onCreateMaster}
        selectClassName="w-full text-sm text-gray-700 bg-transparent border-none outline-none cursor-pointer"
      />
      <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
        <input
          type="number"
          value={ex.sets}
          onChange={(e) => onChange({ ...ex, sets: parseInt(e.target.value) || 1 })}
          className="w-8 text-center bg-gray-100 rounded px-1 py-0.5 border-none outline-none"
          min={1}
        />
        <span>×</span>
        <input
          value={ex.reps}
          onChange={(e) => onChange({ ...ex, reps: e.target.value })}
          placeholder="回"
          className="w-14 text-center bg-gray-100 rounded px-1 py-0.5 border-none outline-none"
        />
      </div>
      <button
        onClick={onDelete}
        className={`p-1 rounded hover:bg-red-50 hover:text-red-400 text-gray-300 transition-all ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
