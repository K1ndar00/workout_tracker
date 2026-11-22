'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppView } from '@/lib/types';
import { usedExerciseIds } from '@/lib/exercises';
import { useData } from '@/lib/useData';
import { createPlan, createWorkout } from '@/lib/utils';
import AuthGate from '@/components/AuthGate';
import Sidebar from '@/components/Sidebar';
import WorkoutDetail from '@/components/WorkoutDetail';
import EmptyState from '@/components/EmptyState';
import PlansView from '@/components/PlansView';
import ProgressView from '@/components/ProgressView';
import ExercisesView from '@/components/ExercisesView';
import { Menu, Plus, X } from 'lucide-react';

export default function Home() {
  return (
    <AuthGate>
      {(userId, signOut) => <WorkoutApp key={userId} onSignOut={signOut} />}
    </AuthGate>
  );
}

function WorkoutApp({ onSignOut }: { onSignOut: () => void }) {
  const data = useData();
  const { workouts, plans, exercises } = data;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<AppView>('workouts');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Pick the first item once the data has loaded, and again if the selection disappears.
  useEffect(() => {
    if (!data.ready) return;
    if (!workouts.some((w) => w.id === selectedWorkoutId)) setSelectedWorkoutId(workouts[0]?.id ?? null);
    if (!plans.some((p) => p.id === selectedPlanId)) setSelectedPlanId(plans[0]?.id ?? null);
  }, [data.ready, workouts, plans, selectedWorkoutId, selectedPlanId]);

  const usedIds = useMemo(() => usedExerciseIds(workouts, plans), [workouts, plans]);

  const handleNewWorkout = useCallback(() => {
    const w = createWorkout();
    data.addWorkout(w);
    setSelectedWorkoutId(w.id);
    setView('workouts');
    setSidebarOpen(false);
  }, [data.addWorkout]);

  const handleNewPlan = useCallback(() => {
    const p = createPlan();
    data.addPlan(p);
    setSelectedPlanId(p.id);
    setView('plans');
    setSidebarOpen(false);
  }, [data.addPlan]);

  const handleDeleteMaster = useCallback(
    (id: string) => {
      if (usedIds.has(id)) return; // the database refuses too; this just avoids the round trip
      void data.removeExercise(id);
    },
    [usedIds, data.removeExercise]
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

  if (data.loadFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-gray-700">データを読み込めませんでした。</p>
        {data.notice && <p className="text-xs text-gray-400 break-all">{data.notice}</p>}
        <button onClick={() => { data.clearNotice(); void data.reload(); }} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">
          再読み込み
        </button>
      </div>
    );
  }
  if (!data.ready) return null;

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
        onDeleteWorkout={data.removeWorkout}
        plans={plans}
        selectedPlanId={selectedPlanId}
        onSelectPlan={(id) => { setSelectedPlanId(id); setSidebarOpen(false); }}
        onNewPlan={handleNewPlan}
        onDeletePlan={data.removePlan}
        saveStatus={data.saveStatus}
        onRetrySave={() => void data.retrySave()}
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

        {data.notice && (
          <div className="flex items-start gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs shrink-0">
            <span className="flex-1 break-all">{data.notice}</span>
            <button onClick={data.clearNotice} aria-label="閉じる" className="p-0.5 hover:text-red-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Views */}
        <div className="flex-1">
          {view === 'workouts' && (
            selectedWorkout
              ? <WorkoutDetail workout={selectedWorkout} onChange={data.updateWorkout} masters={exercises} onCreateMaster={data.createExercise} />
              : <EmptyState onNew={handleNewWorkout} />
          )}
          {view === 'plans' && (
            selectedPlan
              ? <PlansView plan={selectedPlan} onChange={data.updatePlan} onNew={handleNewPlan} masters={exercises} onCreateMaster={data.createExercise} />
              : <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-gray-400 text-sm">プランがありません</p>
                  <button onClick={handleNewPlan} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700">
                    <Plus className="w-4 h-4" />新しいプランを作成
                  </button>
                </div>
          )}
          {view === 'exercises' && (
            <ExercisesView
              masters={exercises}
              usedIds={usedIds}
              onCreate={data.createExercise}
              onUpdate={(m) => void data.changeExercise(m)}
              onDelete={handleDeleteMaster}
            />
          )}
          {view === 'progress' && <ProgressView workouts={workouts} masters={exercises} />}
        </div>
      </main>
    </div>
  );
}
