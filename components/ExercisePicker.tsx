'use client';

import { forwardRef, useState } from 'react';
import { ExerciseMaster, PartId } from '@/shared/types';
import { PARTS, SELECTABLE_PARTS } from '@/shared/exercises';

const NEW_VALUE = '__new__';

interface Props {
  exerciseId?: string;
  /** Name saved with the record; shown only when the master entry cannot be found. */
  name: string;
  /** Defaults + user-added entries. */
  masters: ExerciseMaster[];
  onSelect: (master: ExerciseMaster) => void;
  /** Returns the existing entry when the name is already taken, otherwise a new one. */
  onCreate: (name: string, part: PartId) => ExerciseMaster;
  selectClassName?: string;
}

/** Dropdown of the exercise master (grouped by body part) with an inline "add new" form. */
const ExercisePicker = forwardRef<HTMLSelectElement, Props>(function ExercisePicker(
  { exerciseId, name, masters, onSelect, onCreate, selectClassName },
  ref
) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPart, setNewPart] = useState<PartId>('chest');

  const known = masters.some((m) => m.id === exerciseId);

  function submit() {
    if (!newName.trim()) return;
    onSelect(onCreate(newName, newPart));
    setNewName('');
    setAdding(false);
  }

  return (
    <div className="flex-1 min-w-0">
      <select
        ref={ref}
        value={known ? exerciseId : exerciseId ?? ''}
        onChange={(e) => {
          if (e.target.value === NEW_VALUE) {
            setAdding(true);
            return;
          }
          const m = masters.find((x) => x.id === e.target.value);
          if (m) onSelect(m);
        }}
        className={
          selectClassName ??
          'w-full text-base font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer'
        }
      >
        {!exerciseId && <option value="">種目を選択...</option>}
        {exerciseId && !known && <option value={exerciseId}>{name}</option>}
        {PARTS.map((p) => {
          const items = masters.filter((m) => m.part === p.id);
          if (items.length === 0) return null;
          return (
            <optgroup key={p.id} label={p.label}>
              {items.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          );
        })}
        <option value={NEW_VALUE}>＋ 新しい種目を追加...</option>
      </select>

      {adding && (
        <div className="flex flex-wrap items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="種目名"
            className="flex-1 min-w-[8rem] text-sm bg-white border border-gray-200 rounded px-2 py-1 outline-none"
          />
          <select
            value={newPart}
            onChange={(e) => setNewPart(e.target.value as PartId)}
            className="text-sm bg-white border border-gray-200 rounded px-2 py-1"
          >
            {SELECTABLE_PARTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={submit}
            disabled={!newName.trim()}
            className="text-sm px-3 py-1 rounded bg-gray-900 text-white disabled:opacity-40"
          >
            追加
          </button>
          <button onClick={() => setAdding(false)} className="text-sm px-2 py-1 text-gray-500 hover:text-gray-700">
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
});

export default ExercisePicker;
