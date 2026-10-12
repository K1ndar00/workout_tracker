import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { DailyNutrition, NutritionSettings, Workout } from '../../../shared/types';
import { computeProgress } from '../../../shared/stats';
import { isToday } from '../../../shared/utils';
import { Bar, Card, Screen } from '../ui';
import { c } from '../theme';

interface Props {
  workouts: Workout[];
  logs: DailyNutrition[];
  settings: NutritionSettings;
}

export default function ProgressScreen({ workouts, logs, settings }: Props) {
  const stats = useMemo(() => computeProgress(workouts, logs, settings), [workouts, logs, settings]);

  return (
    <Screen title="進捗">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 }}>
        {[
          ['今週', stats.thisWeekCount, '回'],
          ['今月', stats.thisMonthCount, '回'],
          ['累計', workouts.length, '回'],
          ['種目数', stats.exerciseCount, '種目'],
        ].map(([label, value, unit]) => (
          <View key={label as string} style={{ width: '48%', backgroundColor: c.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.borderSoft }}>
            <Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: c.text }}>{value as number}</Text>
              <Text style={{ fontSize: 12, color: c.muted }}> {unit as string}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: c.muted2, marginTop: 2 }}>{label as string}</Text>
          </View>
        ))}
      </View>

      <Text style={h2}>週別トレーニング頻度(過去8週)</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, backgroundColor: c.surface, borderRadius: 12, padding: 12, marginBottom: 26 }}>
        {stats.weekCounts.map((w, i) => (
          <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
            {w.count > 0 && <Text style={{ fontSize: 10, color: c.muted2 }}>{w.count}</Text>}
            <View
              style={{
                width: '100%',
                height: `${(w.count / stats.maxWeekCount) * 70}%`,
                minHeight: w.count > 0 ? 4 : 2,
                backgroundColor: w.count > 0 ? c.blue : '#e5e7eb',
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5,
              }}
            />
            <Text style={{ fontSize: 9, color: c.muted }} numberOfLines={1}>{w.label}</Text>
          </View>
        ))}
      </View>

      {stats.prs.length > 0 && (
        <>
          <Text style={h2}>種目別最大重量</Text>
          <Card style={{ marginBottom: 26 }}>
            {stats.prs.map(([name, weight], i) => (
              <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.borderSoft }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: c.text }} numberOfLines={1}>{name}</Text>
                <View style={{ width: 70 }}>
                  <Bar pct={(weight / (stats.prs[0]?.[1] ?? 1)) * 100} height={6} />
                </View>
                <Text style={{ width: 60, textAlign: 'right', fontSize: 14, fontWeight: '700', color: c.text2 }}>{weight} kg</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <Text style={h2}>カロリー推移(過去7日)</Text>
      <Card>
        {stats.calTrend.map((d, i) => {
          const over = d.kcal > settings.targetCalories && d.kcal > 0;
          return (
            <View key={d.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.borderSoft, backgroundColor: isToday(d.date) ? '#eff6ff' : c.bg }}>
              <Text style={{ width: 26, fontSize: 12, color: c.muted2 }}>{d.label}</Text>
              <View style={{ flex: 1 }}>
                <Bar pct={d.kcal > 0 ? (d.kcal / Math.max(stats.maxKcal, 1)) * 100 : 0} color={over ? '#f87171' : c.green} />
              </View>
              <Text style={{ width: 84, textAlign: 'right', fontSize: 12, fontWeight: '500', color: d.kcal === 0 ? '#d1d5db' : over ? c.red : c.text2 }}>
                {d.kcal === 0 ? '未記録' : `${d.kcal.toLocaleString()} kcal`}
              </Text>
            </View>
          );
        })}
      </Card>
      <Text style={{ fontSize: 11, color: c.muted, textAlign: 'right', marginTop: 6 }}>目標: {settings.targetCalories.toLocaleString()} kcal</Text>
    </Screen>
  );
}

const h2 = { fontSize: 13, fontWeight: '600' as const, color: c.text2, marginBottom: 10 };
