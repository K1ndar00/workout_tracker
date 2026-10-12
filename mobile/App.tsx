import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { useAppData } from '../shared/useAppData';
import { supabase } from './src/supabase';
import { nativeStorage } from './src/storage';
import { c } from './src/theme';
import { Icon, IconName } from './src/ui';
import AuthScreen from './src/screens/AuthScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import PlansScreen from './src/screens/PlansScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import AccountScreen from './src/screens/AccountScreen';

type Tab = 'workouts' | 'plans' | 'nutrition' | 'progress' | 'account';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'workouts', label: '記録', icon: 'barbell-outline' },
  { id: 'plans', label: '計画', icon: 'clipboard-outline' },
  { id: 'nutrition', label: '栄養', icon: 'restaurant-outline' },
  { id: 'progress', label: '進捗', icon: 'trending-up-outline' },
  { id: 'account', label: '設定', icon: 'person-circle-outline' },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    // Token auto-refresh only while the app is in the foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase!.auth.startAutoRefresh();
      else void supabase!.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  let body;
  if (checking) body = <Loading />;
  else if (supabase && !session) body = <AuthScreen />;
  else body = <Main key={session?.user.id ?? 'local'} userId={session?.user.id ?? null} email={session?.user.email ?? null} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {body}
    </SafeAreaProvider>
  );
}

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}

function Main({ userId, email }: { userId: string | null; email: string | null }) {
  const d = useAppData({ client: supabase, userId, storage: nativeStorage });
  const [tab, setTab] = useState<Tab>('workouts');

  // Pull when the app returns to the foreground.
  useEffect(() => {
    if (!supabase) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void d.sync();
    });
    return () => sub.remove();
  }, [d.sync]);

  if (!d.ready) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        {tab === 'workouts' && <WorkoutsScreen workouts={d.workouts} setWorkouts={d.setWorkouts} />}
        {tab === 'plans' && <PlansScreen plans={d.plans} setPlans={d.setPlans} />}
        {tab === 'nutrition' && (
          <NutritionScreen logs={d.nutrition} setLogs={d.setNutrition} settings={d.settings} setSettings={d.setSettings} />
        )}
        {tab === 'progress' && <ProgressScreen workouts={d.workouts} logs={d.nutrition} settings={d.settings} />}
        {tab === 'account' && (
          <AccountScreen
            email={email}
            status={d.status}
            error={d.lastError}
            onSync={() => void d.sync()}
            onSignOut={() => void supabase?.auth.signOut()}
          />
        )}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 }}
            >
              <Icon name={t.icon} size={22} color={active ? c.text : c.muted} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: active ? c.text : c.muted }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
