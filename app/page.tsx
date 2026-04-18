'use client';

import { useCallback, useEffect, useState } from 'react';
import { Workout } from '@/lib/types';
import { loadWorkouts, persistWorkouts } from '@/lib/storage';
import { createWorkout } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import WorkoutDetail from '@/components/WorkoutDetail';
import EmptyState from '@/components/EmptyState';
import { Menu, Plus } from 'lucide-react';

export default function Home() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    setSidebarOpen(false);
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

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSidebarOpen(false);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        workouts={workouts}
        selectedId={selectedId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
            {selectedWorkout
              ? `${selectedWorkout.emoji} ${selectedWorkout.title}`
              : 'Workout Tracker'}
          </span>
          <button
            onClick={handleNew}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          {selectedWorkout ? (
            <WorkoutDetail workout={selectedWorkout} onChange={handleUpdate} />
          ) : (
            <EmptyState onNew={handleNew} />
          )}
        </div>
      </main>
    </div>
  );
}
