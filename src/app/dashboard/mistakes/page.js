import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUBJECT_COLORS, SUBJECTS, MISTAKE_REASONS } from '@/lib/utils';
import { toYMD, weekStart, weekStartYMD } from '@/lib/date';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

const REASON_COLORS = {
  粗心: '#f59e0b',
  不懂概念: '#6366f1',
  題意看不懂: '#0ea5e9',
  計算錯誤: '#f43f5e',
};

const WEEK_MS = 7 * 86400000;

export default async function ParentMistakesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!student) {
    return (
      <AppShell role="parent" email={user.email}>
        <p className="text-slate-500">尚未建立學生帳號。</p>
      </AppShell>
    );
  }

  const { data: mistakes } = await supabase
    .from('mistakes')
    .select('subject, reason, created_at, mastered_at, review_count')
    .eq('user_id', student.id)
    .order('created_at', { ascending: true });

  const rows = mistakes || [];
  const now = new Date();

  // ---- 時間切點（全部以台北日期為準） ----
  // 本週週一（台北時間 00:00 的精確時刻）
  const thisMonday = weekStart(now);
  // 近 8 週的週一（最舊 → 最新，最後一個是本週）
  const mondays = Array.from({ length: 8 }, (_, i) =>
    new Date(thisMonday.getTime() - (7 - i) * WEEK_MS)
  );
  const mondayYMDs = mondays.map((d) => toYMD(d));
  // 近 4 週 = 本週 + 前 3 週；前 4 週 = 再往前 4 週
  const last4Start = mondayYMDs[4];
  const prev4Start = mondayYMDs[0];

  const thisMonth = toYMD(now).slice(0, 7); // YYYY-MM
  const [ty, tm] = thisMonth.split('-').map(Number);
  const lastMonth = `${tm === 1 ? ty - 1 : ty}-${String(tm === 1 ? 12 : tm - 1).padStart(2, '0')}`;

  // ---- 一次掃過所有錯題，做齊各種彙總 ----
  const stats = {}; // subject -> { total, last4, prev4, mastered, reasons: {}, weeks: {mondayYMD: n} }
  const monthCareless = {
    [thisMonth]: { total: 0, careless: 0 },
    [lastMonth]: { total: 0, careless: 0 },
  };

  for (const m of rows) {
    const created = new Date(m.created_at);
    const ymd = toYMD(created); // 台北日期
    const wk = weekStartYMD(created); // 該筆所屬週的週一（台北）

    const s =
      stats[m.subject] ||
      (stats[m.subject] = { total: 0, last4: 0, prev4: 0, mastered: 0, reasons: {}, weeks: {} });
    s.total += 1;
    if (m.mastered_at) s.mastered += 1;
    s.reasons[m.reason] = (s.reasons[m.reason] || 0) + 1;
    if (ymd >= last4Start) s.last4 += 1;
    else if (ymd >= prev4Start) s.prev4 += 1;
    if (wk >= mondayYMDs[0]) s.weeks[wk] = (s.weeks[wk] || 0) + 1;

    const mon = ymd.slice(0, 7);
    if (monthCareless[mon]) {
      monthCareless[mon].total += 1;
      if (m.reason === '粗心') monthCareless[mon].careless += 1;
    }
  }

  // 該補哪科：依「近 4 週」數量排序（同分比總數）
  const ranked = SUBJECTS.filter((sub) => stats[sub])
    .map((sub) => ({ subject: sub, ...stats[sub] }))
    .sort((a, b) => b.last4 - a.last4 || b.total - a.total);

  // 8 週趨勢的全域最大值（讓所有科目共用同一比例尺）
  const trendMax = Math.max(
    1,
    ...ranked.flatMap((s) => mondayYMDs.map((wk) => s.weeks[wk] || 0))
  );

  // 粗心比較（本月 vs 上月）
  const cur = monthCareless[thisMonth];
  const prev = monthCareless[lastMonth];
  const curPct = cur.total ? Math.round((cur.careless / cur.total) * 100) : null;
  const prevPct = prev.total ? Math.round((prev.careless / prev.total) * 100) : null;
  let verdict = null;
  if (curPct !== null && prevPct !== null) {
    const diff = curPct - prevPct;
    verdict =
      diff <= -3
        ? { text: '粗心比例下降了，有進步，改善了 🎉', tone: 'text-emerald-600' }
        : diff >= 3
        ? { text: '粗心變多了，考前提醒他放慢檢查。', tone: 'text-rose-600' }
        : { text: '和上個月差不多，持平。', tone: 'text-slate-600' };
  }

  const weekLabels = mondayYMDs.map((ymd) => {
    const [, mm, dd] = ymd.split('-');
    return `${Number(mm)}/${Number(dd)}`;
  });

  return (
    <AppShell role="parent" email={user.email}>
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">📊 科目分析</h1>
        <p className="mt-1 text-sm text-slate-500">{student.display_name}</p>
      </header>

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-3 text-sm font-semibold text-slate-500">還沒有任何錯題記錄</p>
          <p className="mt-1 text-xs text-slate-400">等他開始登記錯題，這裡就會出現分析。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ============ 該補哪科 ============ */}
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-label">該補哪科</h2>
              <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {MISTAKE_REASONS.map((r) => (
                  <li key={r} className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: REASON_COLORS[r] }}
                    />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="stagger flex flex-col gap-3">
              {ranked.map((s) => {
                const delta = s.last4 - s.prev4;
                const arrow =
                  delta > 0
                    ? { sym: '↑', cls: 'text-rose-600', label: `比前 4 週多 ${delta}` }
                    : delta < 0
                    ? { sym: '↓', cls: 'text-emerald-600', label: `比前 4 週少 ${-delta}` }
                    : { sym: '→', cls: 'text-slate-400', label: '和前 4 週持平' };
                return (
                  <div key={s.subject} className="card p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ background: SUBJECT_COLORS[s.subject] || '#888' }}
                        />
                        {s.subject}
                      </span>
                      <span className="text-xs font-bold text-slate-500">共 {s.total} 題</span>
                      <span className="text-xs font-bold text-slate-500">
                        近 4 週 {s.last4} 題
                        <span className={`ml-1 font-black ${arrow.cls}`} title={arrow.label}>
                          {arrow.sym}
                        </span>
                      </span>
                      <span className="ml-auto text-xs font-bold text-amber-500">
                        ⭐ 精熟 {s.mastered}
                      </span>
                    </div>

                    {/* 原因分布堆疊長條 */}
                    <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      {MISTAKE_REASONS.filter((r) => s.reasons[r]).map((r) => (
                        <div
                          key={r}
                          title={`${r} ${s.reasons[r]} 題`}
                          style={{
                            width: `${(s.reasons[r] / s.total) * 100}%`,
                            background: REASON_COLORS[r],
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ============ 8 週趨勢 ============ */}
          <section className="card p-5">
            <h2 className="section-label">8 週趨勢</h2>
            <p className="mt-1 text-xs text-slate-400">每科每週的新錯題數（週一起算）</p>

            <div className="mt-4 flex flex-col gap-3">
              {ranked.map((s) => (
                <div key={s.subject} className="flex items-end gap-3">
                  <span className="w-9 flex-shrink-0 pb-0.5 text-xs font-bold text-slate-600">
                    {s.subject}
                  </span>
                  <div className="grid h-10 flex-1 grid-cols-8 items-end gap-1.5">
                    {mondayYMDs.map((wk, i) => {
                      const n = s.weeks[wk] || 0;
                      return (
                        <div key={wk} className="flex h-full items-end justify-center">
                          <div
                            title={`${weekLabels[i]} 起：${n} 題`}
                            className="w-full max-w-5 rounded-t"
                            style={{
                              height: n ? `${Math.max(10, (n / trendMax) * 100)}%` : '2px',
                              background: n
                                ? SUBJECT_COLORS[s.subject] || '#888'
                                : '#e2e8f0',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* 週標籤（每週週一 M/D），對齊上方長條 */}
              <div className="flex items-center gap-3">
                <span className="w-9 flex-shrink-0" />
                <div className="grid flex-1 grid-cols-8 gap-1.5">
                  {weekLabels.map((label, i) => (
                    <span
                      key={mondayYMDs[i]}
                      className="text-center text-[10px] font-semibold text-slate-400"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ============ 粗心有變少嗎 ============ */}
          <section className="card p-5">
            <h2 className="section-label">粗心有變少嗎？</h2>
            {verdict ? (
              <>
                <div className="mt-3 flex items-center gap-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400">上個月</p>
                    <p className="mt-1 text-2xl font-black text-slate-700">{prevPct}%</p>
                    <p className="text-[10px] text-slate-400">
                      {prev.careless} / {prev.total} 題是粗心
                    </p>
                  </div>
                  <span className="text-xl text-slate-300">→</span>
                  <div>
                    <p className="text-xs font-bold text-slate-400">這個月</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{curPct}%</p>
                    <p className="text-[10px] text-slate-400">
                      {cur.careless} / {cur.total} 題是粗心
                    </p>
                  </div>
                </div>
                <p className={`mt-3 text-sm font-bold ${verdict.tone}`}>{verdict.text}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                尚無足夠資料——需要這個月和上個月都有錯題記錄才能比較。
                {curPct !== null && (
                  <span className="ml-1">（這個月目前粗心占 {curPct}%）</span>
                )}
              </p>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
