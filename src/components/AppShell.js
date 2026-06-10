'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSkin } from '@/components/SkinProvider';
import SkinPicker from '@/components/SkinPicker';
import RefreshOnFocus from '@/components/RefreshOnFocus';
import {
  STUDENT_NAV_GROUPS,
  STUDENT_NAV_MOBILE,
  PARENT_NAV,
  PARENT_NAV_GROUPS,
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

  const navGroups = role === 'parent' ? PARENT_NAV_GROUPS : STUDENT_NAV_GROUPS;
  const mobileNav = role === 'parent' ? PARENT_NAV : STUDENT_NAV_MOBILE;
  const maxW = width === 'narrow' ? 'max-w-2xl' : 'max-w-6xl';

  // 造型相關的外框樣式（預設＝極光磨砂白；甲賀忍蛙＝深海忍者深藍）
  const chromeClass = ninja
    ? 'border-cyan-300/15 bg-[#0a2240]/85 backdrop-blur-xl'
    : 'border-indigo-100/80 bg-white/72 backdrop-blur-xl';
  const brandTile = ninja
    ? 'bg-gradient-to-br from-cyan-400 to-sky-600 shadow-md shadow-cyan-500/40'
    : 'bg-gradient-to-br from-indigo-500 to-violet-600';
  const brandGlyph = ninja ? '🐸' : '學';
  const brandLabel = ninja ? '甲賀忍者' : '學習挑戰賽';
  const brandText = ninja ? 'text-cyan-50' : 'text-slate-800';
  const userText = ninja ? 'text-cyan-100/80' : 'text-slate-600';

  const navActive = ninja
    ? 'bg-gradient-to-r from-cyan-400 to-sky-600 text-white shadow-md shadow-cyan-500/40'
    : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25';
  const navIdle = ninja
    ? 'text-cyan-100/70 hover:bg-white/10 hover:text-white'
    : 'text-slate-600 hover:bg-indigo-50/80 hover:text-slate-900';
  const groupLabelClass = ninja ? 'text-cyan-200/40' : 'text-slate-400/90';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    // 手機：整個畫面是高度 100dvh 的直向 flex，底部列是「在文件流裡」的最後一個子元素，
    // 不用 position:fixed，所以 iOS Chrome 的工具列收合時不會浮起來。
    // 桌面：改為左右 flex（側邊欄 + 內容）。relative z-10 讓內容蓋在造型浮水印之上。
    <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
      {/* 切回視窗時自動更新資料，避免在過期畫面上操作 */}
      <RefreshOnFocus />

      {/* ===== 桌面側邊欄 ===== */}
      <aside
        className={`hidden flex-shrink-0 flex-col border-r transition-all duration-200 lg:flex ${chromeClass} ${
          collapsed ? 'lg:w-16' : 'lg:w-60'
        }`}
      >
        <div className={`flex h-16 flex-shrink-0 items-center gap-2.5 border-b px-4 ${ninja ? 'border-cyan-300/15' : 'border-indigo-100/70'}`}>
          {ninja ? (
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg ${brandTile}`}>
              {brandGlyph}
            </div>
          ) : (
            <img src="/logo.svg" alt="學習挑戰賽" className="h-9 w-9 flex-shrink-0 rounded-xl" />
          )}
          {!collapsed && (
            <span className={`truncate font-black tracking-wide ${brandText}`}>{brandLabel}</span>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group, gi) => (
            <div key={group.label ?? gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.label && !collapsed && (
                <p className={`mb-1.5 px-3 text-[10px] font-black uppercase tracking-[0.14em] ${groupLabelClass}`}>
                  {group.label}
                </p>
              )}
              {group.label && collapsed && gi > 0 && (
                <div className={`mx-2 mb-2 border-t ${ninja ? 'border-cyan-300/15' : 'border-indigo-100/80'}`} />
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                        active ? navActive : navIdle
                      }`}
                    >
                      <Icon size={19} className="flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ===== 右側：頂部列 + 內容 ===== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 桌面頂部列 */}
        <header className={`hidden h-16 flex-shrink-0 items-center justify-between border-b px-6 lg:flex ${chromeClass}`}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`rounded-lg p-2 ${ninja ? 'text-cyan-100/80 hover:bg-white/10' : 'text-slate-600 hover:bg-indigo-50'}`}
            aria-label="收合側邊欄"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${userText}`}>{displayName || email}</span>
            <SkinPicker variant={ninja ? 'dark' : 'light'} />
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${ninja ? 'text-cyan-100/80 hover:bg-white/10' : 'text-slate-600 hover:bg-indigo-50'}`}
            >
              <LogOut size={16} />
              登出
            </button>
          </div>
        </header>

        {/* 手機頂部列 */}
        <header className={`flex h-14 flex-shrink-0 items-center justify-between border-b px-4 lg:hidden ${chromeClass}`}>
          <div className="flex items-center gap-2">
            {ninja ? (
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${brandTile}`}>
                {brandGlyph}
              </div>
            ) : (
              <img src="/logo.svg" alt="學習挑戰賽" className="h-8 w-8 rounded-lg" />
            )}
            <span className={`font-extrabold tracking-wide ${brandText}`}>
              {ninja ? brandLabel : '學習挑戰賽 🏆'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <SkinPicker variant={ninja ? 'dark' : 'light'} />
            <button
              onClick={handleLogout}
              className={`rounded-lg p-2 ${ninja ? 'text-cyan-100/80 hover:bg-white/10' : 'text-slate-500 hover:bg-indigo-50'}`}
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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-center text-xs transition active:scale-[0.92] ${
                  active ? `font-bold ${activeColor}` : idleColor
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? (ninja ? 'bg-white/10' : 'bg-indigo-100/80') : ''
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.6 : 2} />
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
