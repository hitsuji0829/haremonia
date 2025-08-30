// src/app/artists/[id]/page.js
// このファイルはサーバーコンポーネントとして動作するため、'use client' は不要です。

import { supabase } from '@/lib/supabaseClient'; // 絶対パスに統一
import ImageWithFallback from '@/components/ImageWithFallback'; // 絶対パスに統一
import TrackList from '@/components/TrackList'; // 絶対パスに統一
import FavoriteButton from '@/components/FavoriteButton'; // 絶対パスに統一
import GenreShufflePlayer from '@/components/GenreShufflePlayer';
import ArtistBioToggle from '@/components/ArtistBioToggle';
import ArtistHeaderWithBio from '@/components/ArtistHeaderWithBio';


export default async function ArtistPage({ params }) {
  const { id } = params;

  console.log('--- ArtistPage Server Component Render ---');
  console.log('取得しようとしているアーティストID:', id);

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name, image_url, bio, socials')
    .eq('id', id)
    .single();

  if (artistError) {
    console.error('アーティスト情報取得エラー:', artistError);
    if (artistError.code === 'PGRST116') {
      return <div className="p-4 text-red-500 select-none">指定されたアーティストが見つかりませんでした。</div>;
    }
    return <div className="p-4 text-red-500 select-none">アーティスト情報の読み込みに失敗しました。</div>;
  }

  const { data: worksData, error: worksError } = await supabase
    .from('works')
    .select('*, tracks(*, lyrics)')
    .eq('artist_id', id);

  const works = worksData || [];

  if (worksError) {
    console.error('作品情報取得エラー（Supabaseから返されたエラーオブジェクト）:', worksError);
    return (
        <main className="p-4 max-w-4xl mx-auto mb-40">
            <h1 className="text-3xl font-extrabold text-gray-900 select-none">{artist?.name}</h1>
            <p className="text-red-500 p-4 border rounded-xl bg-white shadow-sm select-none">
                作品情報の読み込み中にエラーが発生しました。SupabaseのRLSポリシーまたは外部キー制約をご確認ください。
            </p>
        </main>
    );
  }

  console.log('取得したアーティストデータ:', artist);
  console.log('取得した作品データ:', works);

  if (!artist) {
    return <div className="p-4 text-gray-500 select-none">アーティストが見つかりませんでした。</div>;
  }

  // トラックデータにアーティスト名や作品ジャケットURLなどの情報を付与
  const worksWithArtistInfo = works.map(work => ({
    ...work,
    artist_name: artist.name,
    tracks: work.tracks.map(track => ({
      ...track,
      work_title: work.title,
      jacket_url: work.jacket_url,
      artist_name: artist.name,
      artist: { id: artist.id, name: artist.name, image_url: artist.image_url }
    }))
  }));


  return (
  <main className="p-4 max-w-4xl mx-auto mb-40">
    {/* アーティストのカバー画像と名前 */}
    <ArtistHeaderWithBio
      name={artist.name}
      imageUrl={artist.image_url}
      bio={artist.bio}
      artistId={artist.id}
      socials={artist.socials}
    />

    {/* 全曲シャッフル・ジャンル別シャッフル */}
    {works.length > 0 && (
      <GenreShufflePlayer
        allTracks={
          worksWithArtistInfo.flatMap(work => work.tracks) // 作品ごとのトラック配列を一つの配列に結合
        }
        uniqueGenres={
          [...new Set(
            worksWithArtistInfo.flatMap(work => work.tracks)
              .map(track => track.genre).filter(Boolean) // nullやundefinedを除外
          )]
        }
      />
    )}

    {/* 作品リスト */}
    {works.length > 0 ? (
      worksWithArtistInfo.map(work => (
        <div key={work.id} className="mb-8 rounded-xl shadow-lg overflow-hidden bg-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6"> 
            <ImageWithFallback
              src={work.jacket_url}
              alt={work.title || "作品のジャケット"}
              className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-lg shadow-md flex-shrink-0 select-none"
              fallbackSrc="https://placehold.co/200x200/cccccc/333333?text=No+Image"
            />
            <div className="text-center sm:text-left flex-grow">
              <h2 className="text-2xl font-bold text-gray-800 mb-1 select-none">{work.title}</h2>
              <p className="text-base text-gray-600 select-none">{artist.name}</p>
            </div>
            <FavoriteButton workId={work.id} />
          </div>
          <TrackList tracks={work.tracks || []} />
        </div>
      ))
    ) : (
      <p className="text-gray-500 mt-4 p-4 border rounded-xl bg-white shadow-sm select-none">
        このアーティストの作品はまだありません。
      </p>
    )}
  </main>
);

}
