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
    <div className="lg:flex lg:h-screen lg:overflow-hidden">
      {/* ===== 桌面側邊欄 ===== */}
      <aside
        className={`hidden flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-200 lg:block ${
          collapsed ? 'lg:w-16' : 'lg:w-60'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
            學
          </div>
          {!collapsed && (
            <span className="truncate font-bold text-slate-800">學習平台</span>
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
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
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        {/* 桌面頂部列 */}
        <header className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:flex">
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
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              學
            </div>
            <span className="font-bold text-slate-800">學習平台</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="登出"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* 內容 */}
        <main className="flex-1 bg-slate-50 lg:overflow-y-auto">
          <div
            className={`mx-auto w-full px-5 pb-24 pt-6 lg:px-8 lg:pb-10 lg:pt-8 ${maxW}`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ===== 手機底部列 ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-center text-xs ${
                  active ? 'font-bold text-indigo-600' : 'text-slate-400'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
