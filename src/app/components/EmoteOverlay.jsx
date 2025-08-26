// src/app/components/EmoteOverlay.jsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { useSettings } from '@/context/SettingsContext';

const EMOTE_DISPLAY_DURATION = 4000; // 4秒表示に揃える
const SYNC_WINDOW = 0.25;

export default function EmoteOverlay() {
  // ❌ localEmotes という値は Context には無い → ✅ emotes を受け取る
  const { currentTrack, currentTime, emotes, addLocalEmote, emoteRestartNonce, emoteSuppressUntilMs, emotsEnabled } = useAudioPlayer();
  const { showEmotes, emoteOpacity } = useSettings();

  if (!showEmotes) return null;

  // リアルタイムで飛んでくるエモート（他ユーザー由来）
  const [timelineEmotes, setTimelineEmotes] = useState([]);
  const firedIdsRef = useRef(new Set());
  const channelRef = useRef(null);
  const suppressUntilRef = useRef(0);

  // ------- Supabase リアルタイム購読 -------
  useEffect(() => {
    const load = async () => {
    if (!currentTrack?.id) {
      setTimelineEmotes([]);
      firedIdsRef.current.clear();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      channnelRef.current = null;
      }
      return;
    }

    const { data, error } = await supabase
      .from('track_emotes')
      .select('id, emoji, timestamp_seconds')
      .eq('track_id', currentTrack.id)
      .order('timestamp_seconds', { ascending: true });

    if (error){
      console.error('[EmoteOverlay] fetch error:', error),
      setTimelineEmotes([]);
      firedIdsRef.current.clear();
    } else {
      setTimelineEmotes(data || []);
      firedIdsRef.current.clear();
    }

    if (channelRef.current){
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // 新規購読
    const channel = supabase
      .channel(`track_emotes_${currentTrack.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'track_emotes', filter: `track_id=eq.${currentTrack.id}` },
        (payload) => {
          const {id, emoji, timestamp_seconds } = payload.new || {};
          setTimelineEmotes((prev) => 
            prev.some((e) => e.id === id) ? prev : [...prev, {id, emoji, timestamp_seconds}]
        );
          if (Math.abs((timestamp_seconds ?? 0) - (currentTime ?? 0)) <= SYNC_WINDOW){
            addLocalEmote(emoji, timestamp_seconds);
            firedIdsRef.current.add(id);
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
  };

  load();

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }; 
}, [currentTrack?.id]);

useEffect(() => {
  firedIdsRef.current.clear();
  suppressUntilRef.current = emoteSuppressUntilMs || 0;
}, [emoteRestartNonce, emoteSuppressUntilMs]);

useEffect(() => {
  if (!timelineEmotes.length) return;

  for (const e of timelineEmotes){
    if (firedIdsRef.current.has(e.id)) continue;
    if (Date.now() < suppressUntilRef.current) continue;
    if (Math.abs((e.timestamp_seconds ?? 0) - (currentTime ?? 0)) <= SYNC_WINDOW){
      addLocalEmote(e.emoji, e.timestamp_seconds);
      firedIdsRef.current.add(e.id);
    }
  }
}, [currentTime, timelineEmotes, addLocalEmote]);

const MAX_EMOTES = 20;


  // ===== 描画 =====
  // Contextの即時エモート(emotes) と リモート(remoteEmotes) を合算して描画

  return (
    // 親（GlobalAudioPlayer内のラッパ）を relative にしてこの要素を absolute にするのが前提
    <div className="pointer-events-none absolute inset-0 z-40">
      {emotes.map((emote) => (
        <span
          key={emote.id}
          className={`emote ${emote.fadeOut ? 'fade-out' : ''}`}
          style={{
            left: `${emote.x}%`,
            top: `${emote.y}%`, 
            fontSize: '3.6rem',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
            filter: `opacity(${Math.max(0, Math.min(1, emoteOpacity))})`,
          }} // ★ 位置は追加時に固定した値を使用
        >
          {emote.emoji}
        </span>
      ))}

      {/* アニメーション定義 */}
      <style jsx>{`
      .emote {
        position: absolute;
        transform: translate(-50%, -50%) scale(0.7);
        opacity: 0;
        /* 出た瞬間に“バフッ”と表示 → そのまま少し浮いて保持 */
        animation: emote-pop 220ms ease-out forwards, emote-hold 2.6s linear forwards;
      }

      .emote.fade-out {
        /* 保持後にふわっと上に抜けながらフェードアウト */
        animation: emote-pop 220ms ease-out forwards,
                   emote-hold 2.6s linear forwards,
                   emote-fade 600ms ease-in forwards;
        animation-delay: 0s, 220ms, 2.82s; /* ポップ→保持→フェードの順に遅延 */
      }

      @keyframes emote-pop {
        0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
        100% { opacity: 1; transform: translate(-50%, -56%) scale(1.08); }
      }

      @keyframes emote-hold {
        0%   { transform: translate(-50%, -56%) scale(1.08); }
        100% { transform: translate(-50%, -58%) scale(1.00); }
      }

      @keyframes emote-fade {
        0%   { opacity: 1; transform: translate(-50%, -58%) scale(1.00); }
        100% { opacity: 0; transform: translate(-50%, -70%) scale(1.03); }
      }
    `}</style>
    </div>
  );
}
