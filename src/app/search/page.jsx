// src/app/search/page.jsx
'use client'; // クライアントコンポーネントとして動作させる

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Supabaseクライアントをインポート
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback'; // 画像エラーハンドリング用コンポーネント
import { useAudioPlayer } from '@/context/AudioPlayerContext'; // ★ 追加: Contextから再生関数を取得

// ヒット部分の抜粋＆強調表示
function highlightLyrics(lyrics, keyword) {
  if (!keyword) return lyrics;
  
  const lowerLyrics = lyrics.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const index = lowerLyrics.indexOf(lowerKeyword);

  if (index === -1) return lyrics;

  const start = Math.max(0, index - 30); // 前30文字
  const end = Math.min(lyrics.length, index + keyword.length + 30); // 後30文字

  const before = lyrics.slice(start, index);
  const match = lyrics.slice(index, index + keyword.length);
  const after = lyrics.slice(index + keyword.length, end);

  return (
    <>
      {start > 0 && "…"}
      {before}
      <mark>{match}</mark>
      {after}
      {end < lyrics.length && "…"}
    </>
  );
}

export default function SearchPage() {
  const { playTrack } = useAudioPlayer(); // ★ 追加: playTrack 関数を取得
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    artists: [],
    tracks: [],
    lyrics: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ artists: [], tracks: [], lyrics: [] });
        return;
      }

      setLoading(true);
      setError(null);

      const query = `%${searchQuery.trim()}%`;
      
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('*')
        .ilike('name', query);

      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          audio_url,
          duration,
          lyrics,
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
        .or(`title.ilike.${query},lyrics.ilike.${query}`);

      setLoading(false);

      if (artistsError || tracksError) {
        console.error('検索エラー:', artistsError, tracksError);
        setError('検索中にエラーが発生しました。');
        return;
      }

      const categorizedResults = {
        artists: artistsData || [],
        tracks: [],
        lyrics: []
      };

      (tracksData || []).forEach(track => {
        // 楽曲タイトルにマッチした場合
        if (track.title?.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
          categorizedResults.tracks.push({
            ...track,
            jacket_url: track.works?.jacket_url,
            artist_name: track.works?.artists?.name,
            work_title: track.works?.title
          });
        }
        // 歌詞にマッチした場合
        if (track.lyrics?.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
          categorizedResults.lyrics.push({
            ...track,
            jacket_url: track.works?.jacket_url,
            artist_name: track.works?.artists?.name,
            work_title: track.works?.title
          });
        }
      });
      
      setSearchResults(categorizedResults);
    };

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 楽曲再生ハンドラ
  const handlePlayTrack = (track) => {
    // プレイリストとして検索結果のtracksを使用
    playTrack(track, searchResults.tracks, searchResults.tracks.findIndex(t => t.id === track.id));
  };


  return (
    <main className="p-4 max-w-4xl mx-auto min-h-screen mb-40">
      <h1 className="text-3xl font-bold mb-6 text-white select-none">検索</h1>

      <div className="mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="楽曲、アーティスト、歌詞を検索..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-white-900 placeholder-gray-300"
        />
      </div>

      {loading ? (
        <p className="text-gray-500 text-center select-none">検索中...</p>
      ) : error ? (
        <p className="text-red-500 text-center select-none">{error}</p>
      ) : searchQuery.trim() === '' ? (
        <p className="text-gray-500 text-center select-none">検索キーワードを入力してください。</p>
      ) : (
        <div className="space-y-8">
          {/* アーティスト */}
          <section>
            <h2 className="text-xl font-bold text-gray-100 mb-4 select-none">アーティスト</h2>
            {searchResults.artists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.artists.map(artist => (
                  <Link href={`/artists/${artist.id}`} key={artist.id} className="block">
                    <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
                      <ImageWithFallback
                        src={artist.image_url}
                        alt={artist.name}
                        className="w-12 h-12 rounded-full object-cover"
                        fallbackSrc="https://placehold.co/50x50/aaaaaa/ffffff?text=A"
                      />
                      <span className="font-semibold text-gray-800 flex-grow truncate">{artist.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 select-none">アーティストは見つかりませんでした。</p>
            )}
          </section>

          {/* 楽曲 */}
          <section>
            <h2 className="text-xl font-bold text-gray-100 mb-4 select-none">楽曲</h2>
            {searchResults.tracks.length > 0 ? (
              <div className="space-y-2">
                {searchResults.tracks.map(track => (
                  // ★ 変更: クリッカブルなボタンとして楽曲を表示
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track)}
                    className="w-full text-left bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <ImageWithFallback
                      src={track.jacket_url}
                      alt={track.title}
                      className="w-10 h-10 object-cover rounded-md"
                      fallbackSrc="https://placehold.co/40x40/cccccc/333333?text=Track"
                    />
                    <div className="flex flex-col flex-grow truncate">
                      <span className="font-semibold text-gray-800 truncate">{track.title}</span>
                      <span className="text-sm text-gray-600 truncate">{track.artist_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 select-none">楽曲は見つかりませんでした。</p>
            )}
          </section>

          {/* 歌詞 */}
          <section>
            <h2 className="text-xl font-bold text-gray-100 mb-4 select-none">歌詞</h2>
            {searchResults.lyrics.length > 0 ? (
              <div className="space-y-2">
                {searchResults.lyrics.map(track => (
                  // ★ 変更: クリッカブルなボタンとして歌詞のプレビューを表示
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track)}
                    className="w-full text-left bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <ImageWithFallback
                      src={track.jacket_url}
                      alt={track.title}
                      className="w-10 h-10 object-cover rounded-md"
                      fallbackSrc="https://placehold.co/40x40/cccccc/333333?text=Track"
                    />
                    <div className="flex flex-col flex-grow">
                      <span className="font-semibold text-gray-800 truncate">{track.title}</span>
                      <span className="text-sm text-gray-600 truncate">
                        {track.artist_name} - {track.work_title}
                      </span>
                      <p className="text-gray-500 text-sm">
                        {highlightLyrics(track.lyrics, searchQuery)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 select-none">歌詞は見つかりませんでした。</p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
