// src/app/components/GlobalNavbar.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UploadButton from './UploadButton';
import SettingsButton from './SettingsButton';

export default function GlobalNavbar() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  if (!isMounted) return null;

  const navItems = [
    { name: 'ホーム', href: '/' },
    { name: '検索', href: '/search' },
    { name: 'ライブラリ', href: '/library' },
    { name: 'アカウント / コミュニティ', href: '/community' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-2 shadow-lg z-50 h-16 pb-[calc(env(safe-area-inset-bottom)+8px)]">
      <div className="max-w-4xl mx-auto h-full px-3 flex items-center justify-between">
        {/* 左：通常メニュー */}
        <div className="flex-1 flex justify-around items-center">
          {navItems.map((item) => (
            <Link href={item.href} key={item.name} className="flex-1 text-center">
              <div
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 select-none
                  ${pathname === item.href ? 'text-indigo-400 bg-gray-700' : 'text-gray-100 hover:bg-gray-700 hover:text-white'}`}
              >
                <span className="text-sm font-medium">{item.name}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* 右：＋ と ⚙ */}
        <div className="ml-4 flex items-center gap-3">
          <UploadButton />
          <SettingsButton />
        </div>
      </div>
    </nav>
  );
}
