'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

  const fullNav = role === 'parent' ? PARENT_NAV : STUDENT_NAV;
  const mobileNav = role === 'parent' ? PARENT_NAV : STUDENT_NAV_MOBILE;
  const maxW = width === 'narrow' ? 'max-w-2xl' : 'max-w-6xl';

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
    <div className="flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
      {/* ===== 桌面側邊欄 ===== */}
      <aside
        className={`hidden flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-200 lg:block ${
          collapsed ? 'lg:w-16' : 'lg:w-60'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 font-black text-white">
            學
          </div>
          {!collapsed && (
            <span className="truncate font-black text-slate-800 tracking-wide">學習挑戰賽</span>
          )}
        </div>
        <nav className="flex flex-col gap-1.5 p-3">
          {fullNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ===== 右側：頂部列 + 內容 ===== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 桌面頂部列 */}
        <header className="hidden h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 lg:flex">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="收合側邊欄"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {displayName || email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              <LogOut size={16} />
              登出
            </button>
          </div>
        </header>

        {/* 手機頂部列 */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white animate-pulse">
              學
            </div>
            <span className="font-extrabold text-slate-800 tracking-wide">學習挑戰賽 🏆</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="登出"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* 內容（唯一會滾動的區域） */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div
            className={`mx-auto w-full px-5 pb-10 pt-6 lg:px-8 lg:pt-8 ${maxW}`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ===== 手機底部列（在文件流內，貼著 dvh 底部）===== */}
      <nav
        className="flex-shrink-0 border-t border-slate-200 bg-white lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-md">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-center text-xs transition active:scale-[0.92] ${
                  active ? 'font-bold text-blue-600' : 'text-slate-400'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.6 : 2} className={active ? 'text-blue-600' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
