'use client';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { useSettings } from '@/context/SettingsContext';

const SYNC_WINDOW = 0.25;

export default function EmoteOverlay() {
  const { currentTrack, currentTime, emotes, addLocalEmote, emoteRestartNonce, emoteSuppressUntilMs } =
    useAudioPlayer();
  const { showEmotes, emoteOpacity } = useSettings();
  if (!showEmotes) return null;

  const [timelineEmotes, setTimelineEmotes] = useState([]);
  const firedIdsRef = useRef(new Set());
  const channelRef = useRef(null);
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const run = async () => {
      if (!currentTrack?.id) {
        setTimelineEmotes([]);
        firedIdsRef.current.clear();
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        return;
      }

      const { data, error } = await supabase
        .from('track_emotes')
        .select('id, emoji, timestamp_seconds')
        .eq('track_id', currentTrack.id)
        .order('timestamp_seconds', { ascending: true });

      if (!error) {
        setTimelineEmotes(data || []);
        firedIdsRef.current.clear();
      } else {
        console.error('[EmoteOverlay] fetch error:', error);
        setTimelineEmotes([]);
        firedIdsRef.current.clear();
      }

      if (channelRef.current) supabase.removeChannel(channelRef.current);
      const ch = supabase
        .channel(`track_emotes_${currentTrack.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'track_emotes', filter: `track_id=eq.${currentTrack.id}` },
          (payload) => {
            const { id, emoji, timestamp_seconds } = payload.new || {};
            setTimelineEmotes((prev) => (prev.some((e) => e.id === id) ? prev : [...prev, { id, emoji, timestamp_seconds }]));
            if (Math.abs((timestamp_seconds ?? 0) - (currentTime ?? 0)) <= SYNC_WINDOW) {
              addLocalEmote(emoji, timestamp_seconds);
              firedIdsRef.current.add(id);
            }
          }
        )
        .subscribe();
      channelRef.current = ch;
    };
    run();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [currentTrack?.id]);

  useEffect(() => {
    firedIdsRef.current.clear();
    suppressUntilRef.current = emoteSuppressUntilMs || 0;
  }, [emoteRestartNonce, emoteSuppressUntilMs]);

  useEffect(() => {
    if (!timelineEmotes.length) return;
    for (const e of timelineEmotes) {
      if (firedIdsRef.current.has(e.id)) continue;
      if (Date.now() < suppressUntilRef.current) continue;
      if (Math.abs((e.timestamp_seconds ?? 0) - (currentTime ?? 0)) <= SYNC_WINDOW) {
        addLocalEmote(e.emoji, e.timestamp_seconds);
        firedIdsRef.current.add(e.id);
      }
    }
  }, [currentTime, timelineEmotes, addLocalEmote]);

    return (
      <div className="pointer-events-none absolute inset-0 z-[40]">
        {emotes.map((e) => (
          <span
            key={e.id}
            // ← 親ラッパ（位置&スライダー透明度）
            style={{
              position: 'absolute',
              left: `${e.x}%`,
              top: `${e.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: Math.max(0, Math.min(1, emoteOpacity)), // スライダー反映は親
            }}
          >
            <span
              className={`emote ${e.fadeOut ? 'fade-out' : ''}`}
              style={{
                fontSize: '2.8rem',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
              }}
            >
              {e.emoji}
            </span>
          </span>
        ))}

      <style jsx>{`
          .emote {
          display: inline-block;
          transform: translateY(0) scale(0.7);
          animation: emote-pop 220ms ease-out forwards, emote-hold 2600ms linear forwards;
        }
        .emote.fade-out {
          animation: emote-pop 220ms ease-out forwards, emote-hold 2600ms linear forwards, emote-fade 600ms ease-in forwards;
          animation-delay: 0s, 220ms, 2820ms;
        }
        @keyframes emote-pop {
          0%   { opacity: 0; transform: translateY(-6%)  scale(0.7); }
          100% { opacity: 1; transform: translateY(-12%) scale(1.06); }
        }
        @keyframes emote-hold {
          0%   { transform: translateY(-12%) scale(1.06); }
          100% { transform: translateY(-14%) scale(1.00); }
        }
        @keyframes emote-fade {
          0%   { opacity: 1; transform: translateY(-14%) scale(1.00); }
          100% { opacity: 0; transform: translateY(-28%) scale(1.03); }
        }
      `}</style>
    </div>
  );
}
