'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// 頂部載入進度條：點內部連結時立即出現並「假進度」前進，
// 路由換頁完成（pathname 改變）時補到 100% 後淡出。
// 與 app/loading.js 互補：這個負責「點下去馬上有反應」的即時回饋。
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
    setProgress(12);
    clearInterval(trickle.current);
    trickle.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const inc = p < 50 ? 10 : p < 75 ? 4 : 1.5;
        return Math.min(90, p + inc);
      });
    }, 240);
    clearTimeout(safety.current);
    safety.current = setTimeout(done, 10000);
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

  // 攔截內部連結點擊（capture 階段，搶在 router 之前）
  useEffect(() => {
    function onClick(e) {
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
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      start();
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1">
      <div
        className="h-full bg-indigo-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 10px rgba(99,102,241,0.8), 0 0 4px rgba(99,102,241,0.9)',
        }}
      />
    </div>
  );
}
