import { redirect } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function MonthlyReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .limit(1)
    .maybeSingle();

  if (!student) {
    return (
      <AppShell role="parent" email={user.email}>
        <p className="text-slate-500">尚未建立學生帳號。</p>
      </AppShell>
    );
  }

  const start = monthStart();
  const startISO = start.toISOString().slice(0, 10);
  const today = new Date();
  const daysSoFar = Math.min(
    today.getDate(),
    new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
  );

  const [{ data: checkins }, { count: mistakeCount }] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('homework_done, math_practice_done, date')
      .eq('user_id', student.id)
      .gte('date', startISO),
    supabase
      .from('mistakes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', student.id)
      .gte('created_at', start.toISOString()),
  ]);

  const homeworkDone = (checkins || []).filter((r) => r.homework_done).length;
  const practiceDone = (checkins || []).filter((r) => r.math_practice_done).length;
  const homeworkRate = daysSoFar ? Math.round((homeworkDone / daysSoFar) * 100) : 0;
  const practiceRate = daysSoFar ? Math.round((practiceDone / daysSoFar) * 100) : 0;

  const checks = [
    { label: '作業準時交', value: `${homeworkRate}%`, target: '≥ 90%', pass: homeworkRate >= 90 },
    { label: '錯題本有在記', value: `${mistakeCount ?? 0} 筆`, target: '≥ 8 筆', pass: (mistakeCount ?? 0) >= 8 },
    { label: '題庫練習有做', value: `${practiceRate}%`, target: '≥ 80%', pass: practiceRate >= 80 },
  ];

  const passed = checks.every((c) => c.pass);

  return (
    <AppShell role="parent" email={user.email}>
      <h1 className="text-2xl font-bold text-slate-800">月度檢核</h1>
      <p className="text-sm text-slate-500">
        {start.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
      </p>

      <div
        className={`mt-6 rounded-2xl px-5 py-6 text-center lg:max-w-md ${
          passed ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
        }`}
      >
        <p className="text-sm font-medium">{passed ? '三項都達標' : '兩項以下達標'}</p>
        <p className="mt-1 text-2xl font-bold">
          {passed ? '維持自主學習權' : '下個月需介入'}
        </p>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex items-center justify-between rounded-2xl border bg-white px-4 py-4"
          >
            <div>
              <p className="font-medium">{c.label}</p>
              <p className="text-xs text-slate-500">目標 {c.target}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{c.value}</p>
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  c.pass ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {c.pass ? <Check size={14} /> : <X size={14} />}
                {c.pass ? '達標' : '未達標'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
