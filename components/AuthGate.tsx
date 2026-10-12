'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Dumbbell } from 'lucide-react';

/** Shows the login form until a Supabase session exists, then renders children with the user id. */
export default function AuthGate({
  children,
}: {
  children: (userId: string | null, signOut: () => void) => React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Not configured -> local-only mode.
  if (!supabase) return <>{children(null, () => {})}</>;
  if (checking) return null;
  if (!session) return <LoginForm />;
  return <>{children(session.user.id, () => void supabase!.auth.signOut())}</>;
}

function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setMessage({ kind: 'error', text: error.message });
    } else if (mode === 'signup' && !data.session) {
      setMessage({ kind: 'info', text: '確認メールを送信しました。メール内のリンクを開いてからログインしてください。' });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Workout Tracker</h1>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          アカウントでログインすると、Web とモバイルアプリで同じデータを操作できます。
        </p>
        <label className="block text-xs text-gray-500 mb-1">メールアドレス</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-gray-300"
        />
        <label className="block text-xs text-gray-500 mb-1">パスワード(6文字以上)</label>
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-gray-300"
        />
        {message && (
          <p className={`text-xs mb-3 ${message.kind === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>{message.text}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40"
        >
          {mode === 'signin' ? 'ログイン' : 'アカウント作成'}
        </button>
        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}
          className="w-full mt-3 text-xs text-gray-500 hover:text-gray-800"
        >
          {mode === 'signin' ? 'アカウントを作成する' : 'ログインに戻る'}
        </button>
      </form>
    </div>
  );
}
