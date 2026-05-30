// App Router 會在 server component 載入期間自動顯示這個 fallback。
// 這是「保證會出現」的載入指示，比點擊攔截更可靠（尤其慢速手機）。
export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <p className="text-sm text-slate-400">載入中…</p>
    </div>
  );
}
