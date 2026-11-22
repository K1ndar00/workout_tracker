import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ExerciseMaster, PartId } from '../../../shared/types';
import { PARTS, isDefaultExercise } from '../../../shared/exercises';
import { Button, Card, confirmDelete, Field, Icon, Pill, Screen } from '../ui';
import { PartChips } from '../ExercisePicker';
import { c } from '../theme';

interface Props {
  /** Defaults + user-added entries. */
  masters: ExerciseMaster[];
  /** Ids referenced by a workout or plan: these cannot be deleted. */
  usedIds: Set<string>;
  onCreate: (name: string, part: PartId) => ExerciseMaster;
  onUpdate: (m: ExerciseMaster) => void;
  onDelete: (id: string) => void;
}

export default function ExercisesScreen({ masters, usedIds, onCreate, onUpdate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [part, setPart] = useState<PartId>('chest');
  const [editingId, setEditingId] = useState<string | null>(null);

  function add() {
    if (!name.trim()) return;
    onCreate(name, part);
    setName('');
  }

  return (
    <Screen title="種目">
      <Text style={{ fontSize: 12, color: c.muted2, marginBottom: 14 }}>
        初期の種目は変更できません。追加した種目は、記録や計画で使われていなければ削除できます。
      </Text>

      <View style={{ gap: 10, marginBottom: 24, padding: 12, backgroundColor: c.surface, borderRadius: 12 }}>
        <Field value={name} onChangeText={setName} placeholder="新しい種目名" onSubmitEditing={add} returnKeyType="done" />
        <PartChips value={part} onChange={setPart} />
        <Button title="追加" icon="add" onPress={add} disabled={!name.trim()} />
      </View>

      {PARTS.map((p) => {
        const items = masters.filter((m) => m.part === p.id);
        if (items.length === 0) return null;
        return (
          <View key={p.id} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.text2, marginBottom: 8 }}>
              {p.label} <Text style={{ fontSize: 11, color: c.muted, fontWeight: '400' }}>{items.length}</Text>
            </Text>
            <Card>
              {items.map((m, i) => (
                <Row
                  key={m.id}
                  master={m}
                  masters={masters}
                  first={i === 0}
                  used={usedIds.has(m.id)}
                  editing={editingId === m.id}
                  onToggle={() => setEditingId(editingId === m.id ? null : m.id)}
                  onUpdate={onUpdate}
                  onDelete={() => confirmDelete('種目', () => onDelete(m.id))}
                />
              ))}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

function Row({
  master,
  masters,
  first,
  used,
  editing,
  onToggle,
  onUpdate,
  onDelete,
}: {
  master: ExerciseMaster;
  masters: ExerciseMaster[];
  first: boolean;
  used: boolean;
  editing: boolean;
  onToggle: () => void;
  onUpdate: (m: ExerciseMaster) => void;
  onDelete: () => void;
}) {
  const isDefault = isDefaultExercise(master.id);
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
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: c.borderSoft }}>
      <Pressable
        onPress={isDefault ? undefined : onToggle}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: pressed && !isDefault ? c.surface : c.bg })}
      >
        <Text style={{ flex: 1, fontSize: 14, color: c.text }}>{master.name}</Text>
        {isDefault ? <Pill text="初期" /> : <Icon name={editing ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />}
      </Pressable>
      {editing && !isDefault && (
        <View style={{ gap: 10, padding: 12, paddingTop: 0 }}>
          <Field value={draft} onChangeText={setDraft} onBlur={commitName} onSubmitEditing={commitName} placeholder="種目名" />
          <PartChips value={master.part} onChange={(part) => onUpdate({ ...master, part })} parts={PARTS} />
          {used ? (
            <Text style={{ fontSize: 12, color: c.muted2 }}>記録・計画で使われているため削除できません。</Text>
          ) : (
            <Button title="この種目を削除" variant="danger" icon="trash-outline" onPress={onDelete} />
          )}
        </View>
      )}
    </View>
  );
}
