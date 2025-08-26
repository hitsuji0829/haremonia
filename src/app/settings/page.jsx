'use client';

import React from 'react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { useSettings } from '../context/SettingsContext';

export default function SettingsPage() {
  const { emotesEnabled, toggleEmotes } = useAudioPlayer(); // ← 追加
  const { showEmotes, setShowEmotes, emoteOpacity, setEmoteOpacity, shuffleArtistVisible, setShuffleArtistVisible} = useSettings();

  return (
    <main className="p-4 max-w-4xl mx-auto min-h-screen mb-40">
      <h1 className="text-3xl font-bold mb-6 text-white select-none">設定</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-3 select-none">表示</h2>

        {/* エモート表示トグル（iOS風） */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4">
        <div>
            <p className="text-white font-medium">エモートの表示</p>
            <p className="text-sm text-gray-300">再生バー周辺に出る絵文字を表示・非表示にします。</p>
        </div>

        <button
            type="button"
            role="switch"
            aria-checked={showEmotes}
            onClick={() => setShowEmotes(!showEmotes)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200
            ${showEmotes ? 'bg-indigo-600' : 'bg-gray-300'}
            focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
        >
            {/* 見えないラベル（アクセシビリティ） */}
            <span className="sr-only">エモートの表示</span>

            {/* ノブ（白丸） */}
            <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow
                transition-transform duration-200 will-change-transform
                ${showEmotes ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
        </div>

      </section>

      {/* エモート透明度 */}
      <section className={`rounded-xl p-4 shadow ${showEmotes ? 'bg-white/90' : 'bg-gray-200/70 opacity-60 pointer-events-none'}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-semibold text-gray-900">エモートの透明度</h2>
            <p className="text-gray-500 text-sm">重なっても主張し過ぎないように調整できます。</p>
          </div>
          <div className="text-sm text-gray-700 tabular-nums">{Math.round(emoteOpacity * 100)}%</div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(emoteOpacity * 100)}
          onChange={(e) => setEmoteOpacity(Number(e.target.value) / 100)}  // // 追加した箇所
          className="w-full accent-indigo-600"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-3 select-none">再生バー</h2>

        {/* シャッフル再生時のアーティスト名表示トグル */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4">
            <div>
                <p className="text-white font-medium">アーティスト名・作品名を非表示</p>
                <p className="text-sm text-gray-300">
                    再生バーのアーティスト名および作品名を、表示・非表示にします。
                </p>
            </div>

            <button
                type="button"
                role="switch"
                aria-checked={shuffleArtistVisible}
                onClick={() => setShuffleArtistVisible(!shuffleArtistVisible)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200
                ${shuffleArtistVisible ? 'bg-indigo-600' : 'bg-gray-300'}
                focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
            >
                <span className="sr-only">アーティスト名・作品名の表示</span>
                <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow
                    transition-transform duration-200 will-change-transform
                    ${shuffleArtistVisible ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </div>
      </section>


      {/* 今後ここに他の設定を追加 */}
    </main>
  );
}
