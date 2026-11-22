import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { ExerciseMaster, PartId, PlanDay, PlanExercise, TrainingPlan } from '../../../shared/types';
import ExercisePicker from '../ExercisePicker';
import { createPlan, createPlanDay, createPlanExercise } from '../../../shared/utils';
import { Button, Card, confirmDelete, EmojiPicker, EmptyHint, Field, Icon, IconButton, NumField, Screen } from '../ui';
import { c } from '../theme';

const EMOJIS = ['🗓️', '💪', '🏋️', '🤸', '🏃', '🚴', '🔥', '⚡', '🦵', '🦾', '🏆', '🎯'];

interface Props {
  plans: TrainingPlan[];
  setPlans: React.Dispatch<React.SetStateAction<TrainingPlan[]>>;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}

export default function PlansScreen({ plans, setPlans, masters, onCreateMaster }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plans.find((p) => p.id === selectedId) ?? null;

  function create() {
    const p = createPlan();
    setPlans((prev) => [p, ...prev]);
    setSelectedId(p.id);
  }

  if (selected) {
    return (
      <PlanDetail
        plan={selected}
        masters={masters}
        onCreateMaster={onCreateMaster}
        onBack={() => setSelectedId(null)}
        onChange={(u) => setPlans((prev) => prev.map((p) => (p.id === u.id ? u : p)))}
        onDelete={() =>
          confirmDelete('プラン', () => {
            setPlans((prev) => prev.filter((p) => p.id !== selected.id));
            setSelectedId(null);
          })
        }
      />
    );
  }

  return (
    <Screen title="トレーニング計画" right={<IconButton name="add" onPress={create} label="新しいプラン" color={c.text2} size={24} />}>
      {plans.length === 0 && <EmptyHint text="プランがありません" action={<Button title="新しいプランを作成" icon="add" onPress={create} />} />}
      {plans.length > 0 && (
        <Card>
          {plans.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => setSelectedId(p.id)}
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
              <Text style={{ fontSize: 24 }}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }} numberOfLines={1}>
                  {p.name || '無題'}
                </Text>
                <Text style={{ fontSize: 12, color: c.muted }}>
                  週{p.frequency}回 · {p.days.length}デイ{p.isActive ? ' · 実施中' : ''}
                </Text>
              </View>
              {p.isActive && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.green }} />}
              <Icon name="chevron-forward" size={16} color={c.muted} />
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function PlanDetail({
  plan,
  onChange,
  onBack,
  onDelete,
  masters,
  onCreateMaster,
}: {
  plan: TrainingPlan;
  onChange: (p: TrainingPlan) => void;
  onBack: () => void;
  onDelete: () => void;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}) {
  const update = (partial: Partial<TrainingPlan>) => onChange({ ...plan, ...partial });
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Screen
      title={`${plan.emoji} ${plan.name}`}
      onBack={onBack}
      right={<IconButton name="trash-outline" onPress={onDelete} label="削除" color={c.red} />}
    >
      <EmojiPicker emojis={EMOJIS} value={plan.emoji} onPick={(emoji) => update({ emoji })} />
      <TextInput
        value={plan.name}
        onChangeText={(name) => update({ name })}
        placeholder="プラン名"
        placeholderTextColor={c.muted}
        style={{ fontSize: 26, fontWeight: '700', color: c.text, marginBottom: 10 }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Text style={{ fontSize: 14, color: c.muted2 }}>週</Text>
        <IconButton name="remove-circle-outline" label="頻度を減らす" onPress={() => update({ frequency: Math.max(1, plan.frequency - 1) })} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, minWidth: 28, textAlign: 'center' }}>{plan.frequency}回</Text>
        <IconButton name="add-circle-outline" label="頻度を増やす" onPress={() => update({ frequency: Math.min(7, plan.frequency + 1) })} />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => update({ isActive: !plan.isActive })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: plan.isActive ? c.greenBg : c.borderSoft,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: plan.isActive ? c.green : c.muted }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: plan.isActive ? c.greenText : c.muted2 }}>
            {plan.isActive ? '実施中' : 'プランを開始'}
          </Text>
        </Pressable>
      </View>

      <Field
        value={plan.description}
        onChangeText={(description) => update({ description })}
        placeholder="プランの説明・目標を追加..."
        multiline
        style={{ minHeight: 60, textAlignVertical: 'top', marginBottom: 18 }}
      />

      {plan.days.map((day) => (
        <DaySection
          key={day.id}
          day={day}
          open={!closed.has(day.id)}
          onToggle={() => toggle(day.id)}
          masters={masters}
          onCreateMaster={onCreateMaster}
          onChange={(u) => update({ days: plan.days.map((d) => (d.id === u.id ? u : d)) })}
          onDelete={plan.days.length > 1 ? () => confirmDelete('デイ', () => update({ days: plan.days.filter((d) => d.id !== day.id) })) : undefined}
        />
      ))}
      <Button title="デイを追加" icon="add" variant="ghost" onPress={() => update({ days: [...plan.days, createPlanDay(plan.days.length + 1)] })} />
    </Screen>
  );
}

function DaySection({
  day,
  open,
  onToggle,
  onChange,
  onDelete,
  masters,
  onCreateMaster,
}: {
  day: PlanDay;
  open: boolean;
  onToggle: () => void;
  onChange: (d: PlanDay) => void;
  onDelete?: () => void;
  masters: ExerciseMaster[];
  onCreateMaster: (name: string, part: PartId) => ExerciseMaster;
}) {
  const updateEx = (ex: PlanExercise) => onChange({ ...day, exercises: day.exercises.map((e) => (e.id === ex.id ? ex : e)) });
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, paddingLeft: 6, paddingRight: 6 }}>
        <IconButton name={open ? 'chevron-down' : 'chevron-forward'} size={16} label={open ? '閉じる' : '開く'} onPress={onToggle} />
        <TextInput
          value={day.label}
          onChangeText={(label) => onChange({ ...day, label })}
          style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.text, paddingVertical: 10 }}
        />
        <Text style={{ fontSize: 11, color: c.muted, marginRight: 4 }}>{day.exercises.length}種目</Text>
        {onDelete && <IconButton name="trash-outline" size={16} color={c.muted} label="デイを削除" onPress={onDelete} />}
      </View>
      {open && (
        <View>
          {day.exercises.length === 0 && <Text style={{ padding: 14, textAlign: 'center', fontSize: 12, color: c.muted }}>種目がありません</Text>}
          {day.exercises.map((ex) => (
            <View
              key={ex.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.borderSoft }}
            >
              <ExercisePicker
                exerciseId={ex.exerciseId}
                name={ex.name}
                masters={masters}
                onSelect={(m) => updateEx({ ...ex, exerciseId: m.id, name: m.name })}
                onCreate={onCreateMaster}
                fontSize={14}
              />
              <NumField value={ex.sets} onChange={(sets) => updateEx({ ...ex, sets: sets || 1 })} style={{ width: 44, paddingVertical: 4 }} />
              <Text style={{ color: c.muted2 }}>×</Text>
              <TextInput
                value={ex.reps}
                onChangeText={(reps) => updateEx({ ...ex, reps })}
                placeholder="回"
                placeholderTextColor={c.muted}
                style={{ width: 56, textAlign: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingVertical: 4, fontSize: 14, color: c.text }}
              />
              <IconButton
                name="close"
                size={16}
                color={c.muted}
                label="種目を削除"
                onPress={() => onChange({ ...day, exercises: day.exercises.filter((e) => e.id !== ex.id) })}
              />
            </View>
          ))}
          <Pressable
            onPress={() => onChange({ ...day, exercises: [...day.exercises, createPlanExercise()] })}
            style={({ pressed }) => ({ padding: 12, borderTopWidth: 1, borderTopColor: c.borderSoft, backgroundColor: pressed ? c.surface : c.bg })}
          >
            <Text style={{ fontSize: 13, color: c.muted2 }}>＋ 種目を追加</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}
