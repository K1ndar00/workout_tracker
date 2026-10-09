import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppData, DEFAULT_SETTINGS, EMPTY_DATA, KeyValueStorage, SyncEngine } from './sync';
import type { DailyNutrition, NutritionSettings, TrainingPlan, Workout } from './types';

/** local = no backend configured; the rest describe the Supabase sync. */
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface Options {
  /** null runs the app local-only (no account, no sync). */
  client: SupabaseClient | null;
  userId: string | null;
  storage: KeyValueStorage;
}

const PUSH_DELAY_MS = 700;
const RETRY_DELAY_MS = 10_000;
const REALTIME_DEBOUNCE_MS = 400;

function parseData(raw: string | null): AppData {
  if (!raw) return EMPTY_DATA;
  try {
    const p = JSON.parse(raw) as Partial<AppData>;
    return {
      workouts: p.workouts ?? [],
      plans: p.plans ?? [],
      nutrition: p.nutrition ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
    };
  } catch {
    return EMPTY_DATA;
  }
}

/**
 * Single source of truth for app data on both web and mobile: a local cache (works
 * offline) that is reconciled with Supabase and kept live through realtime events.
 * Setters behave like useState setters but update synchronously, so the sync layer
 * can never read stale state.
 */
export function useAppData({ client, userId, storage }: Options) {
  const scope = client && userId ? userId : 'local';
  const dataKey = `wt:${scope}:data`;

  const dataRef = useRef<AppData>(EMPTY_DATA);
  const engineRef = useRef<SyncEngine | null>(null);
  const pulledRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setVersion] = useState(0);
  const [readyScope, setReadyScope] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>(client ? 'syncing' : 'local');
  const [lastError, setLastError] = useState<string | null>(null);
  const loadedScope = useRef<string | null>(null);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setVersion((v) => v + 1);
  }, []);

  const fail = useCallback((e: unknown) => {
    setStatus('error');
    setLastError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e));
  }, []);

  const pushNow = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !pulledRef.current) return;
    try {
      await engine.push(dataRef.current);
      if (engineRef.current === engine) {
        setStatus('synced');
        setLastError(null);
      }
    } catch (e) {
      if (engineRef.current !== engine) return;
      fail(e);
      schedulePush(RETRY_DELAY_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fail]);

  const schedulePush = useCallback(
    (delay: number) => {
      if (!engineRef.current) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      setStatus((s) => (s === 'error' ? s : 'syncing'));
      pushTimer.current = setTimeout(() => void pushNow(), delay);
    },
    [pushNow]
  );

  /** Pull from the server and merge. Safe to call at any time (queued behind pushes). */
  const sync = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setStatus('syncing');
    try {
      await engine.pull(
        () => dataRef.current,
        (merged) => {
          if (engineRef.current === engine) commit(merged);
        }
      );
      if (engineRef.current !== engine) return;
      pulledRef.current = true;
      setStatus('synced');
      setLastError(null);
    } catch (e) {
      if (engineRef.current === engine) fail(e);
    }
  }, [commit, fail]);

  // (Re)load the local cache whenever the account changes, then pull.
  useEffect(() => {
    let cancelled = false;
    loadedScope.current = null;
    pulledRef.current = false;
    engineRef.current = null;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    setReadyScope(null);
    setStatus(client ? 'syncing' : 'local');

    (async () => {
      const raw = await storage.getItem(dataKey).catch(() => null);
      if (cancelled) return;
      commit(parseData(raw));
      loadedScope.current = scope;
      if (client && userId) {
        const engine = new SyncEngine(client, userId, storage);
        await engine.loadSnapshot();
        if (cancelled) return;
        engineRef.current = engine;
      }
      setReadyScope(scope);
      if (engineRef.current) void sync();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, userId]);

  // Persist the cache and queue a push after every change.
  const lastPersisted = useRef<AppData | null>(null);
  useEffect(() => {
    if (loadedScope.current !== scope) return;
    if (lastPersisted.current === dataRef.current) return;
    lastPersisted.current = dataRef.current;
    storage.setItem(dataKey, JSON.stringify(dataRef.current)).catch(() => undefined);
    if (pulledRef.current) schedulePush(PUSH_DELAY_MS);
  });

  // Other devices' changes arrive as realtime events; re-pull (debounced).
  useEffect(() => {
    if (!client || !userId || readyScope !== scope) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = client
      .channel(`documents:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `user_id=eq.${userId}` },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void sync(), REALTIME_DEBOUNCE_MS);
        }
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, [client, userId, readyScope, scope, sync]);

  useEffect(
    () => () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    },
    []
  );

  const setters = useMemo(() => {
    const make =
      <K extends keyof AppData>(key: K): Dispatch<SetStateAction<AppData[K]>> =>
      (update) => {
        const cur = dataRef.current;
        const next =
          typeof update === 'function' ? (update as (prev: AppData[K]) => AppData[K])(cur[key]) : update;
        commit({ ...cur, [key]: next });
      };
    return {
      setWorkouts: make('workouts') as Dispatch<SetStateAction<Workout[]>>,
      setPlans: make('plans') as Dispatch<SetStateAction<TrainingPlan[]>>,
      setNutrition: make('nutrition') as Dispatch<SetStateAction<DailyNutrition[]>>,
      setSettings: make('settings') as Dispatch<SetStateAction<NutritionSettings>>,
    };
  }, [commit]);

  const d = dataRef.current;
  return {
    ready: readyScope === scope,
    status,
    lastError,
    sync,
    workouts: d.workouts,
    plans: d.plans,
    nutrition: d.nutrition,
    settings: d.settings,
    ...setters,
  };
}
