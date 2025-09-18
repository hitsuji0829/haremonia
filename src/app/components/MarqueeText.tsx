// src/components/MarqueeText.tsx (JSでもOK: .jsx にして中の型注釈を外す)
'use client';
import React, { useEffect, useRef, useState } from 'react';

export default function MarqueeText({
  text,
  speed = 60, // px/sec
  className = '',
}: { text: string; speed?: number; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [needScroll, setNeedScroll] = useState(false);
  const [duration, setDuration] = useState(10);

  useEffect(() => {
    const wrap = wrapRef.current;
    const span = textRef.current;
    if (!wrap || !span) return;
    const wrapW = wrap.clientWidth;
    const textW = span.scrollWidth;
    const overflow = textW - wrapW;
    const should = overflow > 8; // ちょい余白
    setNeedScroll(should);
    if (should) {
      setDuration((textW + wrapW) / speed); // 行き切る時間
    }
  }, [text, speed]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${needScroll ? 'marquee-run' : ''}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {text}
        {needScroll && <>&nbsp;&nbsp;&nbsp;{text}</>}
      </span>
      <style jsx>{`
        .marquee-run {
          will-change: transform;
          animation-name: marqueeSlide;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes marqueeSlide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
