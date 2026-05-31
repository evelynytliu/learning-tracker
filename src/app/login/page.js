'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  function switchMode(next) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    // 忘記密碼：寄重設密碼信
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      setLoading(false);
      if (error) {
        setError(translateError(error.message));
        return;
      }
      setInfo('已寄出重設密碼的信，請去收信點連結，就能設定新密碼。');
      return;
    }

    // 登入
    if (mode === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setLoading(false);
        setError(translateError(error.message));
        return;
      }
      await ensureProfile(supabase, data.user);
      setLoading(false);
      router.push('/');
      router.refresh();
      return;
    }

    // 申請帳號：建立帳號 + 密碼
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }
    // 若專案已關閉 email 驗證，會直接拿到 session → 進首頁
    if (data.session) {
      await ensureProfile(supabase, data.user, displayName);
      router.push('/');
      router.refresh();
      return;
    }
    // 否則需要去信箱點驗證信
    setInfo('帳號已建立，請去收信點一下驗證連結，完成後即可用密碼登入。');
    setMode('signin');
  }

  const subtitle =
    mode === 'signin'
      ? '用帳號密碼登入'
      : mode === 'signup'
        ? '申請新帳號'
        : '忘記密碼，重設一組新的';

  const buttonLabel = loading
    ? '處理中…'
    : mode === 'signin'
      ? '登入'
      : mode === 'signup'
        ? '申請帳號'
        : '寄送重設密碼信';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="animate-rise card p-7">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-3xl font-black text-white shadow-lg shadow-violet-500/40">
            學
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-800">學習基地</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="顯示名稱（例如：小明）"
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
          )}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼（至少 6 個字）"
              className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 font-bold text-white shadow-md shadow-indigo-500/30 transition hover:shadow-lg hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-50"
          >
            {buttonLabel}
          </button>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {info && (
            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
              {info}
            </p>
          )}
        </form>

        <div className="mt-6 flex flex-col gap-2 text-sm font-medium text-indigo-600">
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-left hover:underline"
              >
                忘記密碼？
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-left hover:underline"
              >
                還沒有帳號？申請一個
              </button>
            </>
          )}
          {mode !== 'signin' && (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="text-left hover:underline"
            >
              ← 回登入
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// 第一次登入時若還沒有 profile，就建一筆（預設 student，不覆蓋既有 role）
async function ensureProfile(supabase, user, displayName) {
  if (!user) return;
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (existing) return;
  const name =
    displayName?.trim() ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    '同學';
  await supabase
    .from('profiles')
    .insert({ id: user.id, role: 'student', display_name: name });
}

// 把常見的 Supabase 英文錯誤訊息翻成中文
function translateError(message) {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return '帳號或密碼不對';
  if (m.includes('email not confirmed')) return '請先去信箱點驗證連結';
  if (m.includes('user already registered')) return '這個 email 已經註冊過了，直接登入即可';
  if (m.includes('password should be at least')) return '密碼至少要 6 個字';
  return message;
}
