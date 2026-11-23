import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from './db';
import { findByName } from './exercises';
import type { ExerciseMaster, PartId, TrainingPlan, Workout } from './types';

export type SaveStatus = 'saved' | 'saving' | 'error';

const SAVE_DELAY_MS = 1000;

interface Data {
  workouts: Workout[];
  plans: TrainingPlan[];
  exercises: ExerciseMaster[];
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
}

/**
 * The app's data. The server is the source of truth: everything is loaded once, edits update the
 * screen immediately and are saved to the server about a second after the last change
 * (one request per workout / plan). There is no offline mode and no merging.
 */
export function useData() {
  const [data, setData] = useState<Data>({ workouts: [], plans: [], exercises: [] });
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [notice, setNotice] = useState<string | null>(null);

  // Latest data for the save timer (set during render, read later by the timer).
  const dataRef = useRef(data);
  dataRef.current = data;
  const dirty = useRef(new Map<string, 'workout' | 'plan'>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // All writes run one after another, so a delete never overtakes a save.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const enqueue = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(job, job);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [workouts, plans, exercises] = await Promise.all([db.fetchWorkouts(), db.fetchPlans(), db.fetchExercises()]);
      setData({ workouts, plans, exercises });
      setLoadState('ready');
    } catch (e) {
      setNotice(message(e));
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Write everything that changed since the last save. */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (dirty.current.size === 0) return Promise.resolve();
    const batch = Array.from(dirty.current.entries());
    dirty.current.clear();
    return enqueue(async () => {
      try {
        for (const [id, kind] of batch) {
          const cur = dataRef.current;
          if (kind === 'workout') {
            const w = cur.workouts.find((x) => x.id === id);
            if (w) await db.saveWorkout(w);
          } else {
            const p = cur.plans.find((x) => x.id === id);
            if (p) await db.savePlan(p);
          }
        }
        // Edits made while saving put new entries in `dirty` and restarted the timer.
        setSaveStatus(dirty.current.size === 0 ? 'saved' : 'saving');
      } catch (e) {
        batch.forEach(([id, kind]) => dirty.current.set(id, kind));
        setSaveStatus('error');
        setNotice(`保存に失敗しました: ${message(e)}`);
      }
    });
  }, [enqueue]);

  const markDirty = useCallback(
    (kind: 'workout' | 'plan', id: string, immediate = false) => {
      dirty.current.set(id, kind);
      setSaveStatus('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), immediate ? 0 : SAVE_DELAY_MS);
    },
    [flush]
  );

  // Try to save before the tab is hidden or closed (best effort; the browser may cut it short).
  useEffect(() => {
    const onHide = () => void flush();
    const onVisibility = () => document.visibilityState === 'hidden' && onHide();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush]);

  // ---- workouts -----------------------------------------------------------

  const addWorkout = useCallback(
    (w: Workout) => {
      setData((d) => ({ ...d, workouts: [w, ...d.workouts] }));
      markDirty('workout', w.id, true);
    },
    [markDirty]
  );

  const updateWorkout = useCallback(
    (w: Workout) => {
      setData((d) => ({ ...d, workouts: d.workouts.map((x) => (x.id === w.id ? w : x)) }));
      markDirty('workout', w.id);
    },
    [markDirty]
  );

  const removeWorkout = useCallback(
    (id: string) => {
      dirty.current.delete(id);
      setData((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== id) }));
      enqueue(() => db.deleteWorkout(id)).catch((e) => {
        setNotice(`削除に失敗しました: ${message(e)}`);
        void load();
      });
    },
    [enqueue, load]
  );

  // ---- plans --------------------------------------------------------------

  const addPlan = useCallback(
    (p: TrainingPlan) => {
      setData((d) => ({ ...d, plans: [p, ...d.plans] }));
      markDirty('plan', p.id, true);
    },
    [markDirty]
  );

  const updatePlan = useCallback(
    (p: TrainingPlan) => {
      setData((d) => ({ ...d, plans: d.plans.map((x) => (x.id === p.id ? p : x)) }));
      markDirty('plan', p.id);
    },
    [markDirty]
  );

  const removePlan = useCallback(
    (id: string) => {
      dirty.current.delete(id);
      setData((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== id) }));
      enqueue(() => db.deletePlan(id)).catch((e) => {
        setNotice(`削除に失敗しました: ${message(e)}`);
        void load();
      });
    },
    [enqueue, load]
  );

  // ---- exercise master (saved immediately, not debounced) -----------------

  /** Returns the existing entry when the name is already taken, otherwise creates one. */
  const createExercise = useCallback(
    async (name: string, part: PartId): Promise<ExerciseMaster> => {
      const existing = findByName(dataRef.current.exercises, name);
      if (existing) return existing;
      const created = await enqueue(() => db.insertExercise(name, part));
      setData((d) => ({ ...d, exercises: [...d.exercises, created] }));
      return created;
    },
    [enqueue]
  );

  const changeExercise = useCallback(
    async (m: ExerciseMaster) => {
      try {
        await enqueue(() => db.updateExercise(m));
        setData((d) => ({ ...d, exercises: d.exercises.map((x) => (x.id === m.id ? m : x)) }));
      } catch (e) {
        setNotice(`種目を更新できませんでした: ${message(e)}`);
      }
    },
    [enqueue]
  );

  const removeExercise = useCallback(
    async (id: string) => {
      try {
        await enqueue(() => db.deleteExercise(id));
        setData((d) => ({ ...d, exercises: d.exercises.filter((x) => x.id !== id) }));
      } catch (e) {
        const used = (e as { code?: string })?.code === '23503';
        setNotice(used ? '記録・計画で使われている種目は削除できません' : `削除に失敗しました: ${message(e)}`);
      }
    },
    [enqueue]
  );

  return {
    ready: loadState === 'ready',
    loadFailed: loadState === 'error',
    reload: load,
    saveStatus,
    retrySave: flush,
    notice,
    clearNotice: () => setNotice(null),
    ...data,
    addWorkout,
    updateWorkout,
    removeWorkout,
    addPlan,
    updatePlan,
    removePlan,
    createExercise,
    changeExercise,
    removeExercise,
  };
}
