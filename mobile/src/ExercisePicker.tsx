import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { ExerciseMaster, PartId } from '../../shared/types';
import { PARTS, SELECTABLE_PARTS } from '../../shared/exercises';
import { Button, Field, Icon, IconButton } from './ui';
import { c } from './theme';

export function PartChips({ value, onChange, parts = SELECTABLE_PARTS }: { value: PartId; onChange: (p: PartId) => void; parts?: typeof PARTS }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {parts.map((p) => {
        const on = p.id === value;
        return (
          <Pressable
            key={p.id}
            onPress={() => onChange(p.id)}
            accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: on ? c.primary : c.borderSoft }}
          >
            <Text style={{ fontSize: 13, color: on ? '#fff' : c.text2 }}>{p.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tap to open a list of the exercise master grouped by body part, with an inline "add new" form. */
export default function ExercisePicker({
  exerciseId,
  name,
  masters,
  onSelect,
  onCreate,
  fontSize = 17,
}: {
  exerciseId?: string;
  name: string;
  masters: ExerciseMaster[];
  onSelect: (m: ExerciseMaster) => void;
  /** Returns the existing entry when the name is already taken, otherwise a new one. */
  onCreate: (name: string, part: PartId) => ExerciseMaster;
  fontSize?: number;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPart, setNewPart] = useState<PartId>('chest');

  const current = masters.find((m) => m.id === exerciseId);
  const label = current?.name ?? (name || '');

  function pick(m: ExerciseMaster) {
    onSelect(m);
    close();
  }
  function close() {
    setOpen(false);
    setAdding(false);
    setNewName('');
  }
  function submit() {
    if (!newName.trim()) return;
    pick(onCreate(newName, newPart));
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="種目を選択"
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }}
      >
        <Text style={{ flexShrink: 1, fontSize, fontWeight: '600', color: label ? c.text : c.muted }} numberOfLines={1}>
          {label || '種目を選択...'}
        </Text>
        <Icon name="chevron-down" size={14} color={c.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: c.borderSoft }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.text, paddingHorizontal: 8 }}>種目を選択</Text>
              <IconButton name="close" onPress={close} label="閉じる" color={c.text2} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
              {adding ? (
                <View style={{ gap: 12, marginBottom: 20 }}>
                  <Field value={newName} onChangeText={setNewName} placeholder="種目名" autoFocus />
                  <PartChips value={newPart} onChange={setNewPart} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button title="追加して選択" onPress={submit} disabled={!newName.trim()} style={{ flex: 1 }} />
                    <Button title="キャンセル" variant="ghost" onPress={() => setAdding(false)} />
                  </View>
                </View>
              ) : (
                <Button title="新しい種目を追加" icon="add" variant="ghost" onPress={() => setAdding(true)} style={{ marginBottom: 20 }} />
              )}

              {PARTS.map((p) => {
                const items = masters.filter((m) => m.part === p.id);
                if (items.length === 0) return null;
                return (
                  <View key={p.id} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: c.muted, marginBottom: 6 }}>{p.label}</Text>
                    {items.map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => pick(m)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: pressed ? c.surface : m.id === exerciseId ? c.borderSoft : c.bg,
                        })}
                      >
                        <Text style={{ flex: 1, fontSize: 15, color: c.text }}>{m.name}</Text>
                        {m.id === exerciseId && <Icon name="checkmark" size={18} color={c.green} />}
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}
