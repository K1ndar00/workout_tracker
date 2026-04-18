'use client';

import { useCallback, useEffect, useState } from 'react';
import { Workout } from '@/lib/types';
import { loadWorkouts, persistWorkouts } from '@/lib/storage';
import { createWorkout } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import WorkoutDetail from '@/components/WorkoutDetail';
import EmptyState from '@/components/EmptyState';

export default function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadWorkouts();
    setWorkouts(loaded);
    if (loaded.length > 0) {
      setSelectedId(loaded[0]?.id ?? null);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) persistWorkouts(workouts);
  }, [workouts, isLoaded]);

  const selectedWorkout = workouts.find((w) => w.id === selectedId) ?? null;

  const handleNew = useCallback(() => {
    const w = createWorkout();
    setWorkouts((prev) => [w, ...prev]);
    setSelectedId(w.id);
  }, []);

  const handleUpdate = useCallback((updated: Workout) => {
    setWorkouts((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setWorkouts((prev) => {
        const remaining = prev.filter((w) => w.id !== id);
        if (selectedId === id) {
          setSelectedId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
    },
    [selectedId]
  );

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        workouts={workouts}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={handleNew}
        onDelete={handleDelete}
      />
      <main className="flex-1 overflow-y-auto">
        {selectedWorkout ? (
          <WorkoutDetail workout={selectedWorkout} onChange={handleUpdate} />
        ) : (
          <EmptyState onNew={handleNew} />
        )}
      </main>
    </div>
  );
}
