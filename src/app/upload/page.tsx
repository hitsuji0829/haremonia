'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { GENRES } from '@/lib/genres';
import { generateEditCode, sha256Hex } from '@/lib/editCode';

//グレーのボックスで見せる共通ファイルピッカー
type FileBoxProps = {
  id: string;
  label: string;
  accept: string;
  required?: boolean;
  file: File | null;
  error?: string;
  helper?: string;
  onChange: (file: File | null) => void;
};

function FileBox({
  id, label, accept, required, file, error, helper, onChange,
}: FileBoxProps) {
  return (
    <div>
      <label className="block text-sm text-gray-200 mb-1">{label}</label>

      {/* 薄いグレーのボックス */}
      <label
        htmlFor={id}
        className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-100/80 p-3 text-gray-700 cursor-pointer hover:bg-gray-100 focus-within:ring-2 focus-within:ring-indigo-500"
      >
        <span className="truncate">
          {file ? file.name : 'ファイルを選択'}
        </span>
        <span className="text-xs text-gray-500 shrink-0">クリックして選択</span>
      </label>

      {/* ネイティブ input は隠す（ラベルで開く） */}
      <input
        id={id}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {helper && <p className="mt-1 text-xs text-gray-400">{helper}</p>}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function UploadPage() {
  const [artists, setArtists] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistBio, setNewArtistBio] = useState('');

  const [lyricist, setLyricist] = useState('');
  const [composer, setComposer] = useState('');
  const [arranger, setArranger] = useState('');

  const [workTitle, setWorkTitle] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState<string>(GENRES[0].value);

  const [artistImageFile, setArtistImageFile] = useState<File|null>(null);
  const [jacketFile, setJacketFile] = useState<File|null>(null);
  const [audioFile, setAudioFile] = useState<File|null>(null);

  const [artistImgErr, setArtistImgErr] = useState<string>('');
  const [jacketImgErr, setJacketImgErr]   = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [existingArtistCode, setExistingArtistCode] = useState('');

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuedArtistId, setIssuedArtistId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [audioErr, setAudioErr] = useState<string>('');


  const MAX_AUDIO_FILE_SIZE = 70 * 1024 * 1024; // 70MB
  const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg','audio/mp3','audio/wav','audio/x-wav',
    'audio/flac','audio/aac','audio/mp4','audio/ogg'
  ];

// 表示用
const fmtMB = (b: number) => Math.round(b / 1024 / 1024);

  const artistNamePreview = useMemo(() => {
    if (selectedArtistId) {
      return artists.find(a => a.id === selectedArtistId)?.name ?? '(不明)';
    }
    return newArtistName || '(新規)';
  }, [artists, selectedArtistId, newArtistName]);

  const genreLabel = useMemo(() => {
    return GENRES.find(g => g.value === genre)?.label ?? genre;
  }, [genre]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('id,name')
        .order('name');
      if (!error) setArtists(data || []);
    })();
  }, []);

    // ★ 既存アーティスト選択時に、端末保存のキーを自動入力（あれば）
  useEffect(() => {
    if (!selectedArtistId) {
      setExistingArtistCode('');
      return;
    }
    try {
      const saved = localStorage.getItem(`artist_edit_code_${selectedArtistId}`);
      setExistingArtistCode(saved || '');
    } catch {
      // noop
    }
  }, [selectedArtistId]);

  async function validateImage(file: File, min = 1600, mustSquare = true): Promise<{ok:boolean; w:number; h:number; message?:string}> {
    if (!file) return { ok:false, w:0, h:0, message:'画像ファイルが選択されていません' };
    const blobUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('画像を読み込めませんでした'));
        i.src = blobUrl;
      });
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const sizeOK = w >= min && h >= min;
      const squareOK = !mustSquare || w === h;
      if (!sizeOK || !squareOK) {
        return {
          ok:false, w, h,
          message: !sizeOK
            ? `画像の最小サイズは ${min}×${min} です（現在: ${w}×${h}）`
            : `正方形の画像にしてください（現在: ${w}×${h}）`
        };
      }
      return { ok:true, w, h };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  // ★ 追加：ローカルの音源ファイルから長さ(秒)を取得
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    const cleanup = () => { URL.revokeObjectURL(url); audio.remove(); };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const sec = Math.max(0, Math.round(audio.duration || 0));
      cleanup();
      resolve(sec);
    };
    audio.onerror = () => { cleanup(); reject(new Error('音源の長さを取得できませんでした')); };
    audio.src = url;
  });
}

// ★ ストレージへアップロードして公開URLを返す
async function uploadToStorage(
  bucket: 'artist-images' | 'jacket' | 'songs',
  file: File
): Promise<string> {
  const ext = (file.name || 'bin').split('.').pop();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setArtistImgErr('');
    setJacketImgErr('');

    if (!lyricist || !composer || !arranger) {
      setMsg('作詞者・作曲者・編曲者は必須です。');
      return;
    }

    if (!jacketFile) {
      setJacketImgErr('ジャケット画像は必須です。');
      setMsg('必須項目を確認してください。');
      return;
    }
    const jRes = await validateImage(jacketFile, 1600, true);
    if (!jRes.ok) {
      setJacketImgErr(jRes.message!);
      setMsg('ジャケット画像の条件を満たしていません。');
      return;
    }

    // 必須チェック（歌詞以外は必須）
    if (!selectedArtistId) {
      if (!newArtistName) {
        setMsg('アーティストは既存選択または新規作成してください。');
        return;
      }
      if (newArtistBio.length > 300) {
        setMsg('アーティスト紹介文は300文字以内で入力してください。');
        return;
      }
      if (!artistImageFile) {
        setArtistImgErr('アーティスト画像は必須です。');
        setMsg('必須項目を確認してください。');
        return;
      }
      const aRes = await validateImage(artistImageFile, 1600, true);
      if (!aRes.ok) {
        setArtistImgErr(aRes.message!);
        setMsg('アーティスト画像の条件を満たしていません。');
        return;
      }
    }

    if (!trackTitle || !audioFile) {
      setMsg('曲タイトルと音源ファイルは必須です。');
      return;
    }
    if (audioFile.size > MAX_AUDIO_FILE_SIZE) {
      setAudioErr(`ファイルが大きすぎます（${fmtMB(audioFile.size)}MB）。${fmtMB(MAX_AUDIO_FILE_SIZE)}MB 以下にしてください。`);
      setMsg('音源ファイルのサイズ上限を超えています。');
      return;
    }
    if (ALLOWED_AUDIO_TYPES.length && !ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      setAudioErr('対応していないファイル形式です。mp3 / wav / flac / aac / mp4 / ogg を選んでください。');
      setMsg('音源ファイルの形式が非対応です。');
      return;
    }


        // ★ 既存アーティストのときは編集キー検証
    if (selectedArtistId) {
      const code = (existingArtistCode || '').trim().toUpperCase();
      if (code.length !== 10) {
        setMsg('選択したアーティストの編集キー（10桁）を入力してください。');
        return;
      }
      // id型に合わせる（bigint想定。UUIDでも動くよう両対応）
      const idForRpc: any = /^\d+$/.test(selectedArtistId)
        ? parseInt(selectedArtistId, 10)
        : selectedArtistId;

      const { data: ok, error: rpcErr } = await supabase.rpc('update_artist_with_code', {
        p_artist_id: idForRpc,
        p_code: code,
        p_updates: {}, // 空更新＝DBは変わらない、true/falseだけ返す
      });

      if (rpcErr) {
        console.error(rpcErr);
        setMsg('編集キーの検証に失敗しました。時間をおいて再試行してください。');
        return;
      }
      if (!ok) {
        setMsg('編集キーが正しくありません。');
        return;
      }
      try { localStorage.setItem(`artist_edit_code_${selectedArtistId}`, code); } catch {}
    }


    setConfirmOpen(true);
  }

  async function doSubmit(){
    setSubmitting(true);
    setMsg('');
    setConfirmOpen(false);

    try {
      // 1) アーティスト
      let artistId = selectedArtistId;
      let artistImageUrl: string | null = null;

      if (!artistId) {
        const nameTrim = (newArtistName || '').trim();

        // ★ 先に同名アーティストがいるか確認（いたら再利用）
        const { data: existing, error: exErr } = await supabase
          .from('artists')
          .select('id')
          .eq('name', nameTrim)
          .maybeSingle();

        if (exErr) throw exErr;

        if (existing) {
          // 既存を再利用（重複INSERTしない）
          artistId = existing.id;
        } else {
          // いなければ初めて作成
          artistImageUrl = await uploadToStorage('artist-images', artistImageFile!);

          const editCode = generateEditCode(10);
          const editCodeHash = await sha256Hex(editCode);
          const { data: insertedArtist, error: aErr } = await supabase
            .from('artists')
            .insert({
              name: nameTrim,
              bio: newArtistBio || null,
              image_url: artistImageUrl,
              edit_code_plain: editCode,
              edit_code_hash: editCodeHash   // ★ 平文を直接保存
              // edit_code_hash は DB のトリガーが自動生成
            })
            .select('id')
            .single();
          if (aErr) throw new Error(`[artists.insert] ${aErr.message}`);
          console.log('[artists.insert] OK:', insertedArtist);

          artistId = insertedArtist.id;

          setIssuedCode(editCode);
          setIssuedArtistId(artistId);
          try {
            // 端末にも保存（後で参照できるように）
            localStorage.setItem(`artist_edit_code_${artistId}`, editCode);
          } catch {}
          setCopied(false);
          setCodeModalOpen(true);
        }
      }
      // 2) ジャケット
      const jacket_url = await uploadToStorage('jacket', jacketFile!);

      // 3) 作品（未入力なら曲名を流用）
      const titleForWork = (workTitle || '').trim() || trackTitle.trim();
      const { data: insertedWork, error: wErr } = await supabase
        .from('works')
        .insert({ title: titleForWork, artist_id: artistId, jacket_url })
        .select('id')
        .single();
      if (wErr) throw new Error(`[works.insert] ${wErr.message}`);
      console.log('[works.insert] OK:', insertedWork);

      const workId = insertedWork.id;

      // 4) 音源アップロード（必須）
      const durationSec = await getAudioDuration(audioFile!);
      const audio_url = await uploadToStorage('songs', audioFile!);

      // 5) トラック作成
      const { error: tErr } = await supabase.from('tracks').insert({
        title: trackTitle,
        artist_id: artistId,
        work_id: workId,
        audio_url,
        duration: durationSec,
        track_number: 1,
        lyrics,
        genre,
        lyricist,
        composer,
        arranger,
      });
      if (tErr) throw new Error(`[tracks.insert] ${tErr.message}`);
      console.log('[tracks.insert] OK');

      setMsg('投稿に成功しました！');
      // リセット
      setSelectedArtistId('');
      setNewArtistName('');
      setNewArtistBio('');
      setWorkTitle('');
      setTrackTitle('');
      setLyrics('');
      setGenre(GENRES[0].value);
      setLyricist('');
      setComposer('');
      setArranger('');
      setArtistImageFile(null);
      setJacketFile(null);
      setAudioFile(null);
      setArtistImgErr('');
      setJacketImgErr('');
      setExistingArtistCode('');

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
              onChange={(e) => {
                setSelectedArtistId(e.target.value);
                setNewArtistName(''); 
                setNewArtistBio('');
                setArtistImageFile(null);
                setArtistImgErr('');
              }}
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
            {selectedArtistId === '' && (
              <div className="mt-2">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    アーティスト紹介文（任意・300字以内）
                  </label>
                  <textarea
                    value={newArtistBio}
                    onChange={(e) => setNewArtistBio(e.target.value.slice(0, 300))}
                    rows={3}
                    className="w-full rounded-md p-2 bg-white text-gray-900"
                    placeholder="プロフィールや経歴・実績など（300文字以内）"
                />
                <div className="mt-1 text-right text-xs text-gray-300">
                  {newArtistBio.length}/300
                </div>
              </div>

              {/* ★ 追加した箇所: 新規作成のときだけアーティスト画像（必須・1600正方形） */}
              <FileBox
                id="artist-images"
                label="アーティスト画像（必須 / 正方形・1600px以上）"
                accept="image/*"
                required={selectedArtistId === ''}
                file={artistImageFile}
                error={artistImgErr}
                helper="1600×1600px以上の正方形画像を選んでください。※推奨：png/jpeg"
                onChange={async (f) => {
                  setArtistImageFile(f);
                  setArtistImgErr('');
                  if (f) {
                    const res = await validateImage(f, 1600, true);
                    if (!res.ok) setArtistImgErr(res.message!);
                  }
                }}
              />
              <p className="mt-3 text-xs text-gray-300">
                ※ アーティスト情報の編集には、
                <span className="font-semibold">投稿成功時に発行される10桁の編集キー</span>が必要です。
                キーはこの端末にも保存されますが、必ず控えておいてください。
              </p>
            </div>
          )}
          {selectedArtistId !== '' && (
            <div className="mt-2">
              <label className="block text-xs text-gray-300 mb-1">
                このアーティストの編集キー（10桁） *
              </label>
              <input
                type="text"
                inputMode="text"
                value={existingArtistCode}
                onChange={(e) => setExistingArtistCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full rounded-md p-2 bg-white text-gray-900 tracking-widest"
                placeholder="XXXXXXXXXX"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                ※ 既存アーティストで投稿するには編集キーが必要です。
              </p>
            </div>
          )}
        </div>

        {/* 作品名（任意） */}
        <div>
          <label className="block text-sm text-gray-200">作品名（任意・入力しない場合は楽曲タイトルが入ります。）</label>
          <input
            type="text"
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            className="w-full rounded-md p-2 bg-white text-gray-900"
            placeholder="例) HAREmonia"
          />
        </div>

        {/* 曲タイトル（必須） */}
        <div>
          <label className="block text-sm text-gray-200">楽曲タイトル *</label>
          <input
            type="text"
            required
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            className="w-full rounded-md p-2 bg-white text-gray-900"
            placeholder="例) HAREmonia's Song (feat.HARE Taro)"
          />
        </div>

        {/* クレジット（必須）— 歌詞の上に配置 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-200">作詞 *</label>
            <input
              type="text"
              required
              value={lyricist}
              onChange={(e) => setLyricist(e.target.value)}
              className="w-full rounded-md p-2 bg-white text-gray-900"
              placeholder="例) HARE Taro"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-200">作曲 *</label>
            <input
              type="text"
              required
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              className="w-full rounded-md p-2 bg-white text-gray-900"
              placeholder="例) HARE Hanako"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-200">編曲 *</label>
            <input
              type="text"
              required
              value={arranger}
              onChange={(e) => setArranger(e.target.value)}
              className="w-full rounded-md p-2 bg-white text-gray-900"
              placeholder="例) HARE Yukai"
            />
          </div>
        </div>

        {/* 歌詞（任意） */}
        <div>
          <label className="block text-sm text-gray-200">歌詞（任意）※適宜改行してください。</label>
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
        <FileBox
          id="jacket-image"
          label="ジャケット画像（必須 / 正方形・1600px以上）"
          accept="image/*"
          required
          file={jacketFile}
          error={jacketImgErr}
          helper="※ 1600×1600px以上の正方形画像を選んでください。※推奨：png/jpeg"
          onChange={async (f) => {
            setJacketFile(f);
            setJacketImgErr('');
            if (f) {
              const res = await validateImage(f, 1600, true);
              if (!res.ok) setJacketImgErr(res.message!);
            }
          }}
        />

        {/* 音源ファイル（必須） */}
        <FileBox
          id="audio-file"
          label="音源ファイル *"
          accept="audio/*"
          required
          file={audioFile}
          error={audioErr}
          helper={`最大サイズは ${fmtMB(MAX_AUDIO_FILE_SIZE)}MB です。※推奨：mp3/wav`}
          onChange={(f) => {
            setAudioErr('');
            setMsg('');
            if (!f) { setAudioFile(null); return; }

            // サイズチェック
            if (f.size > MAX_AUDIO_FILE_SIZE) {
              setAudioFile(null);
              setAudioErr(`ファイルが大きすぎます（${fmtMB(f.size)}MB）。${fmtMB(MAX_AUDIO_FILE_SIZE)}MB 以下にしてください。`);
              setMsg('音源ファイルのサイズ上限を超えています。');
              return;
            }

            // 形式チェック（拡張したければ ALLOWED_AUDIO_TYPES を増やす）
            if (ALLOWED_AUDIO_TYPES.length && !ALLOWED_AUDIO_TYPES.includes(f.type)) {
              setAudioFile(null);
              setAudioErr('対応していないファイル形式です。mp3 / wav / flac / aac / mp4 / ogg を選んでください。');
              setMsg('音源ファイルの形式が非対応です。');
              return;
            }

            setAudioFile(f);
          }}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? '投稿中…' : '投稿する'}
        </button>

        {msg && <p className="text-sm text-gray-100">{msg}</p>}
      </form>

      {/* ===== 確認モーダル ===== */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* 背景 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmOpen(false)}
            aria-hidden
          />
          {/* ダイアログ */}
          <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-gray-900">この内容で投稿しますか？</h3>

            <div className="space-y-2 text-sm text-gray-700">
              <div><span className="font-semibold">アーティスト：</span>{artistNamePreview}</div>
              <div><span className="font-semibold">作品名：</span>{workTitle || '(未入力 → 曲名を使用)'}</div>
              <div><span className="font-semibold">曲名：</span>{trackTitle}</div>
              <div><span className="font-semibold">ジャンル：</span>{genreLabel}</div>
              <div><span className="font-semibold">ジャケット：</span>{jacketFile ? jacketFile.name : '(なし)'}</div>
              <div><span className="font-semibold">音源：</span>{audioFile ? audioFile.name : '(未選択)'}</div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={submitting}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? '投稿中…' : '投稿する'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== 発行された編集コード表示モーダル ===== */}
      {codeModalOpen && issuedCode && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCodeModalOpen(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">編集コードを保存してください</h3>
            <p className="text-sm text-gray-700 mb-3">
              アーティスト情報を編集するには、<span className="font-semibold">下の10桁のキー</span>が必要です。
              端末にも保存しましたが、念のため控えておいてください。
            </p>
            <div className="rounded-lg border bg-gray-50 p-4 text-center">
              <div className="font-mono text-3xl tracking-[0.3em] text-gray-900 select-all">
                {issuedCode}
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(issuedCode);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                {copied ? 'コピーしました' : 'コピー'}
              </button>
              <button
                type="button"
                onClick={() => setCodeModalOpen(false)}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
              >
                閉じる
              </button>
            </div>
            {issuedArtistId && (
              <p className="mt-3 text-xs text-gray-500">
                このキーはこの端末では <code>artist_edit_code_{'{'}{issuedArtistId}{'}'}</code> として保存しました。
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}