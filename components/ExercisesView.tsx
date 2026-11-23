'use client';

import { useState } from 'react';
import { ExerciseMaster, PartId } from '@/lib/types';
import { PARTS, SELECTABLE_PARTS } from '@/lib/exercises';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  /** Defaults + user-added entries. */
  masters: ExerciseMaster[];
  /** Ids referenced by a workout or plan: these cannot be deleted. */
  usedIds: Set<string>;
  onCreate: (name: string, part: PartId) => Promise<ExerciseMaster>;
  onUpdate: (master: ExerciseMaster) => void;
  onDelete: (id: string) => void;
}

export default function ExercisesView({ masters, usedIds, onCreate, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [part, setPart] = useState<PartId>('chest');

  async function add() {
    if (!name.trim()) return;
    try {
      await onCreate(name, part);
      setName('');
    } catch {
      // the error is shown by the page (notice)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-12 md:py-14">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">種目</h1>
      <p className="text-sm text-gray-500 mb-8">
        記録・計画で選べる種目の一覧です。初期の種目は変更できません。追加した種目は、記録や計画で使われていなければ削除できます。
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-10 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add()}
          placeholder="新しい種目名"
          className="flex-1 min-w-[10rem] text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
        />
        <select
          value={part}
          onChange={(e) => setPart(e.target.value as PartId)}
          className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-2"
        >
          {SELECTABLE_PARTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => void add()}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      {PARTS.map((p) => {
        const items = masters.filter((m) => m.part === p.id);
        if (items.length === 0) return null;
        return (
          <section key={p.id} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              {p.label}
              <span className="ml-2 text-xs font-normal text-gray-400">{items.length}</span>
            </h2>
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {items.map((m) => (
                <Row
                  key={m.id}
                  master={m}
                  masters={masters}
                  used={usedIds.has(m.id)}
                  onUpdate={onUpdate}
                  onDelete={() => onDelete(m.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Row({
  master,
  masters,
  used,
  onUpdate,
  onDelete,
}: {
  master: ExerciseMaster;
  masters: ExerciseMaster[];
  used: boolean;
  onUpdate: (m: ExerciseMaster) => void;
  onDelete: () => void;
}) {
  const isDefault = master.builtIn;
  const [draft, setDraft] = useState(master.name);

  function commitName() {
    const next = draft.trim();
    const taken = masters.some((m) => m.id !== master.id && m.name.trim().toLowerCase() === next.toLowerCase());
    if (!next || taken) {
      setDraft(master.name); // empty or duplicate name: revert
      return;
    }
    if (next !== master.name) onUpdate({ ...master, name: next });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white">
      {isDefault ? (
        <span className="flex-1 text-sm text-gray-800">{master.name}</span>
      ) : (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="flex-1 min-w-0 text-sm text-gray-800 bg-transparent border-none outline-none"
        />
      )}
      {isDefault ? (
        <span className="text-[11px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">初期</span>
      ) : (
        <>
          <select
            value={master.part}
            onChange={(e) => onUpdate({ ...master, part: e.target.value as PartId })}
            className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-1"
          >
            {PARTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={onDelete}
            disabled={used}
            title={used ? '記録・計画で使われているため削除できません' : '削除'}
            className="p-1 rounded text-gray-300 enabled:hover:bg-red-50 enabled:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
