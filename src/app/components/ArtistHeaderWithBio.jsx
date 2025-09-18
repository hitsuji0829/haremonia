'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ImageWithFallback from '@/components/ImageWithFallback';
import FavoriteButton from '@/components/FavoriteButton';

export default function ArtistHeaderWithBio({ name, imageUrl, bio, artistId, socials }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef(null);
  const [max, setMax] = useState(0);
  useEffect(() => { if (contentRef.current) setMax(contentRef.current.scrollHeight); }, [bio, open]);

  const [askCodeOpen, setAskCodeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCode, setEditCode] = useState('');

  const hasBio = !!bio && bio.trim().length > 0;

  const nameLen =(name ?? '').length;
  const nameSizeClass =
    nameLen <= 3 ? 'text-3xl' :
    nameLen <= 8 ? 'text-2xl' :
    nameLen <= 10 ? 'text-xl'  :
                    'text-lg';

  return (
    <div className="mb-8">
      {/* ヘッダ */}
      <div className="flex items-center gap-6 p-4 bg-white rounded-xl shadow-md select-none">
        <ImageWithFallback
          src={imageUrl}
          alt={name || 'アーティスト'}
          className="w-14 h-14 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0 select-none"
          fallbackSrc="https://placehold.co/100x100/aaaaaa/ffffff?text=Artist"
        />
        <div className="min-w-0 flex-1"> {/* ← 重要：親に余白を与える */}
          <h1
            className={`${nameSizeClass} sm:text-4xl font-extrabold leading-tight text-gray-800
                        whitespace-normal break-words [overflow-wrap:anywhere]
                        line-clamp-2 sm:line-clamp-1`}
            title={name}
          >
            {name}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <FavoriteButton artistId={artistId} />
          {hasBio && (
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              aria-controls="artist-bio-panel"
              className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-300 shadow-sm"
              title="プロフィールを表示"
            >
              <span className={`text-2xl leading-none transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>＋</span>
            </button>
          )}
        </div>
      </div>

      {/* 下にスライドするプロフィール */}
      {hasBio && (
        <div
          id="artist-bio-panel"
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out bg-white rounded-b-xl shadow-md -mt-2"
          style={{ maxHeight: open ? max + 56 : 0 }} // 編集ボタン分ちょい余裕
        >
          <div ref={contentRef} className="px-6 pb-4 pt-4 border-t border-gray-200 text-gray-700">
            <h3 className="mb-2 text-xs font-semibold text-gray-500 tracking-wide select-none">プロフィール</h3>
            <div className="whitespace-pre-wrap">{bio}</div>

            {socials && (
                (() => {
                    const toUrl = (kind, val) => {
                    if (!val) return null;
                    const v = val.trim();
                    if (/^https?:\/\//i.test(v)) return v;
                    if (kind==='x')         return `https://x.com/${v.replace(/^@/,'')}`;
                    if (kind==='instagram') return `https://instagram.com/${v.replace(/^@/,'')}`;
                    if (kind==='tiktok')    return `https://www.tiktok.com/@${v.replace(/^@/,'')}`;
                    if (kind==='youtube')   return `https://www.youtube.com/${v}`;
                    if (kind==='site')      return `https://${v}`;
                    return v;
                    };
                    const items = [];
                    const push = (label, url) => url && items.push(
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-block rounded-full bg-gray-800 text-gray-100 text-xs px-3 py-1 hover:bg-gray-700">
                        {label}
                    </a>
                    );
                    push('X',         toUrl('x', socials?.x));
                    push('Instagram', toUrl('instagram', socials?.instagram));
                    push('YouTube',   toUrl('youtube', socials?.youtube));
                    push('TikTok',    toUrl('tiktok', socials?.tiktok));
                    push('Web',       toUrl('site', socials?.site));
                    return items.length ? <div className="mt-3 flex flex-wrap gap-2">{items}</div> : null;
                })()
                )}

            {/* ★ プロフィールの“下”に編集ボタン */}
            <div className="mt-4 text-right">
              <button
                onClick={() => setAskCodeOpen(true)}
                className="inline-flex items-center gap-1 rounded-md h-9 px-3 bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                プロフィールを編集
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ① キー入力モーダル */}
      {askCodeOpen && (
        <EnterCodeModal
          artistId={artistId}
          onCancel={() => setAskCodeOpen(false)}
          onNext={(code) => { setEditCode(code); setAskCodeOpen(false); setEditOpen(true); }}
        />
      )}

      {/* ② 編集モーダル（キーは前段で入力済み） */}
      {editOpen && (
        <EditArtistModal
          initialBio={bio || ''}
          initialSocials={socials || {}}
          artistId={artistId}
          editCode={editCode}
          onClose={() => setEditOpen(false)}
          onSaved={() => location.reload()}
        />
      )}
    </div>
  );
}

/* --- キー入力モーダル --- */
function EnterCodeModal({ artistId, onCancel, onNext }) {
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem(`artist_edit_code_${artistId}`) || ''; } catch { return ''; }
  });
  const [err, setErr] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl bg-gray-900 p-5 shadow-xl border border-gray-800 text-gray-100">
        <h3 className="text-lg font-bold mb-3 text-gray-100">編集キーを入力</h3>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 p-3 tracking-widest
               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="XXXXXXXXXX"
        />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-gray-700 bg-gray-800 text-gray-100 px-4 py-2
                    hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600"
          >
            閉じる
          </button>
          <button
            onClick={() => code.trim().length === 10 ? onNext(code.trim()) : setErr('10桁のキーを入力してください')}
            className="flex-1 rounded-md bg-indigo-600 text-white px-4 py-2
                 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- 編集モーダル（RPCで更新） --- */
function EditArtistModal({ initialBio, initialSocials, artistId, editCode, onClose, onSaved }) {
  const [bio, setBio] = useState(initialBio.slice(0, 300));
  const [socials, setSocials] = useState({
    x: initialSocials?.x || '',
    instagram: initialSocials?.instagram || '',
    youtube: initialSocials?.youtube || '',
    tiktok: initialSocials?.tiktok || '',
    site: initialSocials?.site || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const prune = (obj) => Object.fromEntries(Object.entries(obj).filter(([,v]) => v && String(v).trim() !== ''));
      const payload = {
        bio: (bio ?? '').trim() || null,
        socials: Object.keys(prune(socials)).length ? prune(socials) : null,
      };
      const idForRpc =
       typeof artistId === 'string' ? parseInt(artistId, 10) : artistId;

      const { data, error: rpcErr } = await supabase.rpc('update_artist_with_code', {
        p_artist_id: idForRpc,
        p_code: editCode,
        p_updates: payload,
      });
      if (rpcErr) throw rpcErr;
      if (!data) { setError('編集キーが違います'); setSaving(false); return; }
      try { localStorage.setItem(`artist_edit_code_${artistId}`, editCode); } catch {}
      onSaved();
    } catch (e) {
      setError(e?.message || '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* 背景 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* パネル（モバイルは下からのシート風） */}
      <div
        className="
          relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl
          bg-gray-900 shadow-xl border border-gray-800 text-gray-100
          flex flex-col
          max-h-[min(92svh,720px)] sm:max-h-[80vh]
        "
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ヘッダー */}
        <div className="px-4 sm:px-5 pt-3 pb-2 sm:pt-4 sm:pb-3 border-b border-gray-800">
          <h3 className="text-base sm:text-lg font-bold">プロフィールを編集</h3>
        </div>

        {/* スクロール領域 */}
        <div className="px-4 sm:px-5 py-3 overflow-y-auto">
          <label className="block text-xs sm:text-sm text-gray-300 mb-1">プロフィール（300字以内）</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 p-2 sm:p-3 mb-1
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="自己紹介など"
          />
          <div className="text-right text-[11px] sm:text-xs text-gray-400 mb-3">{bio.length}/300</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <Input label="X（@またはURL）"        value={socials.x}         onChange={(v)=>setSocials(s=>({...s,x:v}))} />
            <Input label="Instagram（@またはURL）" value={socials.instagram} onChange={(v)=>setSocials(s=>({...s,instagram:v}))} />
            <Input label="TikTok（@またはURL）"    value={socials.tiktok}    onChange={(v)=>setSocials(s=>({...s,tiktok:v}))} />
            <Input label="YouTube（URL）"          value={socials.youtube}   onChange={(v)=>setSocials(s=>({...s,youtube:v}))} />
            <Input label="Webサイト（URL）"        value={socials.site}      onChange={(v)=>setSocials(s=>({...s,site:v}))} />
          </div>

          <p className="mt-2 text-[11px] sm:text-xs text-gray-400">
            ※「@handle」でも「https://…」でもOK。表示時に自動でリンク化されます。
          </p>

          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </div>

        {/* フッター（常に見える） */}
        <div
          className="
            sticky bottom-0 px-4 sm:px-5 pt-2 pb-3
            bg-gray-900/95 backdrop-blur border-t border-gray-800
            flex gap-2 sm:gap-3
          "
          style={{ paddingBottom: `calc(env(safe-area-inset-bottom,0px) + 10px)` }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-md border border-gray-700 bg-gray-800 text-gray-100 text-sm hover:bg-gray-700"
          >
            閉じる
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );

}

function Input({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs sm:text-sm text-gray-300 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 p-2 sm:p-3
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      />
    </label>
  );
}
