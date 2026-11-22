import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Exercise, ExerciseMaster, PartId, Workout, WorkoutSet } from '../../../shared/types';
import ExercisePicker from '../ExercisePicker';
import { addDays, createExercise, createSet, createWorkout, formatDate, formatMonthKey } from '../../../shared/utils';
import { Button, Card, confirmDelete, EmojiPicker, EmptyHint, Field, Icon, IconButton, NumField, Pill, Screen } from '../ui';
import { c } from '../theme';

const EMOJIS = ['🏋️', '💪', '🤸', '🏃', '🚴', '🧘', '⚽', '🏊', '🥊', '🎯', '🔥', '⚡', '🦵', '🦾', '🏆', '🎽'];

interface Props {
  workouts: Workout[];
  setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}

export default function WorkoutsScreen({ workouts, setWorkouts, masters, onCreateMaster }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = workouts.find((w) => w.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    const groups = new Map<string, Workout[]>();
    for (const w of workouts) {
      const key = w.date.substring(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), w]);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [workouts]);

  function create() {
    const w = createWorkout();
    setWorkouts((prev) => [w, ...prev]);
    setSelectedId(w.id);
  }

  if (selected) {
    return (
      <WorkoutDetail
        workout={selected}
        masters={masters}
        onCreateMaster={onCreateMaster}
        onBack={() => setSelectedId(null)}
        onChange={(updated) => setWorkouts((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))}
        onDelete={() =>
          confirmDelete('ワークアウト', () => {
            setWorkouts((prev) => prev.filter((w) => w.id !== selected.id));
            setSelectedId(null);
          })
        }
      />
    );
  }

  return (
    <Screen title="ワークアウト記録" right={<IconButton name="add" onPress={create} label="新しいワークアウト" color={c.text2} size={24} />}>
      {workouts.length === 0 && (
        <EmptyHint text="ワークアウトがありません" action={<Button title="最初のワークアウトを作成" icon="add" onPress={create} />} />
      )}
      {grouped.map(([month, list]) => (
        <View key={month} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.muted, marginBottom: 6 }}>{formatMonthKey(month)}</Text>
          <Card>
            {list.map((w, i) => (
              <Pressable
                key={w.id}
                onPress={() => setSelectedId(w.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: c.borderSoft,
                  backgroundColor: pressed ? c.surface : c.bg,
                })}
              >
                <Text style={{ fontSize: 24 }}>{w.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }} numberOfLines={1}>
                    {w.title || '無題'}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.muted }}>
                    {formatDate(w.date)} · {w.exercises.length}種目
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color={c.muted} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

function WorkoutDetail({
  workout,
  onChange,
  onBack,
  onDelete,
  masters,
  onCreateMaster,
}: {
  workout: Workout;
  onChange: (w: Workout) => void;
  onBack: () => void;
  onDelete: () => void;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}) {
  const update = (partial: Partial<Workout>) => onChange({ ...workout, ...partial });
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = workout.exercises.reduce((a, e) => a + e.sets.filter((x) => x.completed).length, 0);
  const volume = workout.exercises.reduce(
    (a, e) => a + e.sets.filter((x) => x.completed).reduce((v, x) => v + x.weight * x.reps, 0),
    0
  );

  return (
    <Screen
      title={`${workout.emoji} ${workout.title}`}
      onBack={onBack}
      right={<IconButton name="trash-outline" onPress={onDelete} label="削除" color={c.red} />}
    >
      <EmojiPicker emojis={EMOJIS} value={workout.emoji} onPick={(emoji) => update({ emoji })} />
      <TextInput
        value={workout.title}
        onChangeText={(title) => update({ title })}
        placeholder="ワークアウト名"
        placeholderTextColor={c.muted}
        style={{ fontSize: 26, fontWeight: '700', color: c.text, marginBottom: 10 }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        <IconButton name="chevron-back" size={16} label="前の日" onPress={() => update({ date: addDays(workout.date, -1) })} />
        <Icon name="calendar-outline" size={16} color={c.muted} />
        <Text style={{ fontSize: 14, color: c.text2, marginHorizontal: 4 }}>{workout.date}</Text>
        <IconButton name="chevron-forward" size={16} label="次の日" onPress={() => update({ date: addDays(workout.date, 1) })} />
      </View>

      {totalSets > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <Pill text={`${doneSets}/${totalSets} セット完了`} tone={doneSets === totalSets ? 'green' : 'gray'} />
          {volume > 0 && <Pill text={`総ボリューム ${volume.toLocaleString()} kg`} tone="blue" />}
        </View>
      )}

      {workout.exercises.length === 0 && <EmptyHint text="エクササイズがまだありません" />}
      {workout.exercises.map((ex) => (
        <ExerciseBlock
          key={ex.id}
          exercise={ex}
          onChange={(updated) => update({ exercises: workout.exercises.map((e) => (e.id === updated.id ? updated : e)) })}
          onDelete={() => update({ exercises: workout.exercises.filter((e) => e.id !== ex.id) })}
          masters={masters}
          onCreateMaster={onCreateMaster}
        />
      ))}
      <Button
        title="エクササイズを追加"
        icon="add"
        variant="ghost"
        onPress={() => update({ exercises: [...workout.exercises, createExercise()] })}
      />

      <Text style={{ fontSize: 12, fontWeight: '600', color: c.muted, marginTop: 28, marginBottom: 8 }}>メモ</Text>
      <Field
        value={workout.notes}
        onChangeText={(notes) => update({ notes })}
        placeholder="ワークアウトに関するメモを追加..."
        multiline
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />
    </Screen>
  );
}

function ExerciseBlock({
  exercise,
  onChange,
  onDelete,
  masters,
  onCreateMaster,
}: {
  exercise: Exercise;
  onChange: (e: Exercise) => void;
  onDelete: () => void;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}) {
  const updateSet = (u: WorkoutSet) => onChange({ ...exercise, sets: exercise.sets.map((x) => (x.id === u.id ? u : x)) });
  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    onChange({ ...exercise, sets: [...exercise.sets, createSet({ weight: last?.weight, reps: last?.reps, unit: last?.unit })] });
  };
  const done = exercise.sets.filter((x) => x.completed);
  const volume = done.reduce((a, x) => a + x.weight * x.reps, 0);

  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <ExercisePicker
          exerciseId={exercise.exerciseId}
          name={exercise.name}
          masters={masters}
          onSelect={(m) => onChange({ ...exercise, exerciseId: m.id, name: m.name })}
          onCreate={onCreateMaster}
        />
        {done.length > 0 && (
          <Text style={{ fontSize: 11, color: c.muted, marginRight: 4 }}>
            {done.length}/{exercise.sets.length}セット{volume > 0 ? ` · ${volume.toLocaleString()}kg` : ''}
          </Text>
        )}
        <IconButton name="trash-outline" size={18} color={c.muted} label="エクササイズを削除" onPress={() => confirmDelete('エクササイズ', onDelete)} />
      </View>

      <Card>
        <View style={{ flexDirection: 'row', backgroundColor: c.surface, paddingVertical: 6, paddingHorizontal: 8 }}>
          <Text style={[head, { width: 36 }]}>セット</Text>
          <Text style={[head, { flex: 1 }]}>重量 (kg)</Text>
          <Text style={[head, { flex: 1 }]}>回数</Text>
          <Text style={[head, { width: 44 }]}>完了</Text>
          <View style={{ width: 32 }} />
        </View>
        {exercise.sets.map((set, i) => (
          <View
            key={set.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: set.completed ? '#ecfdf5' : c.bg,
              borderTopWidth: 1,
              borderTopColor: c.borderSoft,
            }}
          >
            <Text style={{ width: 36, textAlign: 'center', fontSize: 12, fontWeight: '700', color: set.completed ? c.greenText : c.muted }}>
              {i + 1}
            </Text>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <NumField plain decimal value={set.weight} onChange={(weight) => updateSet({ ...set, weight })} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <NumField plain value={set.reps} onChange={(reps) => updateSet({ ...set, reps })} />
            </View>
            <Pressable
              onPress={() => updateSet({ ...set, completed: !set.completed })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: set.completed }}
              accessibilityLabel={`セット${i + 1}を完了`}
              hitSlop={8}
              style={{ width: 44, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: set.completed ? c.green : '#d1d5db',
                  backgroundColor: set.completed ? c.green : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {set.completed && <Icon name="checkmark" size={16} color="#fff" />}
              </View>
            </Pressable>
            <View style={{ width: 32, alignItems: 'center' }}>
              {exercise.sets.length > 1 && (
                <IconButton
                  name="close"
                  size={16}
                  color={c.muted}
                  label="セットを削除"
                  onPress={() => onChange({ ...exercise, sets: exercise.sets.filter((x) => x.id !== set.id) })}
                />
              )}
            </View>
          </View>
        ))}
        <Pressable
          onPress={addSet}
          style={({ pressed }) => ({
            paddingVertical: 10,
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: c.borderSoft,
            backgroundColor: pressed ? c.surface : c.bg,
          })}
        >
          <Text style={{ fontSize: 13, color: c.muted2 }}>＋ セットを追加</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const head = { fontSize: 11, fontWeight: '600' as const, color: c.muted, textAlign: 'center' as const };
