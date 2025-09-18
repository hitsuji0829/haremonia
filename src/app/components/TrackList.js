// src/app/components/TrackList.js
'use client';

import React from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import FavoriteButton from '@/components/FavoriteButton';
import { formatDuration } from '@/lib/formatDuration';

export default function TrackList({ tracks }) {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  if (!tracks || tracks.length === 0) {
    return (
      <p className="text-gray-500 text-sm p-4 select-none">
        この作品にはまだトラックが登録されていません。
      </p>
    );
  }

  const handleRowClick = (track, index) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause?.();
    } else {
      playTrack?.(track, tracks, index);
    }
  };

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
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(track, index)}
            onKeyDown={(e) => handleRowKeyDown(e, track, index)}
            className="
              flex items-center gap-4 p-4 rounded-lg mb-2
              bg-indigo-50/60 hover:bg-indigo-100
              transition-colors duration-200 cursor-pointer
              outline-none focus:ring-2 focus:ring-indigo-400
            "
          >
            {/* 左：再生/一時停止のアイコン（行全体で反応する） */}
            <span className="text-indigo-600 text-lg select-none shrink-0">
              {isCurrent && isPlaying ? '⏸' : '▶'}
            </span>

            {/* ★ 中央：タイトル（番号は削除・1行省略） */}
            <div className="min-w-0 flex-1">
              <span
                className="block min-w-0 leading-snug text-gray-800 text-base font-medium
                           whitespace-nowrap overflow-hidden text-ellipsis select-none"
                title={track.title}
              >
                {track.title}
              </span>
            </div>

            {/* 右：再生時間（とても小さい画面で隠したい場合は hidden sm:inline に） */}
            <span className="text-sm text-gray-500 select-none shrink-0">
              {formatDuration(track.duration)}
            </span>

            {/* さらに右：お気に入り（行クリックに伝播させない） */}
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="ml-1 shrink-0"
            >
              <FavoriteButton trackId={track.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
