'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function UploadButton() {
  const router = useRouter();
  const pathname = usePathname();

  const onUploadPage = pathname?.startsWith('/upload');

  const handleClick = () => {
    if (onUploadPage) {
      // アップロードページに居る → 戻る（履歴なしならホームへ）
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    } else {
      // それ以外 → /upload へ
      router.push('/upload');
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={onUploadPage ? '投稿を閉じる' : '投稿ページを開く'}
      className="
        fixed
        top-[calc(env(safe-area-inset-top,0px)+12px)]
        /* ← 歯車の左側に並べるため、歯車の幅(44px) + 余白(12px)ぶん左に寄せる */
        right-[calc(env(safe-area-inset-right,0px)+12px+44px+12px)]
        z-[120]
        inline-flex items-center justify-center
        h-11 w-11 rounded-full
        bg-indigo-600 hover:bg-indigo-700
        text-white
        shadow-lg ring-1 ring-black/10
        transition
      "
    >
      {/* プラスアイコン */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}
