import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { toYMD, weekStart } from '@/lib/date';
import FocusTimer from './FocusTimer';

export const dynamic = 'force-dynamic';

// 把 timestamptz 格式化成台灣時間 HH:MM（家長唯讀視圖用）
function fmtHM(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle();

  const isParent = profile?.role === 'parent';

  // 家長看第一位學生的紀錄（唯讀）；學生用自己的計時器
  let targetId = user.id;
  let studentName = null;
  if (isParent) {
    const { data: student } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('role', 'student')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!student) {
      return (
        <AppShell role="parent" email={user.email} displayName={profile?.display_name} width="narrow">
          <p className="text-slate-500">尚未建立學生帳號。</p>
        </AppShell>
      );
    }
    targetId = student.id;
    studentName = student.display_name;
  }

  const weekStartTs = weekStart().toISOString();
  const [{ data: weekSessions }, { data: recentSessions }] = await Promise.all([
    supabase
      .from('focus_sessions')
      .select('minutes, started_at')
      .eq('user_id', targetId)
      .gte('started_at', weekStartTs),
    supabase
      .from('focus_sessions')
      .select('id, subject, minutes, started_at')
      .eq('user_id', targetId)
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  const today = toYMD();
  let weekMinutes = 0;
  let todayMinutes = 0;
  for (const s of weekSessions ?? []) {
    weekMinutes += s.minutes;
    if (toYMD(new Date(s.started_at)) === today) todayMinutes += s.minutes;
  }

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">⏱️ 專注時間</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isParent
            ? `${studentName} 的專注紀錄（唯讀）`
            : '選好科目開計時器，專心 15 分鐘以上 +5 點'}
        </p>
      </header>

      {isParent ? (
        <div className="flex flex-col gap-4">
          {/* 統計列 */}
          <div className="card flex items-center justify-around gap-3 p-4 text-center">
            <div>
              <p className="section-label">今日專注</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {todayMinutes}
                <span className="ml-1 text-xs font-bold text-slate-400">分鐘</span>
              </p>
            </div>
            <div>
              <p className="section-label">本週專注</p>
              <p className="mt-1 text-2xl font-black text-gradient">
                {weekMinutes}
                <span className="ml-1 text-xs font-bold text-slate-400">分鐘</span>
              </p>
            </div>
          </div>

          {/* 最近紀錄 */}
          <section className="card p-4">
            <p className="section-label mb-3">最近的專注</p>
            {(recentSessions ?? []).length === 0 ? (
              <p className="text-xs text-slate-400">還沒有專注紀錄。</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentSessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="w-12 font-semibold tabular-nums text-slate-400">
                      {fmtHM(s.started_at)}
                    </span>
                    <span className="chip px-2.5 py-0.5 text-xs">{s.subject || '未指定'}</span>
                    <span className="ml-auto font-bold text-slate-600">{s.minutes} 分鐘</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <FocusTimer
          userId={targetId}
          initialTodayMinutes={todayMinutes}
          initialWeekMinutes={weekMinutes}
          initialSessions={recentSessions ?? []}
        />
      )}
    </AppShell>
  );
}
