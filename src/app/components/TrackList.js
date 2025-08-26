// src/app/components/TrackList.js
'use client'; // クライアントコンポーネントであることを明示

import React from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext'; // 絶対パスに統一
import FavoriteButton from '@/components/FavoriteButton'; // 絶対パスに統一

export default function TrackList({ tracks }) {
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();

  if (!tracks || tracks.length === 0) {
    return (
      <p className="text-gray-500 text-sm p-4 select-none">この作品にはまだトラックが登録されていません。</p> // ★ select-none 追加
    );
  }

  return (
    <div className="bg-gray-50 p-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-3 select-none">トラックリスト</h3> {/* ★ select-none 追加 */}

      {tracks.map((track, index) => (
        <div
          key={track.id}
          className="flex items-center gap-4 p-3 border-b border-gray-100 last:border-b-0 bg-white hover:bg-indigo-50 transition-colors duration-200 rounded-md mb-2"
        >
          <button
            onClick={() => playTrack(track, tracks, index)}
            className="text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1 transition-transform transform hover:scale-110 select-none" // ★ select-none 追加
          >
            {currentTrack && currentTrack.id === track.id && isPlaying ? '⏸' : '▶'}
          </button>
          <span className="font-medium text-gray-700 select-none">{index + 1}.</span> {/* ★ select-none 追加 */}
          <span className="flex-grow text-gray-800 select-none">{track.title}</span> {/* ★ select-none 追加 */}
          <span className="text-sm text-gray-500 select-none">{track.duration}</span> {/* ★ select-none 追加 */}
          <FavoriteButton trackId={track.id} />
        </div>
      ))}
    </div>
  );
}
