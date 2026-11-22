import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrainingPlan, Workout } from './types';

/** Everything the app stores. Both the web and mobile clients keep exactly this shape. */
export interface AppData {
  workouts: Workout[];
  plans: TrainingPlan[];
}

export type CollectionName = keyof AppData;

export const EMPTY_DATA: AppData = {
  workouts: [],
  plans: [],
};

/** Minimal async key-value store (localStorage on web, AsyncStorage on mobile). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Three-way reconcile
// ---------------------------------------------------------------------------

export interface ReconcileResult<T> {
  /** The merged list to show locally. */
  items: T[];
  /** Local documents that must be written to the server. */
  upserts: T[];
  /** Keys that must be deleted on the server. */
  deletes: string[];
}

/**
 * Merge local state (L), server state (R) and the last state both sides agreed on (S).
 * Comparison is by JSON string, so key order must be stable (it is: documents are only
 * ever produced by our own spread/update code).
 *
 *  - only local, never synced            -> new here, push
 *  - only local, was synced              -> deleted elsewhere, drop (unless edited here: push)
 *  - only remote, was synced             -> deleted here, push the delete
 *  - only remote, never synced           -> new elsewhere, take it
 *  - both, differ, local unchanged vs S  -> remote edited, take remote
 *  - both, differ, local changed vs S    -> local wins (last writer = whoever syncs next)
 */
export function reconcile<T>(
  local: T[],
  remote: T[],
  synced: Record<string, string>,
  keyOf: (item: T) => string
): ReconcileResult<T> {
  const localMap = new Map(local.map((i) => [keyOf(i), i]));
  const remoteMap = new Map(remote.map((i) => [keyOf(i), i]));
  const items = new Map<string, T>();
  const upserts: T[] = [];
  const deletes: string[] = [];

  localMap.forEach((l, key) => {
    const r = remoteMap.get(key);
    const s = synced[key];
    const ls = JSON.stringify(l);
    if (r === undefined) {
      if (s === undefined || ls !== s) {
        items.set(key, l);
        upserts.push(l);
      }
      // else: unchanged here and gone from the server -> deleted elsewhere
      return;
    }
    if (ls === JSON.stringify(r)) {
      items.set(key, l);
    } else if (s !== undefined && ls === s) {
      items.set(key, r);
    } else {
      items.set(key, l);
      upserts.push(l);
    }
  });

  remoteMap.forEach((r, key) => {
    if (localMap.has(key)) return;
    if (synced[key] !== undefined) {
      deletes.push(key); // we deleted it locally; the server still has it
    } else {
      items.set(key, r);
    }
  });

  return { items: Array.from(items.values()), upserts, deletes };
}

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

type DocsByKey = Record<string, string>;
type Snapshot = Record<CollectionName, DocsByKey>;

const COLLECTIONS: CollectionName[] = ['workouts', 'plans'];

const keyOf: { [C in CollectionName]: (item: AppData[C][number]) => string } = {
  workouts: (w) => w.id,
  plans: (p) => p.id,
};

// Newest first, deterministic across devices.
const sorters = {
  workouts: (a: Workout, b: Workout) => b.createdAt.localeCompare(a.createdAt),
  plans: (a: TrainingPlan, b: TrainingPlan) => b.createdAt.localeCompare(a.createdAt),
};

function emptySnapshot(): Snapshot {
  return { workouts: {}, plans: {} };
}

/** A collection as a uniform array of [key, doc] pairs. */
function entries(data: AppData, c: CollectionName): [string, unknown][] {
  const list = data[c] as unknown[];
  return list.map((item) => [keyOf[c](item as never), item]);
}

interface Row {
  collection: CollectionName;
  key: string;
  data: unknown;
}

export class SyncEngine {
  private snapshot: Snapshot = emptySnapshot();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
    private readonly storage: KeyValueStorage
  ) {}

  private get snapshotKey() {
    return `wt:${this.userId}:snapshot`;
  }

  async loadSnapshot(): Promise<void> {
    try {
      const raw = await this.storage.getItem(this.snapshotKey);
      if (raw) this.snapshot = { ...emptySnapshot(), ...(JSON.parse(raw) as Partial<Snapshot>) };
    } catch {
      this.snapshot = emptySnapshot();
    }
  }

  private async saveSnapshot(): Promise<void> {
    try {
      await this.storage.setItem(this.snapshotKey, JSON.stringify(this.snapshot));
    } catch {
      // A lost snapshot only means the next pull treats local data as "new" and re-pushes it.
    }
  }

  /** Serialise all network work so a pull never interleaves with a push. */
  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async fetchRemote(): Promise<AppData> {
    const { data, error } = await this.client
      .from('documents')
      .select('collection, key, data')
      .eq('user_id', this.userId);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    const pick = <T,>(c: CollectionName) => rows.filter((r) => r.collection === c).map((r) => r.data as T);
    return {
      workouts: pick<Workout>('workouts'),
      plans: pick<TrainingPlan>('plans'),
    };
  }

  private async writeOps(ops: { upserts: Row[]; deletes: { collection: CollectionName; key: string }[] }) {
    if (ops.upserts.length > 0) {
      const { error } = await this.client.from('documents').upsert(
        ops.upserts.map((r) => ({ user_id: this.userId, collection: r.collection, key: r.key, data: r.data })),
        { onConflict: 'user_id,collection,key' }
      );
      if (error) throw error;
    }
    for (const d of ops.deletes) {
      const { error } = await this.client
        .from('documents')
        .delete()
        .eq('user_id', this.userId)
        .eq('collection', d.collection)
        .eq('key', d.key);
      if (error) throw error;
    }
  }

  /**
   * Fetch the server state and merge it with `getLocal()`. `getLocal` is read after the
   * fetch and `apply` is called in the same tick, so edits made while fetching are kept
   * and edits made while writing back are not lost (they are diffed by `push` later).
   * Whatever only exists locally is then pushed.
   */
  pull(getLocal: () => AppData, apply: (merged: AppData) => void): Promise<void> {
    return this.enqueue(async () => {
      const remote = await this.fetchRemote();
      const local = getLocal();
      const out: AppData = { ...local };
      const upserts: Row[] = [];
      const deletes: { collection: CollectionName; key: string }[] = [];

      for (const c of COLLECTIONS) {
        const res = reconcile<never>(local[c] as never[], remote[c] as never[], this.snapshot[c], keyOf[c] as never);
        (out[c] as unknown[]) = (res.items as unknown[]).slice().sort(sorters[c] as never);
        res.upserts.forEach((item) => upserts.push({ collection: c, key: keyOf[c](item as never), data: item }));
        res.deletes.forEach((key) => deletes.push({ collection: c, key }));
      }

      apply(out);
      await this.writeOps({ upserts, deletes });

      // Everything now matches the server, so the merged state is the new agreed snapshot.
      const snap = emptySnapshot();
      for (const c of COLLECTIONS) {
        for (const [key, doc] of entries(out, c)) snap[c][key] = JSON.stringify(doc);
      }
      this.snapshot = snap;
      await this.saveSnapshot();
    });
  }

  /** Push only what differs from the last agreed snapshot. */
  push(data: AppData): Promise<void> {
    return this.enqueue(async () => {
      const upserts: Row[] = [];
      const deletes: { collection: CollectionName; key: string }[] = [];
      const next = emptySnapshot();

      for (const c of COLLECTIONS) {
        const seen = new Set<string>();
        for (const [key, doc] of entries(data, c)) {
          const json = JSON.stringify(doc);
          seen.add(key);
          next[c][key] = json;
          if (this.snapshot[c][key] !== json) upserts.push({ collection: c, key, data: doc });
        }
        for (const key of Object.keys(this.snapshot[c])) {
          if (!seen.has(key)) deletes.push({ collection: c, key });
        }
      }

      if (upserts.length === 0 && deletes.length === 0) return;
      await this.writeOps({ upserts, deletes });
      this.snapshot = next;
      await this.saveSnapshot();
    });
  }
}
