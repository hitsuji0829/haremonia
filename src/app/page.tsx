// src/app/page.tsx
// サーバーコンポーネント（'use client' は不要）

import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import GenreShufflePlayer from '@/components/GenreShufflePlayer';
import FeaturedTracks from '@/components/FeaturedTracks';
import { GENRES, genreLabelFromValue } from '@/lib/genres';

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
      <h2 className="text-xl font-bold text-gray-100">{children}</h2>
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
  works?: WorkInfo;
};

export default async function HomePage() {
  // アーティスト一覧
  const { data: artistsData, error: artistsError } = await supabase
    .from('artists')
    .select('*')
    .order('name', { ascending: true });

  const artists = artistsData || [];
  if (artistsError) console.error('artistsError:', artistsError);

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

  // プレイヤーで扱いやすい形に整形
  const allEnrichedTracks = rows.map((t) => {
    const w = (t.works ?? {}) as NonNullable<WorkInfo> extends infer X ? (X & {}) : {};
    const a = (w?.artists ?? {}) as NonNullable<ArtistInfo> extends infer Y ? (Y & {}) : {};

    return {
      id: t.id,
      title: t.title,
      audio_url: t.audio_url,
      duration: t.duration ?? null,
      lyrics: t.lyrics ?? null,
      genre: t.genre ?? 'Other',

      jacket_url:
        (w?.jacket_url as string | null) ||
        'https://placehold.co/200x200/cccccc/333333?text=No+Image',

      // 再生バーのリンク化に必要な情報
      artist_name: (a?.name as string) || '不明なアーティスト',
      artist_id: (a?.id as number | string | null) ?? null,
      work_title: (w?.title as string) || '不明な作品',
      work_id: (w?.id as number | string | null) ?? null,

      // 互換用（使っていれば）
      artist: a?.id ? { id: a.id, name: a.name ?? '' } : null,
      work: w?.id ? { id: w.id, title: w.title ?? '', jacket_url: w.jacket_url ?? null } : null,
    };
  });

  // HARE Push!!（表示ごとにランダム3曲）
  const harePush = pickRandomN(allEnrichedTracks, 3);

  return (
    <main className="p-4 max-w-4xl mx-auto mb-40">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center select-none">
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
      {artists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((artist: any) => (
            <Link href={`/artists/${artist.id}`} key={artist.id} className="block">
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col items-center p-4">
                <ImageWithFallback
                  src={artist.image_url}
                  alt={artist.name || 'アーティスト'}
                  className="w-24 h-24 object-cover rounded-full mb-3 shadow-sm select-none"
                  fallbackSrc="https://placehold.co/100x100/aaaaaa/ffffff?text=Artist"
                />
                <h3 className="text-lg font-semibold text-gray-800 text-center select-none">
                  {artist.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 select-none">アーティストはまだ登録されていません。</p>
      )}
    </main>
  );
}
