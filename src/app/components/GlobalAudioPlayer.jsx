// src/app/components/GlobalAudioPlayer.jsx
'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import ImageWithFallback from '@/components/ImageWithFallback';
import LyricsPanel from '@/components/LyricsPanel';
import EmotePicker from '@/components/EmotePicker';
import EmoteOverlay from '@/components/EmoteOverlay';
import { useSettings } from '@/context/SettingsContext';

export default function GlobalAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoadingAudio,
    currentTime,
    duration,
    togglePlayPause,
    playNextTrack,
    playPrevTrack,
    seekTo,
    playbackOrigin,
  } = useAudioPlayer() || {};

  const { shuffleArtistVisible } = useSettings();
  const hideArtist = playbackOrigin === 'shuffle' && !shuffleArtistVisible;

  const [showLyricsPanelLocally, setShowLyricsPanelLocally] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const emoteLayerRef = useRef(null);
  const emoteBtnRef = useRef(null);

  if (!currentTrack) return null;

  const formatTime = (t = 0) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e) => {
    seekTo(Number(e.target.value));
  };

  const handleLyricsButtonClick = () => {
    setShowLyricsPanelLocally((v) => !v);
    setShowEmotePicker(false);
  };

  const handleEmoteButtonClick = () => {
    if (!currentTrack || typeof currentTime !== 'number' || isNaN(currentTime)) {
      alert('エモートを送るには、まず楽曲を再生してください。');
      return;
    }
    setShowEmotePicker((v) => !v);
    setShowLyricsPanelLocally(false);
  };

  // ---- 表示用に artist/work 情報を安全に拾う ----
  const artistId =
    currentTrack?.artist_id ||
    currentTrack?.artist?.id ||
    currentTrack?.works?.artists?.id;

  const artistName =
    currentTrack?.artist_name ||
    currentTrack?.artist?.name ||
    currentTrack?.works?.artists?.name;

  const workId =
    currentTrack?.work_id ||
    currentTrack?.work?.id ||
    currentTrack?.works?.id;

  const workTitle =
    currentTrack?.work_title ||
    currentTrack?.work?.title ||
    currentTrack?.works?.title;

  return (
    <>
      {/* プレイヤー本体 */}
      <div className="fixed bottom-16 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg z-50 rounded-t-xl h-20 ">
        <div
          ref={emoteLayerRef}
          className="relative max-w-4xl mx-auto flex items-center justify-between gap-4 h-full"
        >
          {/* エモートのオーバーレイ（absoluteでこのラッパの上に重ねる） */}
          <EmoteOverlay />

          {/* ジャケット + タイトル・アーティスト・作品 */}
          <div className="flex items-center gap-4 flex-grow min-w-0">
            <ImageWithFallback
              src={currentTrack?.jacket_url || currentTrack?.work?.jacket_url}
              alt={currentTrack?.title || '楽曲のジャケット'}
              className="w-12 h-12 object-cover rounded-md flex-shrink-0 select-none"
              fallbackSrc="https://placehold.co/100x100/444444/999999?text=No+Img"
            />

            <div className="flex flex-col truncate">
              {/* 曲名 */}
              <span className="text-lg font-semibold truncate select-none">
                {currentTrack?.title}
              </span>

              {/* アーティスト名・作品名（リンク化） */}
              <div className="truncate select-none">
                {/* シャッフルセッション中 && 非表示設定 の場合は描画しない */}
                {!(shuffleArtistVisible) && (
                  <span className="flex items-center gap-1">

                    {/* アーティスト */}
                    {artistId ? (
                        <Link
                          href={`/artists/${artistId}`}
                          className="font-semibold text-sm text-gray-100 hover:text-indigo-300 truncate"
                        >
                          {artistName || 'Unknown Artist'}
                        </Link>
                      ) : (
                        <span className="font-semibold text-sm text-gray-100 truncate">
                          {artistName || 'Unknown Artist'}
                        </span>
                      )}

                    <span className="text-gray-400">·</span>

                    {/* 作品 */}
                    {artistId && workId && workTitle ? (
                      <Link
                        href={`/artists/${artistId}#work-${workId}`}
                        className="text-xs text-gray-300 underline hover:text-indigo-300 truncate"
                      >
                        {workTitle}
                      </Link>
                    ) : workTitle ? (
                      <span className="text-xs text-gray-300 truncate">{workTitle}</span>
                    ) : null}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* コントロール */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={playPrevTrack}
              className="text-white hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-2 transition-transform transform hover:scale-110 text-2xl select-none"
              aria-label="前の曲へ"
              disabled={isLoadingAudio}
            >
              ⏪
            </button>

            <button
              onClick={togglePlayPause}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-500 select-none"
              aria-label={isPlaying ? '一時停止' : '再生'}
              disabled={isLoadingAudio}
            >
              {isLoadingAudio ? (
                <svg
                  className="animate-spin h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14m8-14v14" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
              )}
            </button>

            <button
              onClick={playNextTrack}
              className="text-white hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-2 transition-transform transform hover:scale-110 text-2xl select-none"
              aria-label="次の曲へ"
              disabled={isLoadingAudio}
            >
              ⏩
            </button>
          </div>

          {/* シーク & アクション */}
          <div className="flex items-center gap-2 w-full max-w-sm flex-shrink">
            <span className="text-sm text-gray-200 select-none">{formatTime(currentTime)}</span>

            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm accent-indigo-500 select-none"
              style={{ WebkitAppearance: 'none' }}
              disabled={isLoadingAudio}
            />

            <span className="text-sm text-gray-200 select-none">{formatTime(Number(duration))}</span>

            {/* 歌詞ボタン（曲があれば常に表示） */}
            {currentTrack && (
              <button
                onClick={handleLyricsButtonClick}
                className="ml-2 text-white hover:text-indigo-400 text-sm py-1 px-2 rounded-md border border-gray-600 hover:border-indigo-400 transition-colors duration-200 relative z-30 select-none"
                aria-label="歌詞を表示/非表示"
              >
                歌詞
              </button>
            )}

            {/* エモートボタン */}
            <button
              ref={emoteBtnRef}
              onClick={handleEmoteButtonClick}
              className="ml-2 text-white hover:text-indigo-400 text-sm py-1 px-2 rounded-md border border-gray-600 hover:border-indigo-400 transition-colors duration-200 relative z-30 select-none"
              aria-label="エモートを送る"
            >
              💬
            </button>

            {showEmotePicker && currentTrack && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[80]">
                <EmotePicker
                  trackId={currentTrack.id}
                  timestampSeconds={currentTime}
                  onClose={() => setShowEmotePicker(false)}
                  layerRef={emoteLayerRef}
                  anchorRef={emoteBtnRef}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 歌詞パネル */}
      <LyricsPanel
        currentTrack={currentTrack}
        showLyricsPanel={showLyricsPanelLocally}
        toggleLyricsPanel={() => setShowLyricsPanelLocally((v) => !v)}
      />
    </>
  );
}
