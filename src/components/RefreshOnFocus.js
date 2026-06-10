'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// 切回分頁、視窗重新聚焦、或從瀏覽器快取返回（bfcache）時，
// 自動向伺服器重新抓最新資料，避免停在過期畫面上操作
// （過期畫面曾造成「編輯好像沒存檔」的誤會）。
export default function RefreshOnFocus() {
  const router = useRouter();
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    function refresh() {
      // 節流：5 秒內只刷新一次，避免快速切換時連環請求
      if (Date.now() - lastRefresh.current < 5000) return;
      lastRefresh.current = Date.now();
      router.refresh();
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') refresh();
    }
    function onPageShow(e) {
      if (e.persisted) refresh(); // 從 bfcache 還原的舊畫面
    }
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [router]);

  return null;
}
