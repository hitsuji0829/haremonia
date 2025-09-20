// src/app/components/ArtistBioToggle.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  bio?: string | null;
  maxChars?: number;      // 省略時のトリム長
  className?: string;
};

export default function ArtistBioToggle({
  bio = '',
  maxChars = 140,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // bio の長さをチェック
  useEffect(() => {
    setIsLong((bio ?? '').length > maxChars);
  }, [bio, maxChars]);

  // bio が無ければ null を返す
  if (!bio) return null;

  const text = bio ?? '';
  const shown = useMemo(
    () => (expanded || !isLong ? text : text.slice(0, maxChars) + '…'),
    [expanded, isLong, text, maxChars]
  );

  return (
    <div className={className}>
      <div ref={textRef} className="text-sm text-gray-800 whitespace-pre-wrap">
        {shown}
      </div>

      {isLong && (
        <button
          type="button"
          className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm underline underline-offset-2"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '閉じる' : 'もっと見る'}
        </button>
      )}
    </div>
  );
}
