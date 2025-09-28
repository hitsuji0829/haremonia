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
import MarqueeText from './MarqueeText';

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

  const { hideArtistWorkInPlayer } = useSettings();

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

  const handleLyricsButtonClick = (e) => {
    e.stopPropagation();
    setShowEmotePicker(false);
    setShowLyricsPanelLocally(v => !v);
  };

  const handleEmoteButtonClick = (e) => {

    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!currentTrack || typeof currentTime !== 'number' || isNaN(currentTime)) {
      alert('エモートを送るには、まず楽曲を再生してください。');
      return;
    }
    setShowLyricsPanelLocally(false);
    setTimeout(() => setShowEmotePicker(((v) => !v)), 0);
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
    <div
      className="fixed left-0 right-0 z-[60] bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80 rounded-t-xl border-t border-slate-700/60 shadow-lg"
      style={{
        bottom: 'calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px) + var(--player-gap, 0px))'
      }}
    >
    <div ref={emoteLayerRef} className="relative mx-auto max-w-5xl px-3 py-2 sm:px-4 sm:py-3">
      {/* エモートを両レイアウト共通で上に重ねる */}
      <div className="pointer-events-none absolute inset-0 z-[70]">
        <EmoteOverlay />
      </div>
        {/* ===== モバイル版：2段レイアウト（md 未満だけ表示） ===== */}
        <div className="md:hidden">
          {/* 上段：ジャケット / タイトル +（右）操作 */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
            <ImageWithFallback
              src={currentTrack?.jacket_url || currentTrack?.work?.jacket_url}
              alt={currentTrack?.title || '楽曲のジャケット'}
              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md flex-shrink-0 select-none"
              fallbackSrc="https://placehold.co/100x100/444444/999999?text=No+Img"
            />

            {/* タイトル & サブ情報 */}
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 min-w-0">
                <MarqueeText
                  text={currentTrack?.title || ''}
                  className="text-base sm:text-lg font-semibold select-none"
                />

                {/* 右端：前/再生/次（固定幅でタイトル長に影響させない） */}
                <div className="ml-auto grid grid-cols-3 gap-3 sm:gap-2 shrink-0 items-center pt-1">
                  <button
                    onClick={playPrevTrack}
                    className="text-white hover:text-indigo-400 rounded-full p-1.5 sm:p-2 text-lg sm:text-2xl select-none"
                    aria-label="前の曲へ"
                    disabled={isLoadingAudio}
                  >⏪</button>

                  <button
                    onClick={togglePlayPause}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 sm:p-3 select-none"
                    aria-label={isPlaying ? '一時停止' : '再生'}
                    disabled={isLoadingAudio}
                  >
                    {isPlaying ? (
                      <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14m8-14v14" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={playNextTrack}
                    className="text-white hover:text-indigo-400 rounded-full p-1.5 sm:p-2 text-lg sm:text-2xl select-none"
                    aria-label="次の曲へ"
                    disabled={isLoadingAudio}
                  >⏩</button>
                </div>
              </div>

              <div
                className={`
                  text-xs text-gray-300 truncate
                  h-4 sm:h-5 leading-4 sm:leading-5
                  transition-opacity
                  ${hideArtistWorkInPlayer ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}
                `}
              >
                {artistId ? (
                  <Link
                    href={`/artists/${artistId}`}
                    className="font-medium hover:text-indigo-300 underline-offset-2 hover:underline"
                  >
                    {artistName || 'Unknown Artist'}
                  </Link>
                ) : (
                  <span className="font-medium">{artistName || 'Unknown Artist'}</span>
                )}
              </div>
            </div>
          </div>

          {/* 下段：時刻・薄いシーク・歌詞・💬（5カラムで固定配置） */}
          <div className="mt-2 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2">
            <span className="text-[11px] sm:text-sm w-10 text-right select-none">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="hare-range w-full select-none"
              disabled={isLoadingAudio}
            />

            <span className="text-[11px] sm:text-sm w-10 select-none">
              {formatTime(Number(duration))}
            </span>

            {currentTrack && (
              <button
                onClick={handleLyricsButtonClick}
                className="text-white hover:text-indigo-400 text-[11px] sm:text-sm py-1 px-2 rounded-md border border-gray-600 hover:border-indigo-400 select-none"
                aria-label="歌詞を表示/非表示"
              >歌詞</button>
            )}

            <div className="relative">

              
            </div>
          </div>
        </div>

        {/* 💬 フローティングボタン（モバイル専用） */}
        {currentTrack && (
          <div className="md:hidden fixed bottom-[calc(var(--bottom-nav-h,0px)+4rem)] right-4 z-[70]">
            <button
              ref={emoteBtnRef}
              onClick={handleEmoteButtonClick}
              onTouchStart={(e) => e.stopPropagation()}
              aria-label="エモートを送る"
              className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center text-xl hover:bg-indigo-700 active:scale-95 transition"
            >
              💬
            </button>

            {showEmotePicker && !showLyricsPanelLocally && currentTrack && (
              <div
                className="pointer-events-auto absolute bottom-1 right-full mr-2 z-[200]"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
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
        )}



        

        {/* ===== PC版：横一列（md 以上だけ表示） ===== */}
        <div className="hidden md:flex items-center gap-3 px-3 py-2">
          {/* ジャケット */}
          <ImageWithFallback
            src={currentTrack?.jacket_url || currentTrack?.work?.jacket_url}
            alt={currentTrack?.title || '楽曲のジャケット'}
            className="w-10 h-10 object-cover rounded-md flex-shrink-0 select-none"
          />

          {/* タイトル・サブ情報 */}
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden relative h-6">
              <div className="whitespace-nowrap animate-marquee text-base font-semibold leading-6">
                {currentTrack?.title}
              </div>
            </div>
                        <div
              className={`
                text-xs text-gray-300 truncate
                h-4 leading-4
                transition-opacity
                ${hideArtistWorkInPlayer ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}
              `}
            >
              {artistId ? (
                <Link
                  href={`/artists/${artistId}`}
                  className="font-medium hover:text-indigo-300 underline-offset-2 hover:underline select-none"
                >
                  {artistName || 'Unknown Artist'}
                </Link>
              ) : (
                <span className="font-medium">
                  {artistName || 'Unknown Artist'}
                </span>
              )}
            </div>
          </div>

          {/* 前/再生/次 */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={playPrevTrack} className="text-2xl hover:text-indigo-400">⏪</button>
            <button
              onClick={togglePlayPause}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3"
              aria-label={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14m8-14v14" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
              )}
            </button>
            <button onClick={playNextTrack} className="text-2xl hover:text-indigo-400">⏩</button>
          </div>

          {/* 時刻・シーク（幅を固定気味にして安定） */}
          <div className="flex items-center gap-2 w-[32rem] max-w-[38vw]">
            <span className="tabular-nums">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e)=>seekTo(Number(e.target.value))}
              className="hare-range w-full"
            />
            <span className="tabular-nums">{formatTime(Number(duration))}</span>
          </div>

          {/* 歌詞／💬 */}
          <div className="relative flex items-center gap-2 shrink-0">
            <button
              onClick={handleLyricsButtonClick}
              className="border border-gray-600 hover:border-indigo-400 rounded-md px-2 py-1 text-sm"
            >歌詞</button>

            <button
              ref={emoteBtnRef}
              onClick={handleEmoteButtonClick}
              className="border border-gray-600 hover:border-indigo-400 rounded-md px-2 py-1 text-sm"
            >💬</button>

            {showEmotePicker && currentTrack && (
              <div className="pointer-events-auto absolute bottom-full right-0 mb-2 z-[200]">
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

      {/* 極薄レンジの見た目 */}
      <style jsx>{`
        .hare-range {
          -webkit-appearance: none;
          height: 4px;                  /* ★ 超薄 */
          background: rgba(255,255,255,.22);
          border-radius: 9999px;
          outline: none;
        }
        .hare-range:disabled { opacity: .6; }

        .hare-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          border-radius: 9999px;
          background: #6366f1;          /* indigo-500 */
          box-shadow: 0 0 0 3px rgba(99,102,241,.3);
          margin-top: -6px;              /* トラック中央に合わせる */
        }
        .hare-range::-moz-range-thumb {
          width: 16px; height: 16px;
          border: 0; border-radius: 9999px;
          background: #6366f1;
        }
      `}</style>
    </div>


    {/* 歌詞パネル（閉時は pointer-events 無効） */}
    <LyricsPanel
      currentTrack={currentTrack}
      showLyricsPanel={showLyricsPanelLocally}
      toggleLyricsPanel={() => setShowLyricsPanelLocally((v) => !v)}
    />
  </>
);

}
