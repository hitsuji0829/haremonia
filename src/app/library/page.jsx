// src/app/library/page.jsx
'use client'; // クライアントコンポーネントとして動作させる

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // 絶対パスに統一
import ImageWithFallback from '@/components/ImageWithFallback'; // 絶対パスに統一
import Link from 'next/link';
import FavoriteButton from '@/components/FavoriteButton'; // 絶対パスに統一
import { useAudioPlayer } from '@/context/AudioPlayerContext'; // 絶対パスに統一

export default function LibraryPage() {
  const toMMSS = (sec) => {
    const n = Number(sec);
    if (!Number.isFinite(n) || n < 0) return '--:--';
    const m = Math.floor(n / 60);
    const s = Math.floor(n % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const { user, profile, loadingAuthAndProfile, playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const [favorites, setFavorites] = useState({ artists: [], works: [], tracks: [] });
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [errorFavorites, setErrorFavorites] = useState(null);

  // お気に入りデータの取得
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user || !profile) {
        setFavorites({ artists: [], works: [], tracks: [] });
        setLoadingFavorites(false);
        return;
      }

      setLoadingFavorites(true);
      setErrorFavorites(null);

      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select(`
          id,
          user_id,
          artist_id,
          work_id,
          track_id,
          created_at,
          artists:artist_id(id, name, image_url),
          works:work_id(id, title, jacket_url, artists(id, name)),
          tracks:track_id(id, title, audio_url, duration, lyrics, works(id, title, jacket_url, artists(id, name)))
        `)
        .eq('user_id', user.id);

      if (favoritesError) {
        console.error('LibraryPage: お気に入り取得エラー:', favoritesError);
        setErrorFavorites('お気に入りの読み込みに失敗しました。');
        setFavorites({ artists: [], works: [], tracks: [] });
      } else {
        const categorizedFavorites = {
          artists: [],
          works: [],
          tracks: [],
        };

        (favoritesData || []).forEach(fav => {
          if (fav.artist_id && fav.artists) {
            categorizedFavorites.artists.push(fav.artists);
          } else if (fav.work_id && fav.works) {
            categorizedFavorites.works.push(fav.works);
          } else if (fav.track_id && fav.tracks) {
            const enrichedTrack = {
              ...fav.tracks,
              work_title: fav.tracks.works?.title,
              jacket_url: fav.tracks.works?.jacket_url,
              artist_name: fav.tracks.works?.artists?.name,
            };
            categorizedFavorites.tracks.push(enrichedTrack);
          }
        });
        setFavorites(categorizedFavorites);
      }
      setLoadingFavorites(false);
    };

    if (user && profile && !loadingAuthAndProfile) {
      fetchFavorites();
    } else if (!user || !profile) {
      setFavorites({ artists: [], works: [], tracks: [] });
      setLoadingFavorites(false);
      setErrorFavorites(null);
    }
  }, [user, profile, loadingAuthAndProfile]);

  const handleFavoriteRemoved = (removedItemId, removedItemType) => {
    setFavorites(prevFavorites => {
      const newFavorites = { ...prevFavorites };
      if (removedItemType === 'artist') {
        newFavorites.artists = newFavorites.artists.filter(item => item.id !== removedItemId);
      } else if (removedItemType === 'work') {
        newFavorites.works = newFavorites.works.filter(item => item.id !== removedItemId);
      } else if (removedItemType === 'track') {
        newFavorites.tracks = newFavorites.tracks.filter(item => item.id !== removedItemId);
      }
      return newFavorites;
    });
  };

  const handleTrackClick = (track, index) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      // 検索ページと同様にプレイリストを渡す
      playTrack(track, favorites.tracks, index);
    }
  };


  return (
    <main className="p-4 max-w-4xl mx-auto min-h-screen mb-40">
      <h1 className="text-3xl font-bold mb-6 text-white select-none">ライブラリ</h1>
      {loadingAuthAndProfile ? (
        <p className="text-gray-500 text-center select-none">認証状態とプロフィールを確認中...</p>
      ) : !user || !profile ? (
        <p className="text-gray-500 text-center select-none">
          お気に入りを見るにはプロフィール設定が必要です。
          <br />
          コミュニティページでプロフィールを設定してください。
        </p>
      ) : loadingFavorites ? (
        <p className="text-gray-500 text-center select-none">お気に入りを読み込み中...</p>
      ) : errorFavorites ? (
        <p className="text-red-500 text-center select-none">{errorFavorites}</p>
      ) : (
        <div className="space-y-8">
          {/* お気に入りアーティスト */}
          <section>
            <h2 className="text-2xl font-bold text-gray-100 mb-4 select-none">お気に入りアーティスト</h2>
            {(favorites.artists || []).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.artists.map(artist => (
                  <Link
                    href={`/artists/${artist.id}`}
                    key={artist.id}
                    className="block bg-white rounded-xl shadow-md p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <ImageWithFallback
                        src={artist.image_url}
                        alt={artist.name}
                        className="w-12 h-12 rounded-full object-cover select-none"
                        fallbackSrc="https://placehold.co/50x50/aaaaaa/ffffff?text=A"
                      />
                      <span className="font-semibold text-gray-800 flex-grow truncate select-none">{artist.name}</span>

                      {/* ★ ここで遷移を止める（お気に入りだけクリック可） */}
                      <div
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        role="button"
                        aria-label="お気に入りの切り替え"
                      >
                        <FavoriteButton
                          artistId={artist.id}
                          initialFavorited={true}
                          onFavoriteRemoved={handleFavoriteRemoved}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 select-none">お気に入りアーティストはまだありません。</p>
            )}
          </section>

          {/* お気に入り作品 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-100 mb-4 select-none">お気に入り作品</h2>
            {favorites.works.map(work => (
              <Link
                href={`/artists/${work.artists?.id}`}
                key={work.id}
                className="block bg-white rounded-xl shadow-md p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <ImageWithFallback
                    src={work.jacket_url}
                    alt={work.title}
                    className="w-12 h-12 object-cover rounded-md select-none"
                    fallbackSrc="https://placehold.co/50x50/cccccc/333333?text=Work"
                  />
                  <div className="flex flex-col flex-grow truncate">
                    <span className="font-semibold text-gray-800 truncate select-none">{work.title}</span>
                    <span className="text-sm text-gray-600 truncate select-none">{work.artists?.name}</span>
                  </div>

                  {/* お気に入りボタンのクリックでは遷移しないようにする */}
                  <div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    role="button"
                    aria-label="お気に入りの切り替え"
                  >
                    <FavoriteButton
                      workId={work.id}
                      initialFavorited={true}
                      onFavoriteRemoved={handleFavoriteRemoved}
                    />
                  </div>
                </div>
              </Link>
            ))}

          </section>

          {/* お気に入り楽曲 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-100 mb-4 select-none">お気に入り楽曲</h2>
            {(favorites.tracks || []).length > 0 ? (
              <div className="space-y-2">
                {favorites.tracks.map((track, idx) => (
                  <button
                    key={track.id}
                    onClick={() => handleTrackClick(track, idx)}
                    className={`w-full text-left bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:bg-gray-50 transition
                                ${currentTrack?.id === track.id ? 'ring-2 ring-indigo-500' : ''}`}
                  >
                    <ImageWithFallback
                      src={track.jacket_url}
                      alt={track.title}
                      className="w-10 h-10 object-cover rounded-md select-none"
                      fallbackSrc="https://placehold.co/40x40/cccccc/333333?text=Track"
                    />
                    <div className="flex flex-col flex-grow truncate">
                      <span className="font-semibold text-gray-800 truncate select-none">{track.title}</span>
                      <span className="text-sm text-gray-600 truncate select-none">
                        {track.artist_name} - {track.work_title}
                      </span>
                    </div>

                    {/* 秒 → m:ss */}
                    <span className="text-sm text-gray-500 select-none">{toMMSS(track.duration)}</span>

                    {/* お気に入りボタンはクリック伝播を止めて再生を阻害しない */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton
                        trackId={track.id}
                        initialFavorited={true}
                        onFavoriteRemoved={handleFavoriteRemoved}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 select-none">お気に入り楽曲はまだありません。</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
