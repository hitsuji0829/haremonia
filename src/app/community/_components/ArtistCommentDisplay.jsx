// src/app/community/_components/ArtistCommentDisplay.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback';
import CommentSection from './CommentSection';
import Link from 'next/link';

export default function ArtistCommentDisplay({ initialArtists }) {
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);

  // ✅ 追加: 検索語
  const [query, setQuery] = useState('');

  // ✅ 追加: フィルタ済み配列（前後空白除去・大文字小文字無視）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialArtists || [];
    return (initialArtists || []).filter(a =>
      (a?.name || '').toLowerCase().includes(q)
    );
  }, [initialArtists, query]);

  // 初回選択（検索により候補が変わった時も最初の1件を選択）
  useEffect(() => {
    if (!selectedArtistId && filtered.length > 0) {
      setSelectedArtistId(filtered[0].id);
      setSelectedArtist(filtered[0]);
    }
  }, [filtered, selectedArtistId]);

  // 選択中が検索で見えなくなった場合のフォールバック
  useEffect(() => {
    if (selectedArtistId && !filtered.some(a => a.id === selectedArtistId)) {
      if (filtered.length > 0) {
        setSelectedArtistId(filtered[0].id);
        setSelectedArtist(filtered[0]);
      } else {
        setSelectedArtistId(null);
        setSelectedArtist(null);
      }
    }
  }, [filtered, selectedArtistId]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ========= サイドバー ========= */}
      <aside
        className="
          lg:w-1/3 rounded-xl shadow-md flex-shrink-0
          bg-white
          p-4
        "
      >
        <h2 className="text-xl font-bold text-gray-800 mb-3 select-none">
          アーティストを選択
        </h2>

        {/* ✅ 追加: 検索ボックス */}
        <div className="mb-3">
          <label htmlFor="artist-search" className="sr-only">アーティスト検索</label>
          <input
            id="artist-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="アーティスト名で検索"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="mt-1 text-xs text-gray-500 select-none">
            {filtered.length} / {(initialArtists || []).length} 件
          </div>
        </div>

        {/* ✅ 枠内スクロール（高さ固定） */}
        <div className="h-[400px] overflow-y-auto space-y-2">
          {initialArtists.map((artist) => (
            <button
              key={artist.id}
              onClick={() => {
                setSelectedArtistId(artist.id);
                setSelectedArtist(artist);
              }}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors duration-200
                ${selectedArtistId === artist.id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <div className="relative flex-shrink-0 group">
                <Link
                  href={`/artists/${artist.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block"
                >
                  <ImageWithFallback
                    src={artist.image_url}
                    alt={artist.name}
                    className="w-8 h-8 rounded-full object-cover select-none"
                    fallbackSrc="https://placehold.co/40x40/aaaaaa/ffffff?text=A"
                  />
                </Link>
                <div
                  className="absolute hidden group-hover:block top-1/2 left-full transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-20 w-max select-none"
                  style={{ pointerEvents: 'none' }}
                >
                  ページへ移動
                </div>
              </div>

              <span className="truncate select-none">{artist.name}</span>
            </button>
          ))}
        </div>

      </aside>

      {/* ========= コメント表示エリア ========= */}
      <section className="lg:w-2/3 flex-grow">
        {selectedArtist ? (
          <>
            <h2 className="text-2xl font-bold text-black dark:text-white mb-4 select-none">
              {selectedArtist.name} の掲示板
            </h2>
            <CommentSection artistId={selectedArtist.id} />
          </>
        ) : (
          <div className="p-6 bg-white rounded-xl shadow-md text-center text-gray-600 select-none">
            アーティストを選択してください。
          </div>
        )}
      </section>
    </div>
  );
}
