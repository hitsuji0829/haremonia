// src/app/components/LyricsPanel.jsx
'use client'; // クライアントコンポーネントであることを明示

import React, {useEffect, useState} from 'react';
import ImageWithFallback from '@/components/ImageWithFallback'; // 絶対パスに統一
import { supabase } from '@/lib/supabaseClient';

// propsとして currentTrack, showLyricsPanel, toggleLyricsPanel を受け取る
export default function LyricsPanel({ currentTrack, showLyricsPanel, toggleLyricsPanel }) {
  // デバッグ用: 歌詞パネルの表示状態をログに出力
  console.log(`[LyricsPanel Render] showLyricsPanel: ${showLyricsPanel}, currentTrack.lyrics: ${currentTrack?.lyrics ? '存在します' : '存在しません'}`);

  const [lyrics, setLyrics] = useState(currentTrack?.lyrics || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLyrics(currentTrack.lyrics || '');
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!showLyricsPanel) return;
    if (!currentTrack?.id) return;
    if (!lyrics && lyrics.trim().length > 0) return;

    let cancelled = false;
    (async ()=> {
      setLoading(true);
      const { data, error } = await supabase
        .from('tracks')
        .select('lyrics')
        .eq('id', currentTrack.id)
        .single();

      if (!cancelled) {
        if (error) {
          console.error('歌詞取得エラー:', error);
          setLyrics('');
        } else {
          setLyrics(data?.lyrics || '');
        }
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [showLyricsPanel, currentTrack?.id, lyrics]);

  // currentTrack がない、または歌詞がない場合は表示しない
  if (!currentTrack) {
    return null;
  }

  return (
    // fixed で画面右に固定。transform を使ってスライドイン/アウト
    // z-index を高く設定 (z-50 はナビゲーションバーと同じかそれ以上)
    // bottom を 9rem に設定し、高さを calc(100vh - 9rem) に設定
    <div
      className={`fixed right-0 w-full sm:w-96 bg-gray-900 text-white shadow-xl z-50 transition-transform duration-300 ease-in-out
        ${showLyricsPanel ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ bottom: '9rem', height: 'calc(100vh - 9rem)' }}
    >
      <div className="p-4 h-full flex flex-col">
        {/* 閉じるボタン */}
        <button
          onClick={toggleLyricsPanel}
          className="self-end text-gray-300 hover:text-white text-3xl font-bold p-2 select-none"
          aria-label="歌詞パネルを閉じる"
        >
          &times;
        </button>

        {/* 楽曲情報 */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold truncate select-none">{currentTrack.title}</h3>
          <p className="text-sm text-gray-400 truncate select-none">{currentTrack.artist_name || currentTrack.artist?.name}</p>
        </div>

        {/* 歌詞表示エリア */}
        <div className="flex-grow overflow-y-auto whitespace-pre-wrap text-base leading-relaxed p-2 text-gray-100 select-none">
          {loading ? (
            <p className="text-center text-gray-400">歌詞を読み込み中…</p>
          ) : (lyrics && lyrics.trim().length > 0) ? (
            lyrics
          ) : (
            <p className="text-center text-gray-500 select-none">歌詞がありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}
