// src/app/artists/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
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

  const { playTrack } = useAudioPlayer();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  // データ取得
  useEffect(() => {
    const fetchArtistData = async () => {
      if (!id) return;
      setLoading(true);

      // artist
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

      // works + tracks（track_number昇順）
      const { data: worksData, error: worksError } = await supabase
        .from('works')
        .select(`
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
        `)
        .eq('artist_id', id)
        .order('id', { ascending: true })
        .order('track_number', { ascending: true, foreignTable: 'tracks' });

      if (worksError) {
        console.error('worksError:', worksError);
        setWorks([]);
      } else {
        setWorks((worksData || []) as unknown as Work[]);
      }

      setLoading(false);
    };

    fetchArtistData();
  }, [id]);

  // ⚠ フックは return より前に無条件で呼ぶ
  const playlistsByWorkId = useMemo(() => {
    const map = new Map<Work['id'], any[]>();
    if (!artist) return map;
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

  // ハッシュにスクロール
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!works.length) return;
    const hash = window.location.hash;
    if (!hash) return;

    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [works]);

  // ここから return
  if (loading) return <main className="p-4 max-w-4xl mx-auto">Loading...</main>;
  if (!artist) return <main className="p-4 max-w-4xl mx-auto">アーティストが見つかりませんでした。</main>;

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{artist.name}</h1>

      {works.map((work) => {
        const playlist = playlistsByWorkId.get(work.id) || [];
        const jacket = work.jacket_url ||
          'https://zcfwrpijbdxwywoupchx.supabase.co/storage/v1/object/public/jacket/Dyed17.jpeg';

        return (
          <section
            key={String(work.id)}
            id={`work-${work.id}`}
            className="scroll-mt-28 mb-8 border p-4 rounded-xl shadow bg-white"
          >
            {/* 作品ヘッダー */}
            <div className="flex items-center gap-4">
              <Image
                src={jacket}
                alt={work.title}
                width={96}
                height={96}
                className="w-24 h-24 object-cover rounded"
                // remote image 用に next.config.js の images.domains/remotePatterns 設定が必要な場合あり
                unoptimized
              />
              <div>
                <h2 className="text-lg font-semibold">{work.title}</h2>
                <p className="text-gray-700 font-bold">{artist.name}</p>
              </div>
            </div>

            {/* トラック一覧 */}
            <div className="mt-4">
              {(work.tracks || []).map((track, index) => (
                <button
                  key={String(track.id)}
                  onClick={() => {
                    if (playTrack) playTrack(playlist[index], playlist, index);
                  }}
                  className="w-full text-left flex items-center gap-3 p-2 border rounded mb-2 hover:bg-gray-50"
                >
                  <span className="w-6 text-center">{index + 1}</span>
                  <span className="flex-1 truncate">{track.title}</span>
                  {track.duration && (
                    <span className="ml-auto text-sm text-gray-500">{track.duration}</span>
                  )}
                </button>
              ))}
              {(!work.tracks || work.tracks.length === 0) && (
                <p className="text-sm text-gray-500">この作品にはトラックがありません。</p>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
