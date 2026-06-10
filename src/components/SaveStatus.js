'use client';

import { useCallback, useRef, useState } from 'react';
import { Check, CloudUpload, TriangleAlert } from 'lucide-react';

// 統一的「儲存狀態」機制：
//   const { status, errMsg, run } = useSaveRunner();
//   run(async () => { const { error } = await supabase...; return error; },
//       { rollback: () => setState(prev) });
// 畫面上放 <SaveStatusPill status={status} errMsg={errMsg} />，
// 每次寫入都會看到「儲存中… → ✓ 已儲存」，失敗會跳紅色提示並還原畫面。
export function useSaveRunner() {
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [errMsg, setErrMsg] = useState(null);
  const timer = useRef(null);
  const inFlight = useRef(0);

  const run = useCallback(async (work, { rollback } = {}) => {
    clearTimeout(timer.current);
    inFlight.current += 1;
    setStatus('saving');
    try {
      const error = await work();
      if (error) throw error;
      inFlight.current -= 1;
      if (inFlight.current <= 0) {
        setStatus('saved');
        setErrMsg(null);
        timer.current = setTimeout(() => setStatus('idle'), 1600);
      }
      return true;
    } catch (e) {
      inFlight.current -= 1;
      if (rollback) rollback();
      setStatus('error');
      setErrMsg(e?.message || '連線失敗，請再試一次');
      timer.current = setTimeout(() => setStatus('idle'), 6000);
      return false;
    }
  }, []);

  return { status, errMsg, run };
}

export function SaveStatusPill({ status, errMsg }) {
  if (status === 'idle') return null;
  const styles = {
    saving: 'bg-slate-900/90 text-white',
    saved: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
  };
  return (
    <div
      className={`pointer-events-none fixed bottom-24 left-1/2 z-50 flex max-w-[88vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-xl backdrop-blur animate-pop lg:bottom-8 ${styles[status]}`}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' && (
        <>
          <CloudUpload size={15} className="animate-pulse" /> 儲存中…
        </>
      )}
      {status === 'saved' && (
        <>
          <Check size={15} strokeWidth={3} /> 已儲存
        </>
      )}
      {status === 'error' && (
        <>
          <TriangleAlert size={15} />
          <span className="truncate">儲存失敗：{errMsg}</span>
        </>
      )}
    </div>
  );
}
