'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function GlobalNavbar() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  if (!isMounted) return null;

  const navItems = [
    { name: 'ホーム', short: 'ホーム', href: '/' },
    { name: '検索', short: '検索', href: '/search' },
    { name: 'ライブラリ', short: 'ライブラリ', href: '/library' },
    { name: 'アカウント / コミュニティ', short: 'コミュニティ', href: '/community' },
  ];

  const isActive = (href) => pathname === href;

  return (
    <nav
      role="navigation"
      aria-label="グローバルナビゲーション"
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-lg z-50 h-12 sm:h-14"
      style={{
        // ここでプレイヤーに伝える
        ['--bottom-nav-h']: '48px',       // h-12 に合わせる（sm は 56px など）
        ['--player-gap']: '4px'
  
      }}
    >
      <div className="mx-auto max-w-5xl h-full px-2">
        {/* 4等分 */}
        <div className="grid grid-cols-4 gap-1 h-full">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href} className="min-w-0">
              <div
                className={`h-full flex flex-col items-center justify-center rounded-md select-none
                  ${isActive(item.href)
                    ? 'bg-slate-800 text-indigo-300'
                    : 'text-slate-200 hover:bg-slate-800'}
                `}
              >
                {/* モバイルは短縮、sm以上でフル */}
                <span className="hidden sm:block text-xs leading-none nav-nowrap px-1">
                  {item.name}
                </span>
                <span className="sm:hidden block text-[11px] leading-none nav-nowrap px-1">
                  {item.short}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
