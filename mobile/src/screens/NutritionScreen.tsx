import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { DailyNutrition, FoodItem, NutritionMeal, NutritionSettings } from '../../../shared/types';
import { addDays, createFoodItem, createMeal, createNutritionDay, formatDayLabel, today } from '../../../shared/utils';
import { Bar, Button, Card, confirmDelete, Field, IconButton, NumField, Pill, Screen } from '../ui';
import { c } from '../theme';

interface Props {
  logs: DailyNutrition[];
  setLogs: React.Dispatch<React.SetStateAction<DailyNutrition[]>>;
  settings: NutritionSettings;
  setSettings: React.Dispatch<React.SetStateAction<NutritionSettings>>;
}

export default function NutritionScreen({ logs, setLogs, settings, setSettings }: Props) {
  const [date, setDate] = useState(today());
  const [showSettings, setShowSettings] = useState(false);
  const [addingMeal, setAddingMeal] = useState<string | null>(null);

  const stored = logs.find((l) => l.date === date);
  // An unsaved empty day keeps one stable id until the first edit stores it.
  const fresh = useMemo(() => createNutritionDay(date), [date]);
  const log = stored ?? fresh;

  const save = (next: DailyNutrition) =>
    setLogs((prev) => (prev.some((l) => l.date === next.date) ? prev.map((l) => (l.date === next.date ? next : l)) : [next, ...prev]));
  const update = (partial: Partial<DailyNutrition>) => save({ ...log, ...partial });

  const foods = log.meals.flatMap((m) => m.foods);
  const total = {
    kcal: foods.reduce((a, f) => a + f.calories, 0),
    p: foods.reduce((a, f) => a + f.protein, 0),
    c: foods.reduce((a, f) => a + f.carbs, 0),
    f: foods.reduce((a, f) => a + f.fat, 0),
  };
  const over = total.kcal > settings.targetCalories;
  const pct = (total.kcal / Math.max(settings.targetCalories, 1)) * 100;

  return (
    <Screen
      title="栄養管理"
      right={<IconButton name="settings-outline" label="目標設定" onPress={() => setShowSettings(!showSettings)} color={showSettings ? c.text : c.muted2} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
        <IconButton name="chevron-back" label="前の日" onPress={() => setDate(addDays(date, -1))} />
        <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, minWidth: 120, textAlign: 'center' }}>{formatDayLabel(date)}</Text>
        <IconButton name="chevron-forward" label="次の日" onPress={() => setDate(addDays(date, 1))} />
      </View>

      {showSettings && (
        <Card style={{ padding: 14, marginBottom: 16, backgroundColor: c.surface }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text2, marginBottom: 10 }}>目標設定</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(
              [
                ['targetCalories', 'カロリー', 'kcal'],
                ['targetProtein', 'タンパク質', 'g'],
                ['targetCarbs', '炭水化物', 'g'],
                ['targetFat', '脂質', 'g'],
              ] as const
            ).map(([key, label, unit]) => (
              <View key={key} style={{ width: '47%' }}>
                <Text style={{ fontSize: 11, color: c.muted2, marginBottom: 4 }}>{label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <NumField value={settings[key]} onChange={(n) => setSettings({ ...settings, [key]: n })} style={{ flex: 1 }} />
                  <Text style={{ fontSize: 11, color: c.muted }}>{unit}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card style={{ padding: 14, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: over ? c.red : c.text }}>{total.kcal.toLocaleString()}</Text>
            <Text style={{ fontSize: 13, color: c.muted }}> / {settings.targetCalories.toLocaleString()} kcal</Text>
          </Text>
          <Pill
            tone={over ? 'red' : pct >= 80 ? 'green' : 'gray'}
            text={over ? `+${(total.kcal - settings.targetCalories).toLocaleString()} kcal` : `残り ${(settings.targetCalories - total.kcal).toLocaleString()} kcal`}
          />
        </View>
        <Bar pct={pct} color={over ? '#f87171' : c.blue} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          {[
            ['P タンパク質', total.p, settings.targetProtein, c.blue],
            ['C 炭水化物', total.c, settings.targetCarbs, c.amber],
            ['F 脂質', total.f, settings.targetFat, c.pink],
          ].map(([label, value, target, color]) => (
            <View key={label as string} style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: c.muted2 }} numberOfLines={1}>{label as string}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.text2, marginBottom: 4 }}>
                {value as number}
                <Text style={{ fontWeight: '400', color: c.muted }}>/{target as number}g</Text>
              </Text>
              <Bar pct={((value as number) / Math.max(target as number, 1)) * 100} color={color as string} height={6} />
            </View>
          ))}
        </View>
      </Card>

      {log.meals.map((meal) => (
        <MealSection
          key={meal.id}
          meal={meal}
          adding={addingMeal === meal.id}
          onStartAdd={() => setAddingMeal(meal.id)}
          onStopAdd={() => setAddingMeal(null)}
          onChange={(m) => update({ meals: log.meals.map((x) => (x.id === m.id ? m : x)) })}
          onDelete={log.meals.length > 1 ? () => confirmDelete('食事', () => update({ meals: log.meals.filter((x) => x.id !== meal.id) })) : undefined}
        />
      ))}
      <Button title="食事を追加" icon="add" variant="ghost" onPress={() => update({ meals: [...log.meals, createMeal('その他')] })} />
    </Screen>
  );
}

function MealSection({
  meal,
  adding,
  onStartAdd,
  onStopAdd,
  onChange,
  onDelete,
}: {
  meal: NutritionMeal;
  adding: boolean;
  onStartAdd: () => void;
  onStopAdd: () => void;
  onChange: (m: NutritionMeal) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<FoodItem>(() => createFoodItem());
  const kcal = meal.foods.reduce((a, f) => a + f.calories, 0);

  function submit() {
    if (!draft.name.trim()) return;
    onChange({ ...meal, foods: [...meal.foods, draft] });
    setDraft(createFoodItem());
    onStopAdd();
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, paddingLeft: 14, paddingRight: 6 }}>
        <TextInput
          value={meal.name}
          onChangeText={(name) => onChange({ ...meal, name })}
          style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.text, paddingVertical: 10 }}
        />
        {kcal > 0 && <Text style={{ fontSize: 11, color: c.muted, marginRight: 4 }}>{kcal}kcal</Text>}
        {onDelete && <IconButton name="trash-outline" size={16} color={c.muted} label="食事を削除" onPress={onDelete} />}
      </View>

      {meal.foods.map((food) => (
        <View key={food.id} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.borderSoft }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: c.text }}>
              {food.name}
              {food.amount ? <Text style={{ fontSize: 12, color: c.muted }}>  {food.amount}</Text> : null}
            </Text>
            <Text style={{ fontSize: 11, marginTop: 2 }}>
              {food.protein > 0 && <Text style={{ color: c.blue }}>P{food.protein}g  </Text>}
              {food.carbs > 0 && <Text style={{ color: c.amber }}>C{food.carbs}g  </Text>}
              {food.fat > 0 && <Text style={{ color: c.pink }}>F{food.fat}g  </Text>}
              <Text style={{ color: c.text2, fontWeight: '600' }}>{food.calories}kcal</Text>
            </Text>
          </View>
          <IconButton name="close" size={16} color={c.muted} label="食品を削除" onPress={() => onChange({ ...meal, foods: meal.foods.filter((f) => f.id !== food.id) })} />
        </View>
      ))}

      {adding ? (
        <View style={{ padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: c.borderSoft }}>
          <Field autoFocus value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="食品名 *" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field style={{ flex: 1 }} value={draft.amount} onChangeText={(amount) => setDraft({ ...draft, amount })} placeholder="量 (例: 100g)" />
            <NumField style={{ flex: 1 }} value={draft.calories} onChange={(calories) => setDraft({ ...draft, calories })} placeholder="kcal" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <NumField decimal style={{ flex: 1 }} value={draft.protein} onChange={(protein) => setDraft({ ...draft, protein })} placeholder="P(g)" />
            <NumField decimal style={{ flex: 1 }} value={draft.carbs} onChange={(carbs) => setDraft({ ...draft, carbs })} placeholder="C(g)" />
            <NumField decimal style={{ flex: 1 }} value={draft.fat} onChange={(fat) => setDraft({ ...draft, fat })} placeholder="F(g)" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="追加" onPress={submit} disabled={!draft.name.trim()} style={{ flex: 1 }} />
            <Button title="キャンセル" variant="ghost" onPress={onStopAdd} />
          </View>
        </View>
      ) : (
        <Button title="食品を追加" icon="add" variant="ghost" onPress={onStartAdd} style={{ borderRadius: 0 }} />
      )}
    </Card>
  );
}
