// src/app/components/EmotePicker.jsx
'use client'; // クライアントコンポーネントであることを明示

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Supabaseクライアントをインポート
import { useAudioPlayer } from '@/context/AudioPlayerContext'; // 追加


// 表示する絵文字のリスト
const EMOTES = ['❤️', '😂', '😭', '🔥', '👍', '👎'];
// クールダウン時間（ミリ秒）
const COOLDOWN_TIME = 3000; // 3秒間に1回まで投稿可能

export default function EmotePicker({ trackId, timestampSeconds, onClose, layerRef, anchorRef}) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false); // クールダウン中かどうかの状態
  const {addLocalEmote} = useAudioPlayer();

  const calcAnchorPercentPos = () => {
    if (!layerRef?.current || anchorRef?.current) return null;
    const layer = layerRef.current.getBoundingClientRect();
    const anchor =anchorRef.current.getBoundingClientRect();

    const cx = anchor.left + anchor.width / 2;
    const cy = anchor.top;
    let xPct = ((cx - layer.left) / layer.width) * 100;
    let yPct = ((cy - layer.top) / layer.height) * 100 - 6;

    xPct = Math.max(5, Math.min(95, xPct));
    yPct = Math.max(5, Math.min(95, yPct));

    return { xPct, yPct };
  }

  console.log(`[EmotePicker Render] trackId: ${trackId}, timestampSeconds: ${timestampSeconds}, onClose: ${typeof onClose}`);

  // エモート投稿処理
  const handleEmoteClick = async (emoji) => {
    if (loading || cooldown) return; // 投稿中またはクールダウン中は操作不可

    setLoading(true); // 投稿開始
    setCooldown(true); // クールダウン開始
    const pos = calcAnchorPercentPos();
    const ts = Number.isFinite(timestampSeconds) ? timestampSeconds : 0;
    addLocalEmote(emoji, ts, pos);

    try {
      const { error } = await supabase
        .from('track_emotes')
        .insert({
          track_id: trackId,
          timestamp_seconds: timestampSeconds,
          emoji: emoji,
        });

      if (error) {
        console.error('エモート投稿エラー:', error);
        alert('エモートの投稿に失敗しました。');
      } else {
        console.log(`エモート "${emoji}" をトラック ${trackId} の ${timestampSeconds}秒に投稿しました。`);
        // 投稿成功後、パネルを閉じる
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('予期せぬエモート投稿エラー:', err);
      alert('エモート投稿中にエラーが発生しました。');
    } finally {
      setLoading(false); // ロード終了
      // クールダウンタイマーを開始
      setTimeout(() => {
        setCooldown(false);
      }, COOLDOWN_TIME);
    }
  };

  return (
    // position: absolute で親要素 (GlobalAudioPlayer の Fragment) に対して配置
    // bottom-[9rem] はグローバルプレイヤーの上端に配置 (16+20=36 Tailwind単位 = 144px)
    // z-50 は他の固定要素の上に表示されるように
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 translate-x-73 mb-2 bg-gray-700 rounded-lg shadow-lg z-50">
      <div className="flex space-x-2">
        {EMOTES.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleEmoteClick(emoji)}
            className={`text-2xl p-2 rounded-full hover:bg-gray-600 transition-colors duration-200
              ${loading || cooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading || cooldown} // ロード中またはクールダウン中は無効化
            aria-label={`${emoji} エモートを送信`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {(loading || cooldown) && (
        <div className="text-center text-xs text-gray-400 mt-2">
          {loading ? '送信中...' : `クールダウン中 (${COOLDOWN_TIME / 1000}秒)`}
        </div>
      )}
    </div>
  );
}
