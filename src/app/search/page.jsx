// src/app/search/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ImageWithFallback from '@/components/ImageWithFallback';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
// ★ 追加: ジャンルマスタ（例: [{value:'jpop', label:'J-POP'}, ...]）
import { GENRES } from '@/lib/genres';

// ヒット部分の抜粋＆強調表示（既存）
function highlightLyrics(lyrics, keyword) {
  if (!keyword) return lyrics;
  const lowerLyrics = (lyrics || '').toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const index = lowerLyrics.indexOf(lowerKeyword);
  if (index === -1) return lyrics;

  const start = Math.max(0, index - 30);
  const end = Math.min((lyrics || '').length, index + keyword.length + 30);
  const before = lyrics.slice(start, index);
  const match = lyrics.slice(index, index + keyword.length);
  const after = lyrics.slice(index + keyword.length, end);

  return (
    <>
      {start > 0 && '…'}
      {before}
      <mark>{match}</mark>
      {after}
      {end < lyrics.length && '…'}
    </>
  );
}

export default function SearchPage() {
  const { playTrack } = useAudioPlayer();

  const [searchQuery, setSearchQuery] = useState('');
  // ★ 追加: ジャンル検索用のプルダウン状態（空文字は「すべて」）
  const [selectedGenre, setSelectedGenre] = useState('');

  // 既存のキーワード検索結果
  const [searchResults, setSearchResults] = useState({ artists: [], tracks: [], lyrics: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ★ 追加: 下にランダムで羅列する「条件一致の楽曲」一覧
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [filtering, setFiltering] = useState(false);
  const [filterError, setFilterError] = useState(null);

  // ========== A) キーワード検索（アーティスト/楽曲/歌詞） ==========
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
        const lowerQ = searchQuery.trim().toLowerCase();
        const matchTitle = (track.title || '').toLowerCase().includes(lowerQ);
        const matchLyrics = (track.lyrics || '').toLowerCase().includes(lowerQ);

        const shaped = {
          ...track,
          jacket_url: track.works?.jacket_url,
          artist_name: track.works?.artists?.name,
          work_title: track.works?.title
        };

        if (matchTitle) categorizedResults.tracks.push(shaped);
        if (matchLyrics) categorizedResults.lyrics.push(shaped);
      });

      setSearchResults(categorizedResults);
    };

    const timeoutId = setTimeout(performSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // ========== B) AND検索：ジャンル×キーワード → 楽曲をランダム表示 ==========
  useEffect(() => {
    const fetchFiltered = async () => {
      // どちらも空ならクリア
      if (!selectedGenre) {
        setFilteredTracks([]);
        return;
      }

      setFiltering(true);
      setFilterError(null);

      let q = supabase
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

      // 片方だけでもOK：AND検索（両方あれば両方かける）
      if (searchQuery.trim()) {
      const like = `%${searchQuery.trim()}%`;
      q = q.or(`title.ilike.${like},lyrics.ilike.${like}`);
    }
    q = q.eq('genre', selectedGenre).limit(100);

    const { data, error } = await q;
    setFiltering(false);

    if (error) {
      console.error('フィルタ取得エラー:', error);
      setFilterError('取得中にエラーが発生しました。');
      return;
    }

    const randomized = (data || [])
      .sort(() => Math.random() - 0.5)
      .map(track => ({
        ...track,
        jacket_url: track.works?.jacket_url,
        artist_name: track.works?.artists?.name,
        work_title: track.works?.title
      }));

    setFilteredTracks(randomized);
  };

  const t = setTimeout(fetchFiltered, 300);
  return () => clearTimeout(t);
  }, [searchQuery, selectedGenre]);

  // 再生（プレイリストとして filteredTracks を使う）
  const handlePlayTrack = (track, list) => {
    const idx = list.findIndex(t => t.id === track.id);
    playTrack(track, list, Math.max(0, idx));
  };

  return (
    <main className="p-4 max-w-4xl mx-auto min-h-screen mb-40">
      <h1 className="text-3xl font-bold mb-6 text-black dark:text-white select-none">検索</h1>

      {/* 検索ボックス＆ジャンルプルダウン */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="楽曲、アーティスト、歌詞を検索..."
          className="sm:col-span-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-white-900 placeholder-gray-300"
        />

        {/* ★ 追加: ジャンルプルダウン（空＝すべて） */}
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">すべてのジャンル</option>
          {GENRES.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* ★ 追加: 条件一致の楽曲（ランダム表示） */}
      {(searchQuery.trim() || selectedGenre) ? (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-100 mb-3 select-none">
            楽曲ジャンル検索結果（ランダム表示）
          </h2>
          {!selectedGenre ? (
    // ★ 追加: ジャンル未選択なら結果は出さず、ガイダンス表示
            <p className="text-gray-500 select-none">ジャンルを選択してください。</p>
          ) : filtering ? (
            <p className="text-gray-500 select-none">読み込み中...</p>
          ) : filterError ? (
            <p className="text-red-500 select-none">{filterError}</p>
          ) : filteredTracks.length > 0 ? (
            <div className="space-y-2">
              {filteredTracks.map(track => (
                <button
                  key={track.id}
                  onClick={() => handlePlayTrack(track, filteredTracks)}
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
                    <span className="text-sm text-gray-600 truncate">
                      {track.artist_name} {track.work_title ? `- ${track.work_title}` : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 select-none">該当する楽曲がありません。</p>
          )}
        </section>
      ) : (
        <p className="text-gray-500 select-none mb-10">キーワードまたはジャンルを指定してください。</p>
      )}

      {/* ここから下は、キーワード入力時のみの詳細カテゴリ表示（既存） */}
      {loading ? (
        <p className="text-gray-500 text-center select-none">検索中...</p>
      ) : error ? (
        <p className="text-red-500 text-center select-none">{error}</p>
      ) : searchQuery.trim() ? (
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

          {/* 楽曲（タイトル一致） */}
          <section>
            <h2 className="text-xl font-bold text-gray-100 mb-4 select-none">楽曲</h2>
            {searchResults.tracks.length > 0 ? (
              <div className="space-y-2">
                {searchResults.tracks.map(track => (
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track, searchResults.tracks)}
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

          {/* 歌詞（歌詞一致） */}
          <section>
            <h2 className="text-xl font-bold text-gray-100 mb-4 select-none">歌詞</h2>
            {searchResults.lyrics.length > 0 ? (
              <div className="space-y-2">
                {searchResults.lyrics.map(track => (
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track, searchResults.lyrics)}
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
      ) : null}
    </main>
  );
}
