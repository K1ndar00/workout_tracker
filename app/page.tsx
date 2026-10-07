'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppView, DailyNutrition, NutritionSettings, TrainingPlan, Workout } from '@/lib/types';
import {
  DEFAULT_SETTINGS,
  loadNutrition,
  loadPlans,
  loadSettings,
  loadWorkouts,
  persistNutrition,
  persistPlans,
  persistSettings,
  persistWorkouts,
} from '@/lib/storage';
import { createNutritionDay, createPlan, createWorkout, today } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import WorkoutDetail from '@/components/WorkoutDetail';
import EmptyState from '@/components/EmptyState';
import PlansView from '@/components/PlansView';
import NutritionView from '@/components/NutritionView';
import ProgressView from '@/components/ProgressView';
import { Menu, Plus } from 'lucide-react';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<AppView>('workouts');

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [nutritionLogs, setNutritionLogs] = useState<DailyNutrition[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [nutritionSettings, setNutritionSettings] = useState<NutritionSettings>(DEFAULT_SETTINGS);

  // Load everything once
  useEffect(() => {
    const ws = loadWorkouts();
    const ps = loadPlans();
    const ns = loadNutrition();
    const st = loadSettings();
    setWorkouts(ws);
    setSelectedWorkoutId(ws[0]?.id ?? null);
    setPlans(ps);
    setSelectedPlanId(ps[0]?.id ?? null);
    setNutritionLogs(ns);
    setNutritionSettings(st);
    setIsLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => { if (isLoaded) persistWorkouts(workouts); }, [workouts, isLoaded]);
  useEffect(() => { if (isLoaded) persistPlans(plans); }, [plans, isLoaded]);
  useEffect(() => { if (isLoaded) persistNutrition(nutritionLogs); }, [nutritionLogs, isLoaded]);
  useEffect(() => { if (isLoaded) persistSettings(nutritionSettings); }, [nutritionSettings, isLoaded]);

  // Workout handlers
  const handleNewWorkout = useCallback(() => {
    const w = createWorkout();
    setWorkouts((prev) => [w, ...prev]);
    setSelectedWorkoutId(w.id);
    setView('workouts');
    setSidebarOpen(false);
  }, []);

  const handleUpdateWorkout = useCallback((updated: Workout) => {
    setWorkouts((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, []);

  const handleDeleteWorkout = useCallback((id: string) => {
    setWorkouts((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      setSelectedWorkoutId(remaining[0]?.id ?? null);
      return remaining;
    });
  }, []);

  // Plan handlers
  const handleNewPlan = useCallback(() => {
    const p = createPlan();
    setPlans((prev) => [p, ...prev]);
    setSelectedPlanId(p.id);
    setView('plans');
    setSidebarOpen(false);
  }, []);

  const handleUpdatePlan = useCallback((updated: TrainingPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const handleDeletePlan = useCallback((id: string) => {
    setPlans((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      setSelectedPlanId(remaining[0]?.id ?? null);
      return remaining;
    });
  }, []);

  // Nutrition handlers
  const getOrCreateLog = useCallback(
    (date: string): DailyNutrition => {
      const existing = nutritionLogs.find((n) => n.date === date);
      if (existing) return existing;
      const newLog = createNutritionDay(date);
      setNutritionLogs((prev) => [newLog, ...prev]);
      return newLog;
    },
    [nutritionLogs]
  );

  const handleNutritionChange = useCallback((log: DailyNutrition) => {
    setNutritionLogs((prev) => {
      const exists = prev.some((n) => n.id === log.id);
      return exists ? prev.map((n) => (n.id === log.id ? log : n)) : [log, ...prev];
    });
  }, []);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId) ?? null;
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const currentLog = nutritionLogs.find((n) => n.date === selectedDate) ?? createNutritionDay(selectedDate);

  const mobileTitle =
    view === 'workouts'
      ? selectedWorkout ? `${selectedWorkout.emoji} ${selectedWorkout.title}` : 'ワークアウト記録'
      : view === 'plans'
      ? selectedPlan ? `${selectedPlan.emoji} ${selectedPlan.name}` : 'トレーニング計画'
      : view === 'nutrition'
      ? '栄養管理'
      : '進捗';

  const showMobileNew = view === 'workouts' || view === 'plans';

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        view={view}
        onViewChange={(v) => { setView(v); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        workouts={workouts}
        selectedWorkoutId={selectedWorkoutId}
        onSelectWorkout={(id) => { setSelectedWorkoutId(id); setSidebarOpen(false); }}
        onNewWorkout={handleNewWorkout}
        onDeleteWorkout={handleDeleteWorkout}
        plans={plans}
        selectedPlanId={selectedPlanId}
        onSelectPlan={(id) => { setSelectedPlanId(id); setSidebarOpen(false); }}
        onNewPlan={handleNewPlan}
        onDeletePlan={handleDeletePlan}
        nutritionLogs={nutritionLogs}
        selectedDate={selectedDate}
        onSelectDate={(date) => { setSelectedDate(date); setSidebarOpen(false); }}
      />

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{mobileTitle}</span>
          {showMobileNew && (
            <button
              onClick={view === 'workouts' ? handleNewWorkout : handleNewPlan}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Views */}
        <div className="flex-1">
          {view === 'workouts' && (
            selectedWorkout
              ? <WorkoutDetail workout={selectedWorkout} onChange={handleUpdateWorkout} />
              : <EmptyState onNew={handleNewWorkout} />
          )}
          {view === 'plans' && (
            selectedPlan
              ? <PlansView plan={selectedPlan} onChange={handleUpdatePlan} onNew={handleNewPlan} />
              : <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-gray-400 text-sm">プランがありません</p>
                  <button onClick={handleNewPlan} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700">
                    <Plus className="w-4 h-4" />新しいプランを作成
                  </button>
                </div>
          )}
          {view === 'nutrition' && (
            <NutritionView
              log={currentLog}
              settings={nutritionSettings}
              onLogChange={handleNutritionChange}
              onSettingsChange={setNutritionSettings}
              onDateChange={handleDateChange}
            />
          )}
          {view === 'progress' && (
            <ProgressView
              workouts={workouts}
              nutritionLogs={nutritionLogs}
              settings={nutritionSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
}
