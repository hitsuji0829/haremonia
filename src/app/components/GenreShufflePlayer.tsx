'use client';

import React, { useMemo, useState } from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

type Track = {
  id: string | number;
  title: string;
  genre?: string | null;
  audio_url?: string | null;
  duration?: string | null;
  // ほかに付いていてもOK
};

type GenreOption = { label: string; value: string };

type Props = {
  allTracks: Track[];
  /** 新方式： {label, value} 配列（推奨） */
  genreOptions?: ReadonlyArray <GenreOption>;
  /** 旧方式： string の配列（後方互換のために残す） */
  uniqueGenres?: ReadonlyArray <string>;
};

export default function GenreShufflePlayer({
  allTracks,
  genreOptions,
  uniqueGenres
}: Props) {
  const { playTrack } = useAudioPlayer();

  // 表示に使うセレクトの選択肢を統一化（先頭に「全ジャンル」）
  const options = useMemo<ReadonlyArray<GenreOption>>(() => {
    if (genreOptions?.length) {
      const hasAll = genreOptions.some((g) => g.value === 'all');
      return hasAll
        ? genreOptions // Readonly のまま返せる
        : [{ label: '全ジャンル', value: 'all' }, ...genreOptions];
    }
    const uniq = Array.from(new Set((uniqueGenres ?? []).filter(Boolean))).sort();
    return [{ label: '全ジャンル', value: 'all' }, ...uniq.map(g => ({ label: g, value: g }))];
  }, [genreOptions, uniqueGenres]);

  const [selected, setSelected] = useState<string>('all');

  // 選択ジャンルでフィルタ（value を使う）
  const filteredTracks = useMemo(() => {
    if (selected === 'all') return allTracks;
    return allTracks.filter(t => (t.genre ?? 'other') === selected);
  }, [allTracks, selected]);

  // Fisher-Yates シャッフル
  const shuffleArray = (arr: Track[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const handleRandomPlay = () => {
    if (!filteredTracks.length) {
      alert('このジャンルには再生できる楽曲がありません。');
      return;
    }
    const playlist = shuffleArray(filteredTracks);
    // 先頭曲を再生開始（プレイリストごと渡す）
    playTrack?.(playlist[0], playlist, 0);
  };

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-4 mb-8">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 select-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <button
        onClick={handleRandomPlay}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500 select-none"
      >
        🎶 シャッフル再生
      </button>
    </div>
  );
}
