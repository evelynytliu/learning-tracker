'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookX, Flame, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STUDENT_TABS = [
  { href: '/',          label: '打卡', icon: Home },
  { href: '/mistakes',  label: '錯題', icon: BookX },
  { href: '/streak',    label: '連續', icon: Flame },
];

const PARENT_TABS = [
  { href: '/dashboard',           label: '週報',   icon: BarChart3 },
  { href: '/dashboard/mistakes',  label: '錯題',   icon: BookX },
  { href: '/dashboard/monthly',   label: '月檢核', icon: Flame },
];

export default function Nav({ role }) {
  const pathname = usePathname();
  const tabs = role === 'parent' ? PARENT_TABS : STUDENT_TABS;

  return (
    <nav className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur z-10">
      <ul className="mx-auto flex max-w-md justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center py-3 text-xs',
                  active ? 'text-blue-600 font-semibold' : 'text-gray-500',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="mt-1">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
