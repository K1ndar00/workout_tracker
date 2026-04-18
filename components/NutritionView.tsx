'use client';

import { useState } from 'react';
import { DailyNutrition, FoodItem, NutritionMeal, NutritionSettings } from '@/lib/types';
import { createFoodItem, createMeal, formatDayLabel } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Settings, Trash2, X } from 'lucide-react';

interface Props {
  log: DailyNutrition;
  settings: NutritionSettings;
  onLogChange: (log: DailyNutrition) => void;
  onSettingsChange: (s: NutritionSettings) => void;
  onDateChange: (date: string) => void;
}

function MacroBar({ value, target, color }: { value: number; target: number; color: string }) {
  const pct = Math.min((value / Math.max(target, 1)) * 100, 100);
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function NutritionView({ log, settings, onLogChange, onSettingsChange, onDateChange }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [addingMealFood, setAddingMealFood] = useState<string | null>(null);

  const allFoods = log.meals.flatMap((m) => m.foods);
  const totals = {
    calories: allFoods.reduce((a, f) => a + f.calories, 0),
    protein: allFoods.reduce((a, f) => a + f.protein, 0),
    carbs: allFoods.reduce((a, f) => a + f.carbs, 0),
    fat: allFoods.reduce((a, f) => a + f.fat, 0),
  };

  function update(partial: Partial<DailyNutrition>) {
    onLogChange({ ...log, ...partial });
  }

  function updateMeal(meal: NutritionMeal) {
    update({ meals: log.meals.map((m) => (m.id === meal.id ? meal : m)) });
  }

  function addMeal() {
    update({ meals: [...log.meals, createMeal('その他')] });
  }

  function deleteMeal(id: string) {
    update({ meals: log.meals.filter((m) => m.id !== id) });
  }

  function prevDay() {
    const d = new Date(log.date + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().slice(0, 10));
  }

  function nextDay() {
    const d = new Date(log.date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().slice(0, 10));
  }

  const calPct = Math.min((totals.calories / Math.max(settings.targetCalories, 1)) * 100, 100);
  const over = totals.calories > settings.targetCalories;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-12 md:py-10">
      {/* Date header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{formatDayLabel(log.date)}</h1>
          <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-400'}`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">目標設定</span>
            <button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { key: 'targetCalories', label: 'カロリー', unit: 'kcal' },
              { key: 'targetProtein', label: 'タンパク質', unit: 'g' },
              { key: 'targetCarbs', label: '炭水化物', unit: 'g' },
              { key: 'targetFat', label: '脂質', unit: 'g' },
            ] as const).map(({ key, label, unit }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">{label}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={settings[key]}
                    onChange={(e) => onSettingsChange({ ...settings, [key]: parseInt(e.target.value) || 0 })}
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-gray-300"
                    min={0}
                  />
                  <span className="text-xs text-gray-400 shrink-0">{unit}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mb-8 p-4 bg-white border border-gray-200 rounded-xl">
        {/* Calorie ring / bar */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className={`text-3xl font-bold ${over ? 'text-red-500' : 'text-gray-900'}`}>
              {totals.calories.toLocaleString()}
            </span>
            <span className="text-sm text-gray-400 ml-1">/ {settings.targetCalories.toLocaleString()} kcal</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            over ? 'bg-red-100 text-red-600' : calPct >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {over ? `+${(totals.calories - settings.targetCalories).toLocaleString()}` : `残り ${(settings.targetCalories - totals.calories).toLocaleString()}`} kcal
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-blue-500'}`}
            style={{ width: `${calPct}%` }}
          />
        </div>

        {/* PFC */}
        <div className="grid grid-cols-3 gap-4">
          {([
            { label: 'P タンパク質', value: totals.protein, target: settings.targetProtein, color: 'bg-blue-500', unit: 'g' },
            { label: 'C 炭水化物', value: totals.carbs, target: settings.targetCarbs, color: 'bg-amber-400', unit: 'g' },
            { label: 'F 脂質', value: totals.fat, target: settings.targetFat, color: 'bg-pink-400', unit: 'g' },
          ]).map(({ label, value, target, color, unit }) => (
            <div key={label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500">{label}</span>
                <span className="text-xs text-gray-700 font-semibold">{value}<span className="font-normal text-gray-400">/{target}{unit}</span></span>
              </div>
              <MacroBar value={value} target={target} color={color} />
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-4">
        {log.meals.map((meal) => (
          <MealSection
            key={meal.id}
            meal={meal}
            isAdding={addingMealFood === meal.id}
            onStartAdd={() => setAddingMealFood(meal.id)}
            onStopAdd={() => setAddingMealFood(null)}
            onChange={updateMeal}
            onDelete={() => deleteMeal(meal.id)}
            canDelete={log.meals.length > 1}
          />
        ))}
      </div>

      <button
        onClick={addMeal}
        className="mt-4 flex items-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        食事を追加
      </button>
    </div>
  );
}

function MealSection({
  meal, isAdding, onStartAdd, onStopAdd, onChange, onDelete, canDelete,
}: {
  meal: NutritionMeal;
  isAdding: boolean;
  onStartAdd: () => void;
  onStopAdd: () => void;
  onChange: (m: NutritionMeal) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [draft, setDraft] = useState<FoodItem>(() => createFoodItem());
  const mealKcal = meal.foods.reduce((a, f) => a + f.calories, 0);

  function submitFood() {
    if (!draft.name) return;
    onChange({ ...meal, foods: [...meal.foods, draft] });
    setDraft(createFoodItem());
    onStopAdd();
  }

  function deleteFood(id: string) {
    onChange({ ...meal, foods: meal.foods.filter((f) => f.id !== id) });
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Meal header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <input
          value={meal.name}
          onChange={(e) => onChange({ ...meal, name: e.target.value })}
          className="flex-1 font-semibold text-sm text-gray-800 bg-transparent border-none outline-none"
        />
        {mealKcal > 0 && <span className="text-xs text-gray-400">{mealKcal}kcal</span>}
        {canDelete && (
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 hover:text-red-400 text-gray-300">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Food items */}
      {meal.foods.length > 0 && (
        <div className="divide-y divide-gray-50">
          {meal.foods.map((food) => (
            <FoodRow key={food.id} food={food} onDelete={() => deleteFood(food.id)} />
          ))}
        </div>
      )}

      {/* Add food form */}
      {isAdding ? (
        <div className="p-3 border-t border-gray-100 bg-white">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="食品名 *"
              className="col-span-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-gray-300"
            />
            <input
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              placeholder="量 (例: 100g)"
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-gray-300"
            />
            <input
              type="number"
              value={draft.calories || ''}
              onChange={(e) => setDraft({ ...draft, calories: parseInt(e.target.value) || 0 })}
              placeholder="kcal"
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {([
              { key: 'protein', label: 'P(g)' },
              { key: 'carbs', label: 'C(g)' },
              { key: 'fat', label: 'F(g)' },
            ] as const).map(({ key, label }) => (
              <input
                key={key}
                type="number"
                value={draft[key] || ''}
                onChange={(e) => setDraft({ ...draft, [key]: parseFloat(e.target.value) || 0 })}
                placeholder={label}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-gray-300"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={submitFood}
              disabled={!draft.name}
              className="flex-1 bg-gray-900 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              追加
            </button>
            <button onClick={onStopAdd} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onStartAdd}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          食品を追加
        </button>
      )}
    </div>
  );
}

function FoodRow({ food, onDelete }: { food: FoodItem; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-800">{food.name}</span>
        {food.amount && <span className="text-xs text-gray-400 ml-2">{food.amount}</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
        {food.protein > 0 && <span className="text-blue-500">P{food.protein}g</span>}
        {food.carbs > 0 && <span className="text-amber-500">C{food.carbs}g</span>}
        {food.fat > 0 && <span className="text-pink-500">F{food.fat}g</span>}
        <span className="font-semibold text-gray-700">{food.calories}kcal</span>
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
