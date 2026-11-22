'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppView, ExerciseMaster, PartId, TrainingPlan, Workout } from '@/shared/types';
import { allExercises, findOrCreateExercise, usedExerciseIds } from '@/shared/exercises';
import { useAppData } from '@/shared/useAppData';
import { createPlan, createWorkout } from '@/shared/utils';
import { supabase } from '@/lib/supabase';
import { webStorage } from '@/lib/storage';
import AuthGate from '@/components/AuthGate';
import Sidebar from '@/components/Sidebar';
import WorkoutDetail from '@/components/WorkoutDetail';
import EmptyState from '@/components/EmptyState';
import PlansView from '@/components/PlansView';
import ProgressView from '@/components/ProgressView';
import ExercisesView from '@/components/ExercisesView';
import { Menu, Plus } from 'lucide-react';

export default function Home() {
  return (
    <AuthGate>
      {(userId, signOut) => <WorkoutApp key={userId ?? 'local'} userId={userId} onSignOut={signOut} />}
    </AuthGate>
  );
}

function WorkoutApp({ userId, onSignOut }: { userId: string | null; onSignOut: () => void }) {
  const {
    ready: isLoaded,
    status: syncStatus,
    lastError: syncError,
    sync,
    workouts,
    setWorkouts,
    plans,
    setPlans,
    exercises,
    setExercises,
  } = useAppData({ client: supabase, userId, storage: webStorage });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<AppView>('workouts');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Pick the first item once the data has loaded, and again if the selection disappears
  // (e.g. it was deleted on another device).
  useEffect(() => {
    if (!isLoaded) return;
    if (!workouts.some((w) => w.id === selectedWorkoutId)) setSelectedWorkoutId(workouts[0]?.id ?? null);
    if (!plans.some((p) => p.id === selectedPlanId)) setSelectedPlanId(plans[0]?.id ?? null);
  }, [isLoaded, workouts, plans, selectedWorkoutId, selectedPlanId]);

  // Refresh when the tab becomes visible again.
  useEffect(() => {
    if (!supabase) return;
    const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sync]);

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

  // Exercise master handlers
  const masters = useMemo(() => allExercises(exercises), [exercises]);
  const usedIds = useMemo(() => usedExerciseIds(workouts, plans), [workouts, plans]);

  const handleCreateMaster = useCallback(
    (name: string, part: PartId): ExerciseMaster => {
      const { master, created } = findOrCreateExercise(exercises, name, part);
      if (created) setExercises((prev) => [...prev, master]);
      return master;
    },
    [exercises]
  );

  const handleUpdateMaster = useCallback((updated: ExerciseMaster) => {
    setExercises((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }, []);

  const handleDeleteMaster = useCallback(
    (id: string) => {
      if (usedIds.has(id)) return; // referenced by a record: keep it
      setExercises((prev) => prev.filter((m) => m.id !== id));
    },
    [usedIds]
  );

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId) ?? null;
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const mobileTitle =
    view === 'workouts'
      ? selectedWorkout ? `${selectedWorkout.emoji} ${selectedWorkout.title}` : 'ワークアウト記録'
      : view === 'plans'
      ? selectedPlan ? `${selectedPlan.emoji} ${selectedPlan.name}` : 'トレーニング計画'
      : view === 'exercises'
      ? '種目'
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
        syncStatus={syncStatus}
        syncError={syncError}
        signedIn={userId !== null}
        onSignOut={onSignOut}
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
              ? <WorkoutDetail workout={selectedWorkout} onChange={handleUpdateWorkout} masters={masters} onCreateMaster={handleCreateMaster} />
              : <EmptyState onNew={handleNewWorkout} />
          )}
          {view === 'plans' && (
            selectedPlan
              ? <PlansView plan={selectedPlan} onChange={handleUpdatePlan} onNew={handleNewPlan} masters={masters} onCreateMaster={handleCreateMaster} />
              : <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-gray-400 text-sm">プランがありません</p>
                  <button onClick={handleNewPlan} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700">
                    <Plus className="w-4 h-4" />新しいプランを作成
                  </button>
                </div>
          )}
          {view === 'exercises' && (
            <ExercisesView
              masters={masters}
              usedIds={usedIds}
              onCreate={handleCreateMaster}
              onUpdate={handleUpdateMaster}
              onDelete={handleDeleteMaster}
            />
          )}
          {view === 'progress' && (
            <ProgressView workouts={workouts} />
          )}
        </div>
      </main>
    </div>
  );
}
