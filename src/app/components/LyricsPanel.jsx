// src/app/components/LyricsPanel.jsx
'use client'; // クライアントコンポーネントであることを明示

import React, {useEffect, useState} from 'react';
import ImageWithFallback from '@/components/ImageWithFallback'; // 絶対パスに統一
import { supabase } from '@/lib/supabaseClient';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

// propsとして currentTrack, showLyricsPanel, toggleLyricsPanel を受け取る
export default function LyricsPanel({ currentTrack, showLyricsPanel, toggleLyricsPanel }) {
  useBodyScrollLock(!!showLyricsPanel);
  // デバッグ用: 歌詞パネルの表示状態をログに出力
  console.log(`[LyricsPanel Render] showLyricsPanel: ${showLyricsPanel}, currentTrack.lyrics: ${currentTrack?.lyrics ? '存在します' : '存在しません'}`);

  const [lyrics, setLyrics] = useState(currentTrack?.lyrics || '');
  const [loading, setLoading] = useState(false);

  const [credits, setCredits] = useState({ lyricist: '', composer: '', arranger: '' });
  const [meta, setMeta] = useState({ year: null, artistName: '' });

  useEffect(() => {
    setLyrics(currentTrack?.lyrics || '');
    setCredits({
      lyricist: currentTrack?.lyricist || '',
      composer: currentTrack?.composer || '',
      arranger: currentTrack?.arranger || '',
    });
    setMeta((prev) => ({
      year: currentTrack?.created_at ? new Date(currentTrack.created_at).getFullYear() : prev.year,
      artistName: currentTrack?.artist_name || currentTrack?.artist?.name || prev.artistName,
    }))
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!showLyricsPanel || !currentTrack?.id) return;

    const needFetch =
      !lyrics?.trim() ||
      !credits.lyricist || !credits.composer || !credits.arranger ||
      !meta.artistName || !meta.year;
    if (!needFetch) return;

    let cancelled = false;
    (async ()=> {
      setLoading(true);
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          lyrics,
          lyricist,
          composer,
          arranger,
          created_at,
          works (
            id,
            title,
            jacket_url,
            created_at,
            artists ( id, name )
          )
        `)
        .eq('id', currentTrack.id)
        .single();

      if (!cancelled) {
        if (error) {
          console.error('歌詞取得エラー:', error);
          setLyrics('');
        } else {
          setLyrics((data?.lyrics ?? '').toString());
          setCredits({
            lyricist: data?.lyricist || '',
            composer: data?.composer || '',
            arranger: data?.arranger || '',
          });
          const artistFromJoin = data?.works?.artists?.name || '';
          const yearFromTrack = data?.created_at ? new Date(data.created_at).getFullYear() : null;
          const yearFromWork  = data?.works?.created_at ? new Date(data.works.created_at).getFullYear() : null;
          setMeta({
            year: yearFromTrack ?? yearFromWork ?? null,
            artistName: artistFromJoin || currentTrack?.artist_name || currentTrack?.artist?.name || '',
          })
        }
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [showLyricsPanel, currentTrack?.id, lyrics, credits, meta.artistName, meta.year]);

  // currentTrack がない、または歌詞がない場合は表示しない
  if (!currentTrack) {
    return null;
  }

  return (
    // fixed で画面右に固定。transform を使ってスライドイン/アウト
    // z-index を高く設定 (z-50 はナビゲーションバーと同じかそれ以上)
    // bottom を 9rem に設定し、高さを calc(100vh - 9rem) に設定
    <div
      className={`fixed right-0 w-full sm:w-96 bg-gray-900 text-white shadow-xl z-50
        transition-transform duration-300 ease-in-out overscroll-y-contain touch-pan-y
        ${showLyricsPanel ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ bottom: '9rem', height: 'calc(100vh - 9rem)' }}
      onWheelCapture={(e) => e.stopPropagation()}
      onTouchMoveCapture={(e) => e.stopPropagation()}
    >
      <div className="p-4 h-full flex flex-col pt-top-actions">

        {/* 楽曲情報 */}
        <div className="mb-4 pr-10">
          <h3 className="text-xl font-bold text-white break-words select-none">{currentTrack.title}</h3>
          <p className="text-sm text-gray-400 break-words select-none">
            {currentTrack.artist_name || currentTrack.artist?.name}
          </p>
        </div>

        {/* 歌詞表示エリア */}
        <div
          className="flex-grow overflow-y-auto p-2 text-gray-100 pb-28 sm:pb-2"
          style={{ WebkitOverflowScrolling: 'touch',
            paddingBottom: 'max(7rem, env(safe-area-inset-bottom))',
           }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          
          {loading ? (
            <p className="text-center text-gray-400 select-none">歌詞を読み込み中…</p>
          ) : lyrics && lyrics.trim().length > 0 ? (
            <>
              {/* 歌詞本体 */}
              <div className="whitespace-pre-wrap leading-relaxed select-none text-base">
                {lyrics}
              </div>

              {/* ★ 追加: クレジット＆著作権表示（歌詞の最下部に小さく） */}
              <div className="mt-4 border-t border-white/10 pt-2 text-xs text-gray-400 select-none">
                {(credits.lyricist || credits.composer || credits.arranger) && (
                  <div className="space-x-3">
                    {credits.lyricist && <span>作詞: {credits.lyricist}</span>}
                    {credits.composer && <span>作曲: {credits.composer}</span>}
                    {credits.arranger && <span>編曲: {credits.arranger}</span>}
                  </div>
                )}
                {(meta.year || meta.artistName) && (
                  <div className="mt-1">
                    (C)(P){' '}
                    {meta.year ? `${meta.year} ` : ''}
                    {meta.artistName}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 select-none">歌詞がありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}