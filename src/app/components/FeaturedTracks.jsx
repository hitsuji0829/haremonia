// src/app/components/FeaturedTracks.jsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import ImageWithFallback from '@/components/ImageWithFallback';

export default function FeaturedTracks({ tracks = [] }) {
  const { playTrack } = useAudioPlayer();

  if (!tracks.length) {
    return <p className="text-gray-300 select-none">おすすめ曲がまだありません。</p>;
  }

  const handlePlay = (idx) => {
    if (!playTrack) return;
    // おすすめ3曲を“そのまま”プレイリストとして再生開始
    playTrack(tracks[idx], tracks, idx);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {tracks.map((t, i) => (
        <div key={t.id} className="bg-white/95 rounded-xl shadow hover:shadow-lg transition p-3">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={t.jacket_url}
              alt={t.work_title || 'ジャケット'}
              className="w-16 h-16 object-cover rounded-md"
              fallbackSrc="https://placehold.co/100x100/cccccc/333333?text=No+Img"
            />

            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate select-none">{t.title}</div>

              <div className="text-sm text-gray-600 truncate">
                {/* アーティスト名リンク */}
                {t.artist_id ? (
                  <Link href={`/artists/${t.artist_id}`} className="underline hover:text-indigo-600 select-none">
                    {t.artist_name}
                  </Link>
                ) : (
                  <span>{t.artist_name}</span>
                )}

                {/* ・作品名リンク */}
                {t.artist_id && t.work_id && t.work_title && (
                  <>
                    <span className="text-gray-400"> · </span>
                    <Link
                      href={`/artists/${t.artist_id}#work-${t.work_id}`}
                      className="text-xs underline hover:text-indigo-600 select-none"
                    >
                      {t.work_title}
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-2">
                <button
                  onClick={() => handlePlay(i)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                >
                  ▶ 再生
                </button>
              </div>
            </div>
          </div>

          {t.genre && (
            <div className="mt-2 text-xs text-gray-500">
              {t.genre}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
