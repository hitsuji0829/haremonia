'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

type Artist = {
  id: number | string;
  name: string;
  image_url?: string | null;
};

type Track = {
  id: number | string;
  title: string;
  audio_url: string | null;
  duration?: string | null;
  lyrics?: string | null;
  track_number?: number | null;
};

type Work = {
  id: number | string;
  title: string;
  jacket_url?: string | null;
  artist_id: number | string;
  tracks: Track[];
};

export default function ArtistPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { playTrack, setIsShuffleSession } = useAudioPlayer();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  // ------- データ取得 -------
  useEffect(() => {
    const fetchArtistData = async () => {
      if (!id) return;
      setLoading(true);

      // アーティスト情報
      const { data: artistData, error: artistError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', id)
        .single();

      if (artistError) {
        console.error('artistError:', artistError);
        setArtist(null);
        setWorks([]);
        setLoading(false);
        return;
      }
      setArtist(artistData as Artist);

      // 作品 + トラック
      // ★ 変更: works の order を削除し、tracks の order のみを残す
      const { data: worksData, error: worksError } = await supabase
        .from('works')
        .select(
          `
          id,
          title,
          jacket_url,
          artist_id,
          tracks (
            id,
            title,
            audio_url,
            duration,
            lyrics,
            track_number
          )
        `
        )
        .eq('artist_id', id)
        // ★ 変更: works の order を削除し、tracks の order を修正
        .order('track_number', {
          ascending: true,
          nullsFirst: false,
          foreignTable: 'tracks',
        });

      if (worksError) {
        console.error('worksError:', worksError);
        setWorks([]);
      } else {
        const toNum = (v: unknown) =>
          v == null
            ? Number.POSITIVE_INFINITY
            : typeof v === 'number'
            ? v
            : parseInt(String(v), 10);

        const normalized = (worksData || []).map((w: any) => ({
          ...w,
          // ★ 変更: クライアント側のソートを削除
          tracks: [...(w.tracks || [])]
            .sort((a, b) => {
              const ax = toNum(a.track_number);
              const bx = toNum(b.track_number);
              if (ax !== bx) return ax - bx;
              return String(a.id).localeCompare(String(b.id));
            }),
        }));
        setWorks(normalized);
      }

      setLoading(false);
    };

    fetchArtistData();
  }, [id]);

  // ------- ハッシュ(#work-◯◯)に応じてスクロール -------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!works || works.length === 0) return;
    const hash = window.location.hash;
    if (!hash) return;

    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(hash);
      const main = document.querySelector<HTMLElement>('main');

      if (!el) return;

      const mainPaddingTop = main
        ? parseFloat(getComputedStyle(main).paddingTop || '0')
        : 0;

        const elTop = el.getBoundingClientRect().top + window.scrollY;

        window.scrollTo({
          top: elTop - mainPaddingTop,
          behavior: 'smooth',
        });
    });
  }, [works]);

  if (loading) return <main className="p-4 max-w-4xl mx-auto">Loading...</main>;
  if (!artist) return <main className="p-4 max-w-4xl mx-auto">アーティストが見つかりませんでした。</main>;

  const playlistsByWorkId = useMemo(() => {
    const map = new Map<Work['id'], any[]>();
    for (const w of works) {
      const playlist = (w.tracks || []).map((t) => ({
        ...t,
        jacket_url: w.jacket_url ?? null,
        work_title: w.title,
        artist_name: artist.name,
        work: { id: w.id, title: w.title, jacket_url: w.jacket_url },
        artist: { id: artist.id, name: artist.name },
      }));
      map.set(w.id, playlist);
    }
    return map;
  }, [works, artist]);

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{artist.name}</h1>

      {works.map((work) => {
        const playlist = playlistsByWorkId.get(work.id) || [];
        return (
          <section
            key={String(work.id)}
            id={`work-${work.id}`}
            className="scroll-mt-28 mb-8 border p-4 rounded-xl shadow bg-white"
          >
            <div className="flex items-center gap-4">
              <img
                src={
                  work.jacket_url ||
                  'https://zcfwrpijbdxwywoupchx.supabase.co/storage/v1/object/public/jacket/Dyed17.jpeg'
                }
                alt={work.title}
                className="w-24 h-24 object-cover rounded"
              />
              <div>
                <h2 className="text-lg font-semibold">{work.title}</h2>
                <p className="text-gray-700 font-bold">{artist.name}</p>
              </div>
            </div>

            <div className="mt-4">
              {[...(work.tracks || [])]
                .sort((a, b) => {
                  // 文字列でも数値でも null でも安全に比較
                  const ax = a?.track_number == null ? Number.POSITIVE_INFINITY : Number(a.track_number)
                  const bx = b?.track_number == null ? Number.POSITIVE_INFINITY : Number(b.track_number)
                  if (ax !== bx) return ax - bx;                 // track_number 昇順
                  return String(a.id).localeCompare(String(b.id)) // 予備の安定化
                })
                .map((track, index) => (
                  <button
                    key={String(track.id)}
                    onClick={() => {
                      setIsShuffleSession(false);
                      if (playTrack) playTrack(playlist[index], playlist, index, { playbackOrigin: 'artist' });
                    }}
                    className="w-full text-left flex items-center gap-3 p-2 border rounded mb-2 hover:bg-gray-50"
                  >
                    <span className="w-6 text-center">{index + 1}</span>
                    <span className="flex-1 truncate">
                      {track.title}
                      {/* デバッグ用に一時的に表示して確認してもOK */}
                      {/* <span className="ml-2 text-xs text-gray-400">#{String(track.track_number)}</span> */}
                    </span>
                    {track.duration && (
                      <span className="ml-auto text-sm text-gray-500">{track.duration}</span>
                    )}
                  </button>
                ))}
              {(!work.tracks || work.tracks.length === 0) && (
                <p className="text-sm text-gray-500">
                  この作品にはトラックがありません。
                </p>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
