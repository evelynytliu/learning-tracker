'use client';

import { useEffect, useState } from 'react';

// 顯示新解鎖徽章的慶祝彈窗。items: [{emoji, name, desc}]
export default function AchievementToast({ items, onClear }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        onClear?.();
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [items, onClear]);

  if (!visible || items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8">
      {items.map((a, i) => (
        <div
          key={a.key ?? i}
          className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-amber-200 bg-white px-5 py-4 shadow-xl"
          style={{ animation: 'pop 0.3s ease-out' }}
        >
          <span className="text-3xl">{a.emoji}</span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-amber-600">🎉 解鎖新徽章！</div>
            <div className="font-bold text-slate-800">{a.name}</div>
            <div className="text-xs text-slate-500">{a.desc}</div>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
