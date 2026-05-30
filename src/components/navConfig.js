import {
  Home,
  CheckCircle2,
  CalendarDays,
  Target,
  NotebookPen,
  Flame,
  LayoutDashboard,
} from 'lucide-react';

// 學生：側邊欄完整清單
export const STUDENT_NAV = [
  { href: '/', label: '首頁', icon: Home, exact: true },
  { href: '/checkin', label: '打卡', icon: CheckCircle2 },
  { href: '/schedule', label: '課表', icon: CalendarDays },
  { href: '/weekly', label: '週進度', icon: Target },
  { href: '/mistakes', label: '錯題', icon: NotebookPen },
  { href: '/streak', label: '連續', icon: Flame },
];

// 學生：手機底部列（最多 5 個，連續紀錄從首頁卡片進入）
export const STUDENT_NAV_MOBILE = STUDENT_NAV.slice(0, 5);

// 家長
export const PARENT_NAV = [
  { href: '/dashboard', label: '總覽', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/mistakes', label: '錯題', icon: NotebookPen },
  { href: '/dashboard/monthly', label: '月報', icon: CalendarDays },
];

export function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
