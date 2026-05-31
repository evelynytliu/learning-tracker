'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSkin } from '@/components/SkinProvider';
import SkinPicker from '@/components/SkinPicker';
import {
  STUDENT_NAV,
  STUDENT_NAV_MOBILE,
  PARENT_NAV,
  isActive,
} from './navConfig';

export default function AppShell({
  role = 'student',
  email,
  displayName,
  width = 'wide', // 'wide' | 'narrow'
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { skin } = useSkin();
  const ninja = skin === 'greninja';

  const fullNav = role === 'parent' ? PARENT_NAV : STUDENT_NAV;
  const mobileNav = role === 'parent' ? PARENT_NAV : STUDENT_NAV_MOBILE;
  const maxW = width === 'narrow' ? 'max-w-2xl' : 'max-w-6xl';

  // 造型相關的外框樣式（甲賀忍蛙＝深海忍者深藍）
  const chromeClass = ninja
    ? 'border-cyan-300/15 bg-[#0a2240]/85 backdrop-blur-xl'
    : 'border-white/60 bg-white/70 backdrop-blur-xl';
  const brandTile = ninja
    ? 'bg-gradient-to-br from-cyan-400 to-sky-600 shadow-cyan-500/40'
    : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30';
  const brandGlyph = ninja ? '🐸' : '學';
  const brandLabel = ninja ? '甲賀忍者' : '學習基地';
  const brandText = ninja ? 'text-cyan-50' : 'text-slate-800';
  const userText = ninja ? 'text-cyan-100/80' : 'text-slate-600';

  const navActive = ninja
    ? 'bg-gradient-to-r from-cyan-400 to-sky-600 text-white shadow-md shadow-cyan-500/40'
    : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30';
  const navIdle = ninja
    ? 'text-cyan-100/70 hover:bg-white/10 hover:text-white'
    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    // 手機：整個畫面是高度 100dvh 的直向 flex，底部列是「在文件流裡」的最後一個子元素，
    // 不用 position:fixed，所以 iOS Chrome 的工具列收合時不會浮起來。
    // 桌面：改為左右 flex（側邊欄 + 內容）。
    <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
      {/* ===== 桌面側邊欄 ===== */}
      <aside
        className={`hidden flex-shrink-0 border-r transition-all duration-200 lg:block ${chromeClass} ${
          collapsed ? 'lg:w-16' : 'lg:w-60'
        }`}
      >
        <div className={`flex h-16 items-center gap-2 border-b px-4 ${ninja ? 'border-cyan-300/15' : 'border-slate-200/70'}`}>
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md ${brandTile}`}>
            {brandGlyph}
          </div>
          {!collapsed && (
            <span className={`truncate font-extrabold tracking-tight ${brandText}`}>{brandLabel}</span>
          )}
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {fullNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? navActive : navIdle
                }`}
              >
                <Icon size={20} className="flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ===== 右側：頂部列 + 內容 ===== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 桌面頂部列 */}
        <header className={`hidden h-16 flex-shrink-0 items-center justify-between border-b px-6 lg:flex ${chromeClass}`}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`rounded-lg p-2 ${ninja ? 'text-cyan-100/80 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
            aria-label="收合側邊欄"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${userText}`}>{displayName || email}</span>
            <SkinPicker variant={ninja ? 'dark' : 'light'} />
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ninja ? 'text-cyan-100/80 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <LogOut size={16} />
              登出
            </button>
          </div>
        </header>

        {/* 手機頂部列 */}
        <header className={`flex h-14 flex-shrink-0 items-center justify-between border-b px-4 lg:hidden ${chromeClass}`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-md ${brandTile}`}>
              {brandGlyph}
            </div>
            <span className={`font-extrabold tracking-tight ${brandText}`}>{brandLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <SkinPicker variant={ninja ? 'dark' : 'light'} />
            <button
              onClick={handleLogout}
              className={`rounded-lg p-2 ${ninja ? 'text-cyan-100/80 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              aria-label="登出"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* 內容（唯一會滾動的區域） */}
        <main className="flex-1 overflow-y-auto">
          <div
            className={`mx-auto w-full px-5 pb-10 pt-6 lg:px-8 lg:pt-8 ${maxW}`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ===== 手機底部列（在文件流內，貼著 dvh 底部）===== */}
      <nav
        className={`flex-shrink-0 border-t lg:hidden ${chromeClass}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-md">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            const activeColor = ninja ? 'text-cyan-300' : 'text-indigo-600';
            const idleColor = ninja ? 'text-cyan-100/50' : 'text-slate-400';
            const activePill = ninja
              ? 'bg-white/10'
              : 'bg-gradient-to-r from-indigo-100 to-violet-100';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-center text-xs transition ${
                  active ? `font-bold ${activeColor}` : idleColor
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    active ? activePill : ''
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
