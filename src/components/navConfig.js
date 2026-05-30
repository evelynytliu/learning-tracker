import {
  Home,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Target,
  NotebookPen,
  Flame,
  Trophy,
  Settings2,
  LayoutDashboard,
} from 'lucide-react';

// 學生：側邊欄完整清單
export const STUDENT_NAV = [
  { href: '/', label: '首頁', icon: Home, exact: true },
  { href: '/checkin', label: '打卡', icon: CheckCircle2 },
  { href: '/calendar', label: '行事曆', icon: CalendarRange },
  { href: '/schedule', label: '課表', icon: CalendarDays },
  { href: '/weekly', label: '週進度', icon: Target },
  { href: '/mistakes', label: '錯題', icon: NotebookPen },
  { href: '/streak', label: '連續', icon: Flame },
  { href: '/achievements', label: '成就', icon: Trophy },
  { href: '/settings/tasks', label: '打卡設定', icon: Settings2 },
];

// 學生：手機底部列（首頁/打卡/行事曆/課表/錯題）
export const STUDENT_NAV_MOBILE = [
  { href: '/', label: '首頁', icon: Home, exact: true },
  { href: '/checkin', label: '打卡', icon: CheckCircle2 },
  { href: '/calendar', label: '行事曆', icon: CalendarRange },
  { href: '/schedule', label: '課表', icon: CalendarDays },
  { href: '/mistakes', label: '錯題', icon: NotebookPen },
];

// 家長
export const PARENT_NAV = [
  { href: '/dashboard', label: '總覽', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/mistakes', label: '錯題', icon: NotebookPen },
  { href: '/dashboard/monthly', label: '月報', icon: CalendarDays },
  { href: '/calendar', label: '行事曆', icon: CalendarRange },
];

export function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
