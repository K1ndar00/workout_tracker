import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { Button, Field, Icon } from '../ui';
import { c } from '../theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  async function submit() {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) setMessage({ kind: 'error', text: error.message });
    else if (mode === 'signup' && !data.session)
      setMessage({ kind: 'info', text: '確認メールを送信しました。メール内のリンクを開いてからログインしてください。' });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: c.bg, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 20, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="barbell" size={18} color="#fff" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>Workout Tracker</Text>
          </View>
          <Text style={{ fontSize: 12, color: c.muted2 }}>
            ログインすると、Web 版とモバイルアプリで同じデータを操作できます。
          </Text>
          <Field
            placeholder="メールアドレス"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <Field
            placeholder="パスワード(6文字以上)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          {message && <Text style={{ fontSize: 12, color: message.kind === 'error' ? c.red : c.greenText }}>{message.text}</Text>}
          <Button
            title={mode === 'signin' ? 'ログイン' : 'アカウント作成'}
            onPress={submit}
            disabled={busy || !email || password.length < 6}
          />
          <Button
            title={mode === 'signin' ? 'アカウントを作成する' : 'ログインに戻る'}
            variant="ghost"
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setMessage(null);
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
