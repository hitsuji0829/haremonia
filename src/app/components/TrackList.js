// src/app/components/TrackList.js
'use client';

import React from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import FavoriteButton from '@/components/FavoriteButton';
import { formatDuration } from '@/lib/formatDuration';

export default function TrackList({ tracks }) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer(); // ★ togglePlayPauseを使う

  if (!tracks || tracks.length === 0) {
    return (
      <p className="text-gray-500 text-sm p-4 select-none">
        この作品にはまだトラックが登録されていません。
      </p>
    );
  }

  // 行クリック時の挙動（同じ曲なら一時停止/再開、別曲ならその曲を再生）
  const handleRowClick = (track, index) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause?.();
    } else {
      playTrack?.(track, tracks, index);
    }
  };

  // キーボード操作 (Enter / Space)
  const handleRowKeyDown = (e, track, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(track, index);
    }
  };

  return (
    <div className="bg-gray-50 p-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-3 select-none">トラックリスト</h3>

      {tracks.map((track, index) => {
        const isCurrent = currentTrack && currentTrack.id === track.id;

        return (
          <div
            key={track.id}
            role="button"                              // ★ アクセシビリティ
            tabIndex={0}
            onClick={() => handleRowClick(track, index)}      // ★ 行全体クリック
            onKeyDown={(e) => handleRowKeyDown(e, track, index)}
            className="
              flex items-center gap-4 p-4 rounded-lg mb-2
              bg-indigo-50/60 hover:bg-indigo-100
              transition-colors duration-200 cursor-pointer
              outline-none focus:ring-2 focus:ring-indigo-400
            "
          >
            {/* 先頭の再生アイコン（クリックしなくても行で反応する） */}
            <span className="text-indigo-600 text-lg select-none">
              {isCurrent && isPlaying ? '⏸' : '▶'}
            </span>

            <span className="font-medium text-gray-700 select-none w-8 text-right">
              {index + 1}.
            </span>

            <span className="flex-grow text-gray-800 select-none truncate">
              {track.title}
            </span>

            <span className="text-sm text-gray-500 select-none">
              {formatDuration(track.duration)}
            </span>

            {/* ★ ここだけクリックを無効化（行クリックに伝播させない） */}
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="ml-1"
            >
              <FavoriteButton trackId={track.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
