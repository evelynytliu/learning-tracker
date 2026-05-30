'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const studentLinks = [
  { href: '/', label: '首頁', icon: '🏠' },
  { href: '/checkin', label: '打卡', icon: '✅' },
  { href: '/schedule', label: '課表', icon: '📅' },
  { href: '/weekly', label: '週進度', icon: '🎯' },
  { href: '/mistakes', label: '錯題', icon: '📝' },
];

const parentLinks = [
  { href: '/dashboard', label: '總覽', icon: '📊' },
  { href: '/dashboard/mistakes', label: '錯題', icon: '📝' },
  { href: '/dashboard/monthly', label: '月報', icon: '🗓️' },
];

export default function Nav({ role }) {
  const pathname = usePathname();
  const links = role === 'parent' ? parentLinks : studentLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {links.map((link) => {
          const active =
            link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-center text-xs ${
                active ? 'font-bold text-blue-600' : 'text-gray-400'
              }`}
            >
              <span className="text-lg leading-none">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
