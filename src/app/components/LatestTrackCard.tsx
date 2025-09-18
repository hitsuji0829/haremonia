'use client';

import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

type Track = {
  id: string | number;
  title: string;
  audio_url?: string | null;
  genre?: string | null;
  created_at?: string | null;
  jacket_url?: string | null;
  artist_name?: string | null;
  artist_id?: string | number | null;
  // 互換用（どれかが入っている可能性）
  artist?: { id?: string | number; name?: string | null } | null;
  works?: { id?: string | number | null; title?: string | null; jacket_url?: string | null; artists?: { id?: string | number | null; name?: string | null } | null } | null;
};

export default function LatestTrackCard({ track }: { track: Track }) {
  const { setTrackAndPlay } = useAudioPlayer() || {};

  // 安全に拾う
  const artistId =
    track?.artist_id ??
    track?.artist?.id ??
    track?.works?.artists?.id ??
    null;

  const artistName =
    track?.artist_name ??
    track?.artist?.name ??
    track?.works?.artists?.name ??
    'Unknown Artist';

  const isNew =
    !!track?.created_at &&
    Date.now() - new Date(track.created_at).getTime() < 24 * 60 * 60 * 1000;

  const onClickCard = () => {
    // カード全体クリックで即再生
    setTrackAndPlay?.(track, 'latest');
  };

  return (
    <div
      onClick={onClickCard}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClickCard()}
    >
      <div className="p-4 flex items-center gap-4">
        <ImageWithFallback
          src={track.jacket_url || 'https://placehold.co/200x200/cccccc/333333?text=No+Image'}
          alt={track.title || 'ジャケット'}
          className="w-16 h-16 object-cover rounded-md flex-shrink-0"
          fallbackSrc="https://placehold.co/100x100/aaaaaa/ffffff?text=No+Img"
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{track.title}</div>

          {/* アーティスト名クリックで遷移（カードの再生と競合しないように stopPropagation） */}
          <div className="text-xs text-gray-600 truncate">
            {artistId ? (
              <Link
                href={`/artists/${artistId}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline"
              >
                {artistName}
              </Link>
            ) : (
              <span>{artistName}</span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            {track.genre && (
              <span className="inline-flex items-center rounded bg-indigo-100 text-indigo-700 text-[11px] px-2 py-[2px]">
                {track.genre}
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center rounded bg-pink-100 text-pink-700 text-[11px] px-2 py-[2px]">
                NEW
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
