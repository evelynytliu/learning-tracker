'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // 點重設信連結後，/auth/callback 已換好 session，這裡確認一下有沒有登入狀態
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setError('連結已失效或尚未驗證，請回登入頁重新申請一次。');
      }
      setReady(true);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('兩次輸入的密碼不一樣');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 1200);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">設定新密碼</h1>

      {done ? (
        <p className="mt-8 rounded-lg bg-green-50 p-4 text-green-700">
          密碼已更新，正在帶你進去…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="新密碼（至少 6 個字）"
            className="rounded-lg border px-4 py-3"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="再輸入一次新密碼"
            className="rounded-lg border px-4 py-3"
          />
          <button
            type="submit"
            disabled={loading || !ready}
            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? '更新中…' : '更新密碼'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </main>
  );
}

function translateError(message) {
  const m = message.toLowerCase();
  if (m.includes('password should be at least')) return '密碼至少要 6 個字';
  if (m.includes('new password should be different'))
    return '新密碼不能和舊密碼一樣';
  return message;
}
