'use client';

import { useEffect, useRef, useState } from 'react';

function useAutoHeight(deps: any[] = []) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [max, setMax] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    setMax(ref.current.scrollHeight);
  }, deps);
  return { ref, max };
}

export default function ArtistBioToggle({ bio }: { bio?: string | null }) {
  // bio が空なら何も表示しない
  if (!bio || !bio.trim()) return null;

  const [open, setOpen] = useState(false);
  const { ref, max } = useAutoHeight([bio, open]);

  return (
    <div className="ml-auto">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls="artist-bio"
        className="inline-flex items-center justify-center rounded-full w-9 h-9
                   bg-gray-100 text-gray-700 hover:bg-gray-200 transition
                   border border-gray-300 shadow-sm"
        title="プロフィールを表示"
      >
        <span className={`text-2xl leading-none transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>＋</span>
      </button>

      <div
        id="artist-bio"
        className="mt-3 overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? max : 0 }}
      >
        <div
          ref={ref}
          className="text-sm text-gray-700 whitespace-pre-wrap select-none border-t border-gray-200 pt-3"
        >
          {bio}
        </div>
      </div>
    </div>
  );
}
