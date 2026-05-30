'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// 頂部細載入進度條：點內部連結時出現並「假進度」前進，
// 路由換頁完成（pathname 改變）時補到 100% 後淡出。
// 不依賴外部套件，避免舊機相容問題。
export default function TopLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const running = useRef(false);
  const trickle = useRef(null);
  const safety = useRef(null);
  const first = useRef(true);

  function start() {
    if (running.current) return;
    running.current = true;
    setVisible(true);
    setProgress(8);
    clearInterval(trickle.current);
    trickle.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const inc = p < 50 ? 9 : p < 75 ? 4 : 1.5;
        return Math.min(90, p + inc);
      });
    }, 280);
    // 安全閥：萬一頁面沒換成功，8 秒後收掉
    clearTimeout(safety.current);
    safety.current = setTimeout(done, 8000);
  }

  function done() {
    if (!running.current) return;
    clearInterval(trickle.current);
    clearTimeout(safety.current);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      running.current = false;
      setTimeout(() => setProgress(0), 200);
    }, 250);
  }

  // 路由改變 = 載入完成
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 攔截內部連結點擊
  useEffect(() => {
    function onClick(e) {
      // 修飾鍵 / 中鍵點擊交給瀏覽器自己開新分頁
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // 外部連結
      // 同一頁（path + query 都一樣）不顯示
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      start();
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-indigo-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 8px rgba(99,102,241,0.7)',
        }}
      />
    </div>
  );
}
