import {
  Home,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Target,
  NotebookPen,
  Flame,
  Trophy,
  BookMarked,
  ClipboardList,
  StickyNote,
  MessagesSquare,
  Settings2,
  LayoutDashboard,
  Sprout,
} from 'lucide-react';

// 學生：側邊欄完整清單
export const STUDENT_NAV = [
  { href: '/', label: '主控中心', icon: Home, exact: true },
  { href: '/checkin', label: '每日挑戰', icon: CheckCircle2 },
  { href: '/calendar', label: '日程地圖', icon: CalendarRange },
  { href: '/assignments', label: '任務挑戰', icon: ClipboardList },
  { href: '/schedule', label: '訓練日程', icon: CalendarDays },
  { href: '/weekly', label: '每週挑戰', icon: Target },
  { href: '/mistakes', label: '弱點特訓', icon: NotebookPen },
  { href: '/reading', label: '傳奇書庫', icon: BookMarked },
  { href: '/notes', label: '冒險隨筆', icon: StickyNote },
  { href: '/messages', label: '通訊終端', icon: MessagesSquare },
  { href: '/streak', label: '連勝火焰', icon: Flame },
  { href: '/pet', label: '寵物養成', icon: Sprout },
  { href: '/achievements', label: '榮譽勳章', icon: Trophy },
  { href: '/settings/tasks', label: '任務設定', icon: Settings2 },
];

// 學生：手機底部列（首頁/打卡/行事曆/課表/錯題）
export const STUDENT_NAV_MOBILE = [
  { href: '/', label: '主控室', icon: Home, exact: true },
  { href: '/checkin', label: '挑戰', icon: CheckCircle2 },
  { href: '/calendar', label: '日程', icon: CalendarRange },
  { href: '/schedule', label: '訓練', icon: CalendarDays },
  { href: '/mistakes', label: '特訓', icon: NotebookPen },
];

// 家長
export const PARENT_NAV = [
  { href: '/dashboard', label: '總覽', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/mistakes', label: '錯題', icon: NotebookPen },
  { href: '/dashboard/monthly', label: '月報', icon: CalendarDays },
  { href: '/calendar', label: '行事曆', icon: CalendarRange },
  { href: '/assignments', label: '作業', icon: ClipboardList },
  { href: '/reading', label: '閱讀', icon: BookMarked },
  { href: '/messages', label: '留言板', icon: MessagesSquare },
];

export function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
