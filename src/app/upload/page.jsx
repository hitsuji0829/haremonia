'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GENRES } from '@/lib/genres';

export default function UploadPage() {
  const [artists, setArtists] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [newArtistName, setNewArtistName] = useState('');

  const [workTitle, setWorkTitle] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);

  const [jacketFile, setJacketFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id,name')
        .order('name');
      if (!error) setArtists(data || []);
    })();
  }, []);

  async function uploadToStorage(bucket, file) {
    const ext = (file?.name || 'bin').split('.').pop();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');

    // 必須チェック（歌詞以外は必須）
    if (!trackTitle || !audioFile) {
      setMsg('曲タイトルと音源ファイルは必須です。');
      return;
    }
    if (!selectedArtistId && !newArtistName) {
      setMsg('アーティストは既存選択または新規作成してください。');
      return;
    }

    setSubmitting(true);
    try {
      // 1) アーティスト
      let artistId = selectedArtistId;
      if (!artistId) {
        const { data: insertedArtist, error: aErr } = await supabase
          .from('artists')
          .insert({ name: newArtistName })
          .select('id')
          .single();
        if (aErr) throw aErr;
        artistId = insertedArtist.id;
      }

      // 2) ジャケット（任意）
      let jacket_url = null;
      if (jacketFile) {
        jacket_url = await uploadToStorage('jacket', jacketFile);
      }

      // 3) 作品（未入力なら曲名を流用）
      const titleForWork = workTitle || trackTitle;
      const { data: insertedWork, error: wErr } = await supabase
        .from('works')
        .insert({ title: titleForWork, artist_id: artistId, jacket_url })
        .select('id')
        .single();
      if (wErr) throw wErr;
      const workId = insertedWork.id;

      // 4) 音源アップロード（必須）
      const audio_url = await uploadToStorage('songs', audioFile);

      // 5) トラック作成
      const { error: tErr } = await supabase.from('tracks').insert({
        title: trackTitle,
        artist_id: artistId,
        work_id: workId,
        audio_url,
        duration: null,
        track_number: 1,
        lyrics,
        genre,
      });
      if (tErr) throw tErr;

      setMsg('投稿に成功しました！');
      // リセット
      setSelectedArtistId('');
      setNewArtistName('');
      setWorkTitle('');
      setTrackTitle('');
      setLyrics('');
      setGenre(GENRES[0]);
      setJacketFile(null);
      setAudioFile(null);
    } catch (err) {
      console.error(err);
      setMsg(`投稿に失敗しました: ${err?.message ?? err}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-4 max-w-2xl mx-auto mb-40">
      <h1 className="text-3xl font-bold mb-6 text-white">作品を投稿</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800/70 rounded-xl p-4">
        {/* アーティスト */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-200">アーティスト *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={selectedArtistId}
              onChange={(e) => { setSelectedArtistId(e.target.value); setNewArtistName(''); }}
              className="w-full rounded-md p-2 bg-white text-gray-900"
              required={!newArtistName}
            >
              <option value="">（新規作成）</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {selectedArtistId === '' && (
              <input
                type="text"
                placeholder="新しいアーティスト名"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                className="w-full rounded-md p-2 bg-white text-gray-900"
                required
              />
            )}
          </div>
        </div>

        {/* 作品名（任意） */}
        <div>
          <label className="block text-sm text-gray-200">作品名（任意）</label>
          <input
            type="text"
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            className="w-full rounded-md p-2 bg-white text-gray-900"
            placeholder="例) Dyed 17"
          />
        </div>

        {/* 曲タイトル（必須） */}
        <div>
          <label className="block text-sm text-gray-200">曲タイトル *</label>
          <input
            type="text"
            required
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            className="w-full rounded-md p-2 bg-white text-gray-900"
            placeholder="例) Monochrome"
          />
        </div>

        {/* 歌詞（任意） */}
        <div>
          <label className="block text-sm text-gray-200">歌詞（任意）</label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={6}
            className="w-full rounded-md p-2 bg-white text-gray-900"
            placeholder="歌詞を貼り付け"
          />
        </div>

        {/* ジャンル（必須） */}
        <div>
          <label className="block text-sm text-gray-200">ジャンル</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-md p-2 bg-white text-gray-900"
          >
            {GENRES.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        {/* ジャケット画像（任意） */}
        <div>
          <label className="block text-sm text-gray-200">ジャケット画像（任意）</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setJacketFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-200"
          />
        </div>

        {/* 音源ファイル（必須） */}
        <div>
          <label className="block text-sm text-gray-200">音源ファイル *</label>
          <input
            type="file"
            accept="audio/*"
            required
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-200"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? '投稿中…' : '投稿する'}
        </button>

        {msg && <p className="text-sm text-gray-100">{msg}</p>}
      </form>
    </main>
  );
}
