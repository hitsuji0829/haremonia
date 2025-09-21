// src/app/page.tsx
// サーバーコンポーネント（'use client' は不要）

import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import GenreShufflePlayer from '@/components/GenreShufflePlayer';
import FeaturedTracks from '@/components/FeaturedTracks';
import { GENRES, genreLabelFromValue } from '@/lib/genres';
import LatestTrackCard from '@/components/LatestTrackCard';

export const dynamic = 'force-dynamic';

function TitleBar({ children, noCopy = false }: { children: React.ReactNode; noCopy?: boolean }) {
  return (
    <div
      className={`mb-3 flex items-center justify-between ${noCopy ? 'select-none' : ''}`}
      {...(noCopy
        ? {
            onCopy: (e) => e.preventDefault(),
            onCut: (e) => e.preventDefault(),
            onContextMenu: (e) => e.preventDefault(),
          }
        : {})}
    >
      <h2 className="text-xl font-bold text-gray-100 pr-28 sm:pr-0">{children}</h2>
    </div>
  );
}

// ------- utils -------
function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

// ------- types (必要最低限) -------
type ArtistInfo = {
  id?: number | string | null;
  name?: string | null;
} | null;

type WorkInfo = {
  id?: number | string | null;
  title?: string | null;
  jacket_url?: string | null;
  artists?: ArtistInfo;
} | null;

type TrackRow = {
  id: number | string;
  title: string;
  audio_url: string | null;
  duration?: string | null;
  lyrics?: string | null;
  genre?: string | null;
  created_at?: string | null;
  works?: WorkInfo;
};

// ▼ 追加：配列でも単体でも最初の1件を返す正規化
function firstOrNull<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x.length ? (x[0] as T) : null;
  return (x ?? null) as T | null;
}

// ▼ enrichTrack を上に定義（使う前に定義しておく）
type EnrichedTrack = {
  id: string | number;
  title: string;
  audio_url: string | null;
  duration: string | null;
  lyrics: string | null;
  genre: string;
  created_at: string | null;
  jacket_url: string;
  artist_name: string;
  artist_id: string | number | null;
  work_title: string;
  work_id: string | number | null;
  artist: { id: string | number; name: string } | null;
  work: { id: string | number; title: string; jacket_url: string | null } | null;
};

function enrichTrack(t: any): EnrichedTrack {
  // works が単体でも配列でも対応
  const w = firstOrNull<any>(t?.works);
  // artists も単体でも配列でも対応
  const a = firstOrNull<any>(w?.artists);

  const jacketUrl =
    (w?.jacket_url as string | null) ||
    'https://placehold.co/200x200/cccccc/333333?text=No+Image';

  return {
    id: t.id,
    title: t.title,
    audio_url: t.audio_url ?? null,
    duration: t.duration ?? null,
    lyrics: t.lyrics ?? null,
    genre: t.genre ?? 'Other',
    created_at: t.created_at ?? null,

    jacket_url: jacketUrl,

    artist_name: (a?.name as string) || '不明なアーティスト',
    artist_id: (a?.id as string | number | null) ?? null,
    work_title: (w?.title as string) || '不明な作品',
    work_id: (w?.id as string | number | null) ?? null,

    artist: a?.id ? { id: a.id, name: a.name ?? '' } : null,
    work: w?.id ? { id: w.id, title: w.title ?? '', jacket_url: w.jacket_url ?? null } : null,
  };
}

export default async function HomePage() {
  // アーティスト一覧
  const { data: artistsData, error: artistsError } = await supabase
    .from('artists')
    .select('id, name, image_url, bio, socials')
    .order('name', { ascending: true });

  const artists = artistsData || [];
  const artistsToShow = pickRandomN(artists, 15);
  if (artistsError) console.error('artistsError:', artistsError?.message, artistsError);

  // 楽曲 + 作品 + アーティスト
  const { data: tracksData, error: tracksError } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      audio_url,
      duration,
      lyrics,
      genre,
      created_at,
      works (
        id,
        title,
        jacket_url,
        artists (
          id,
          name
        )
      )
    `);

  if (tracksError) console.error('tracksError:', tracksError);

  const rows = (tracksData ?? []) as TrackRow[];
  const allEnrichedTracks = rows.map(enrichTrack);

  const oneWeekAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: latestData, error: latestError } = await supabase
    .from('tracks')
    .select(`
      id,
      title,
      audio_url,
      duration,
      lyrics,
      genre,
      created_at,
      works (
        id,
        title,
        jacket_url,
        artists (
          id,
          name
        )
      )
    `)
    .gte('created_at', oneWeekAgoISO)
    .order('created_at', { ascending: false })
    .limit(15);

  if (latestError) console.error('latestTracksError:', latestError);

  const latestTracks = (latestData ?? []).map(enrichTrack);

  // HARE Push!!（表示ごとにランダム3曲）
  const harePush = pickRandomN(allEnrichedTracks, 3);

  return (
    <main className="p-4 max-w-4xl mx-auto mb-40">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center select-none pr-28 sm:pr-0">
        HAREmonia
      </h1>

      {/* HARE Push!! */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-4 select-none">HARE Push!!</h2>
        {/* Client Component */}
        <FeaturedTracks tracks={harePush.map(track => ({
          ...track,
          genreLabel: genreLabelFromValue(track.genre as any),
        }))} />
      </section>

      {/* ジャンル別シャッフル */}

      <GenreShufflePlayer
        allTracks={allEnrichedTracks}
        genreOptions={[...GENRES]}
      />

      {/* アーティスト一覧 */}
      <h2 className="text-2xl font-bold text-gray-100 mb-4 select-none">HAREmonia ARTIST</h2>
      {artistsToShow.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {artistsToShow.map((artist: any) => (
            <Link href={`/artists/${artist.id}`} key={artist.id} className="block">
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col items-center p-4">
                <ImageWithFallback
                  src={artist.image_url}
                  alt={artist.name || 'アーティスト'}
                  className="w-24 h-24 object-cover rounded-full mb-3 shadow-sm select-none"
                  fallbackSrc="https://placehold.co/100x100/aaaaaa/ffffff?text=Artist"
                />
                <h3 className="text-lg font-semibold text-gray-800 text-center select-none break-words line-clamp-2 leading-tight">
                  {artist.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 select-none">アーティストはまだ登録されていません。</p>
      )}
      {/* 新着（直近1週間） */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 select-none">
          HARE Flesh!! -新着トラック-
        </h2>

        {latestTracks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestTracks.map((t) => (
              <LatestTrackCard key={t.id} track={t} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 select-none">直近1週間の新着はありません。</p>
        )}
      </section>
    </main>
  );
}
