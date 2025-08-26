'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SettingsButton() {
  const router = useRouter();
  const pathname = usePathname();

  const onSettingsPage = pathname?.startsWith('/settings');

  const handleClick = () => {
    if (onSettingsPage) {
      // 設定ページに居る → 1ページ戻る（直遷移で履歴が無い場合はホームへ）
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/'); // 直リンクで来た場合のフォールバック
      }
    } else {
      // 設定ページ以外 → 設定へ
      router.push('/settings');
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={onSettingsPage ? '設定を閉じる' : '設定を開く'}
      className="
        fixed 
        top-[calc(env(safe-area-inset-top,0px)+12px)] 
        right-[calc(env(safe-area-inset-right,0px)+12px)]
        z-[120]
        inline-flex items-center justify-center
        h-11 w-11 rounded-full
        bg-white/90 hover:bg-white
        shadow-lg ring-1 ring-black/10
        transition
      "
    >
      {onSettingsPage ? (
        // × アイコン（閉じる）
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-800"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        // 歯車（開く）
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-800"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.82 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.82 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.82-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.82-3.31 2.37-2.37.996.608 2.296.223 2.956-1.066z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      )}
    </button>
  );
}
