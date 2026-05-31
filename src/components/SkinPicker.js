'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, X, Check } from 'lucide-react';
import { SKINS } from '@/lib/skins';
import { useSkin } from '@/components/SkinProvider';
import { cn } from '@/lib/utils';

export default function SkinPicker({ variant = 'light' }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { skin, setSkin } = useSkin();

  // 只在 client 掛載後才能用 portal（SSR 沒有 document）
  useEffect(() => setMounted(true), []);

  // 開啟時鎖住背景捲動
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 把彈窗 portal 到 <body>，避開頂部列 backdrop-blur 造成的 fixed 定位錯亂
  const modal = (
    <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">🎨 選擇你的造型</h2>
                <p className="text-xs font-medium text-slate-500">挑一個喜歡的風格，馬上換裝！</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                aria-label="關閉"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SKINS.map((s) => {
                const active = skin === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSkin(s.key)}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition active:scale-[0.98]',
                      active
                        ? 'border-blue-600 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300',
                    )}
                  >
                    {/* 配色預覽條 */}
                    <div className="flex h-12 w-full overflow-hidden rounded-xl">
                      {s.swatch.map((c, i) => (
                        <span key={i} className="flex-1" style={{ background: c }} />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="text-lg">{s.emoji}</span>
                      <span className="font-black text-slate-800">{s.name}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">{s.desc}</p>
                    {active && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[11px] font-medium text-slate-400">
              造型只會記在這台裝置上，隨時可以再換 ✨
            </p>
          </div>
        </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="換造型"
        title="換造型"
        className={cn(
          'flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold transition active:scale-95',
          variant === 'dark'
            ? 'text-white/80 hover:bg-white/10 hover:text-white'
            : 'text-slate-600 hover:bg-slate-100',
        )}
      >
        <Palette size={18} />
        <span className="hidden sm:inline">造型</span>
      </button>
      {open && mounted && createPortal(modal, document.body)}
    </>
  );
}
