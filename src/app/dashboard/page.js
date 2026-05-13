import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isCheckinComplete } from '@/lib/utils';
import Nav from '@/components/Nav';

export const dynamic = 'force-dynamic';

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // make Monday the start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // find the (first) student
  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .limit(1)
    .maybeSingle();

  if (!student) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="text-gray-500">尚未建立學生帳號。</p>
      </main>
    );
  }

  const weekStart = startOfWeek(new Date()).toISOString().slice(0, 10);

  const [{ data: checkins }, { data: mistakes }] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', student.id)
      .gte('date', weekStart),
    supabase
      .from('mistakes')
      .select('id, subject, reason, created_at')
      .eq('user_id', student.id)
      .gte('created_at', weekStart),
  ]);

  const fullDays = (checkins || []).filter(isCheckinComplete).length;
  const today = new Date();
  const daysSoFar = Math.min(7, Math.floor((today - startOfWeek(today)) / 86400000) + 1);
  const rate = daysSoFar ? Math.round((fullDays / daysSoFar) * 100) : 0;

  const light =
    rate >= 80 ? { label: '綠燈', color: 'bg-green-500' }
      : rate >= 70 ? { label: '黃燈', color: 'bg-yellow-400' }
      : { label: '紅燈', color: 'bg-red-500' };

  // streak (reuse logic)
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const { data: history } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', student.id)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: false });

  let streak = 0;
  const byDate = new Map((history || []).map((r) => [r.date, r]));
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (isCheckinComplete(byDate.get(iso))) streak++;
    else break;
  }

  // mistake breakdown by subject and reason
  const bySubject = {};
  const byReason = {};
  for (const m of mistakes || []) {
    bySubject[m.subject] = (bySubject[m.subject] || 0) + 1;
    byReason[m.reason] = (byReason[m.reason] || 0) + 1;
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-6">
      <h1 className="text-2xl font-bold">本週狀況</h1>
      <p className="text-sm text-gray-500">{student.display_name}</p>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">本週打卡率</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-3xl font-bold">{rate}%</p>
            <span className={`inline-block h-3 w-3 rounded-full ${light.color}`} />
          </div>
          <p className="text-xs text-gray-500">{light.label}</p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-gray-500">連續達標</p>
          <p className="mt-1 text-3xl font-bold">🔥 {streak}</p>
          <p className="text-xs text-gray-500">天</p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-semibold">本週錯題（科目）</h2>
        {Object.keys(bySubject).length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">本週尚無錯題</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {Object.entries(bySubject).map(([sub, n]) => (
              <li key={sub} className="flex items-center gap-2 text-sm">
                <span className="w-12 text-gray-600">{sub}</span>
                <div className="flex-1">
                  <div
                    className="h-3 rounded bg-blue-500"
                    style={{ width: `${Math.min(100, n * 20)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs text-gray-500">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-semibold">錯誤原因分布</h2>
        {Object.keys(byReason).length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">尚無資料</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {Object.entries(byReason).map(([r, n]) => (
              <li key={r} className="flex items-center gap-2 text-sm">
                <span className="w-20 text-gray-600">{r}</span>
                <div className="flex-1">
                  <div
                    className="h-3 rounded bg-red-400"
                    style={{ width: `${Math.min(100, n * 20)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs text-gray-500">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Nav role="parent" />
    </main>
  );
}
