// src/app/components/ImageWithFallback.jsx
'use client'; // これが重要！このコンポーネントはクライアントコンポーネントです

import React from 'react';

export default function ImageWithFallback({ src, alt, className, fallbackSrc }) {
  const handleError = (e) => {
    // 画像の読み込みに失敗した場合に、代替画像を表示する
    e.currentTarget.src = fallbackSrc || "https://placehold.co/200x200/cccccc/333333?text=No+Image";
    e.currentTarget.onerror = null; // 無限ループを防ぐため、エラーハンドラを解除
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError} // イベントハンドラはここに記述
    />
  );
}
