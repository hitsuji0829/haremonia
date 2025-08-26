// src/app/community/_components/ArtistCommentDisplay.jsx
'use client'; // クライアントコンポーネントであることを明示

import React, { useState, useEffect } from 'react';
import ImageWithFallback from '@/components/ImageWithFallback'; // 絶対パスに統一
import CommentSection from './CommentSection'; // コメントセクションコンポーネントをインポート (相対パスでOK)
import Link from 'next/link';

export default function ArtistCommentDisplay({ initialArtists }) {
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);

  console.log('--- ArtistCommentDisplay Client Component Render ---');
  console.log('ArtistCommentDisplay: 受け取ったinitialArtists:', initialArtists);

  // 初回ロード時にアーティスト一覧の最初のアーティストを自動選択する（任意）
  useEffect(() => {
    if (initialArtists && initialArtists.length > 0 && !selectedArtistId) {
      setSelectedArtistId(initialArtists[0].id);
      setSelectedArtist(initialArtists[0]);
      console.log('ArtistCommentDisplay: 初期アーティストを自動選択:', initialArtists[0].name);
    }
  }, [initialArtists, selectedArtistId]);


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* アーティスト選択サイドバー */}
      <aside className="lg:w-1/3 p-4 bg-white rounded-xl shadow-md flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-800 mb-4 select-none">アーティストを選択</h2>
        <p className="text-sm text-gray-600 mb-4 select-none">
          画像をクリックするとアーティストページに遷移します。
        </p>
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {initialArtists.map((artist) => (
            // 各アーティスト項目をボタンとして、コメント選択機能を持つ
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

      {/* コメント表示エリア */}
      <section className="lg:w-2/3 flex-grow">
        {selectedArtist ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-4 select-none"> {/* ★ 変更: select-none を追加 */}
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
