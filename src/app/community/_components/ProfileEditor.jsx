// src/app/community/_components/ProfileEditor.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react'; // useRefを追加
import { supabase } from '../../../lib/supabaseClient';
import ImageWithFallback from '../../components/ImageWithFallback';
import { generateUserSignInCode, sha256Hex } from '@/lib/editCode';

export default function ProfileEditor({ user, initialProfile, onProfileUpdated }) {
  const [username, setUsername] = useState(() => localStorage.getItem('profile_username') || '');
  useEffect(() => { try { localStorage.setItem('profile_username', username); } catch{} }, [username]);
  // avatarUrlは、DBから来たURL、またはアップロード中のファイルプレビューURL
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState(null); // 選択されたファイル
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null); // ファイル入力要素への参照

  const [issuedCode, setIssuedCode] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const LS_KEY = (u) => `profile_signin_code_${u}`;

  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('profile_mode') || 'register';
    }
    return 'register';
  });

  // モード切り替え時に保存
  const switchMode = (newMode) => {
    setMode(newMode);
    try { localStorage.setItem('profile_mode', newMode); } catch {}
  };
  const [signinCodeInput, setSigninCodeInput] = useState(() => localStorage.getItem('profile_code') || '');
  useEffect(() => { try { localStorage.setItem('profile_code', signinCodeInput); } catch{} }, [signinCodeInput]);

  const LS_KEY_BY_NAME = (u) => `profile_signin_code_${u}`;
  const LS_KEY_BY_ID   = (id) => `profile_signin_code_uid_${id}`;
  const saveCode = (u, id, code) => {
    try { if (u)  localStorage.setItem(LS_KEY_BY_NAME(u), code); } catch {}
    try { if (id) localStorage.setItem(LS_KEY_BY_ID(id),   code); } catch {}
  };
  const loadCode = (u, id) => {
    try {
      const byName = u ? localStorage.getItem(LS_KEY_BY_NAME(u)) : null;
      if (byName) return byName;
      const byId = id ? localStorage.getItem(LS_KEY_BY_ID(id)) : null;
      return byId;
    } catch { return null; }
  };


  // ユーザーや初期プロフィールが変わったら状態をリセット
  useEffect(() => {
   // initialProfile がある時だけ “上書き” する（ない時に localStorage を消さない）
   if (initialProfile) {
     setUsername(initialProfile.username || '');
     setAvatarUrl(initialProfile.avatar_url || '');
     setAvatarFile(null);
     setMessage('');
   }
  }, [initialProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!user) {
      setMessage('エラー: ユーザーが認証されていません。');
      setLoading(false);
      return;
    }

    let newAvatarUrl = avatarUrl; // デフォルトは現在のURL
    const isNew = !initialProfile; // 初回作成か？
    let signinCodePlain = null; 
    try {
      if (isNew) {
          signinCodePlain = generateUserSignInCode(10);
          setIssuedCode(signinCodePlain);
          setShowCodeModal(true);
          saveCode((username || '').trim(), user.id, signinCodePlain);
        }
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`; // ユーザーIDをファイル名にする（一意性を保つため）
        const filePath = `${user.id}/${fileName}`; // 例: user_id/user_id.jpg

        // 古いアバター画像を削除 (任意だが推奨)
        // initialProfile?.avatar_url は、DBに既にURLがある場合
        if (initialProfile?.avatar_url && initialProfile.avatar_url !== '' && initialProfile.avatar_url !== newAvatarUrl) {
          try {
            // StorageのURLからパスを抽出
            const oldFilePath = initialProfile.avatar_url.split('/public/avatars/')[1];
            if (oldFilePath) {
              const { error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([oldFilePath]);
              if (deleteError) {
                console.warn('古いアバター画像の削除に失敗しました:', deleteError);
                // エラーが発生しても処理は続行
              }
            }
          } catch (e) {
            console.warn('古いアバター画像のパス抽出または削除中にエラー:', e);
          }
        }

        // 新しいアバター画像をアップロード
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: true, // 既存のファイルがあれば上書き
          });

        if (uploadError) {
          console.error('アバター画像のアップロードに失敗しました:', uploadError);
          setMessage(`プロフィールの更新に失敗しました: 画像アップロードエラー - ${uploadError.message}`);
          setLoading(false);
          return;
        }

        // アップロードされた画像の公開URLを取得
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        newAvatarUrl = publicUrlData.publicUrl;
      } else if (avatarUrl === '' && initialProfile?.avatar_url) {
        // 画像がクリアされ、かつ元々画像があった場合、Storageから削除
        try {
            const oldFilePath = initialProfile.avatar_url.split('/public/avatars/')[1];
            if (oldFilePath) {
                const { error: deleteError } = await supabase.storage
                  .from('avatars')
                  .remove([oldFilePath]);
                if (deleteError) {
                  console.warn('古いアバター画像の削除に失敗しました:', deleteError);
                }
            }
        } catch (e) {
            console.warn('アバター画像クリア時の削除中にエラー:', e);
        }
        newAvatarUrl = null; // DBのavatar_urlもnullにする
      }


      // プロフィールデータをデータベースに更新
      if (!isNew) {
        const saved = loadCode(username.trim(), user.id);
        if (!saved) {
          setMessage('このプロフィールを編集するにはサインインキーが必要です。');
          setLoading(false);
          return;
        }

        const okPayload = {
          username: username.trim() || null,
          avatar_url: newAvatarUrl ?? null,
        };

        const { data, error } = await supabase
          .from('profiles')
          .update(okPayload)
          .eq('id', user.id)
          .select()
          .maybeSingle();

        if (error) {
            console.error('profiles update error:', error);
            setMessage(`プロフィールの更新に失敗しました: ${error.message}`);
          } else {
            setMessage('プロフィールを更新しました！');
            onProfileUpdated?.({ ...(data || {}), ...okPayload });
          }
          setLoading(false);
          return;
        }

      // ★新規作成時は従来どおり upsert でOK
      // ★新規作成時はふつうに upsert する（Edge Functions 不要）
      const payload = {
        id: user.id,
        username: username.trim() || null,
        avatar_url: newAvatarUrl ?? null,
      };
      // 初回のみサインインキーを平文で保存（テーブルにカラムがある前提）
      if (signinCodePlain) {
        payload.signin_code_plain = signinCodePlain;
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('profiles upsert error:', error);
        setMessage(`プロフィールの作成に失敗しました: ${error.message}`);
      } else {
        setMessage('プロフィールを作成しました！');
        onProfileUpdated?.(data || payload);
      }


    } catch (err) {
      console.error('予期せぬエラー:', err);
      setMessage('予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // ▼ 追加：ログイン（ユーザー名＋10桁キーで既存プロフィールを開く）
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage('');

    const uname = (username || '').trim();
    const code  = (signinCodeInput || '').trim();
    if (!uname || !code) { setMessage('ユーザー名とサインインキーを入力してください。'); setLoading(false); return; }

    try {
      // 1) まず今の auth ユーザーを取得（匿名でもOK）
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setMessage('認証が切れています。もう一度サインインしてください。'); setLoading(false); return; }

      // 2) username + signin_code_plain で対象プロフィールを探す
      const { data: found, error: selErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', uname)
        .eq('signin_code_plain', code)
        .maybeSingle();

      if (selErr) { console.error(selErr); setMessage('ログイン検索に失敗しました。'); setLoading(false); return; }
      if (!found)  { setMessage('ユーザー名またはキーが違います。'); setLoading(false); return; }

      // 3) 見つかったプロフィールの内容を「今の auth.uid に」引き継ぐ
      const { data: claimed, error: rpcErr } = await supabase
      .rpc('claim_profile', {
        p_username: uname,
        p_code: code,
        p_new_id: authUser.id,
      })
      .single();
      if (rpcErr) {
        console.error('RPC error:', rpcErr);
        setMessage(rpcErr.message || 'プロフィールの引き継ぎに失敗しました。');
        setLoading(false);
        return;
      }

      try { localStorage.setItem(`profile_signin_code_uid_${claimed.id}`, code); } catch {}
      try { localStorage.setItem('profile_username', claimed.username || uname); } catch {}
      setAvatarUrl(claimed?.avatar_url || '');
      setMessage('ログインしました！');
      onProfileUpdated?.(claimed);

    } catch (err) {
      console.error(err);
      setMessage('予期せぬログインエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };


  // ファイル選択時のハンドラ
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // ファイルタイプのバリデーション
      if (!file.type.startsWith('image/')) {
        setMessage('画像ファイルを選択してください。');
        setAvatarFile(null);
        setAvatarUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      // ファイルサイズのバリデーション (例: 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('ファイルサイズは5MB以下にしてください。');
        setAvatarFile(null);
        setAvatarUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setAvatarFile(file);
      // 選択されたファイルのプレビューURLを生成
      setAvatarUrl(URL.createObjectURL(file));
      setMessage(''); // メッセージをクリア
    } else {
      setAvatarFile(null);
      setMessage('');
    }
  };

  // アバター画像をクリアするボタンのハンドラ
  const handleClearAvatar = () => {
    setAvatarFile(null);
    setAvatarUrl(''); // URLもクリアして、DBにnullを保存するように誘導
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // ファイル入力もクリア
    }
    setMessage('画像をクリアしました。「保存」で反映されます。');
  };

  // ▼ 置き換え：ログアウト（セッション破棄＋端末のキー類も必要に応じてクリア）
  const handleLogout = async () => {
    const ok = confirm('ログアウトしますか？');
    if (!ok) return;

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('ログアウトエラー:', error);
        setMessage('ログアウトに失敗しました。');
      } else {
        // 端末に保存したキーを“必要に応じて”削除（※任意）
        try {
          const uname = (initialProfile?.username || username || '').trim();
          if (uname) localStorage.removeItem(LS_KEY_BY_NAME(uname));
          if (initialProfile?.id) localStorage.removeItem(LS_KEY_BY_ID(initialProfile.id));
        } catch {}

        setMessage('ログアウトしました。');
        localStorage.removeItem('anonymous_id'); // 既存仕様のクリア
        onProfileUpdated?.(null); // 親側の profile をクリア
      }
    } catch (err) {
      console.error('予期せぬログアウトエラー:', err);
      setMessage('予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">プロフィール設定</h3>

      {/* プロフィールが設定されていない場合のみフォームを表示 */}
      {!initialProfile ? (
        <>
          {/* モード切り替えタブ風ボタン */}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`px-3 py-1 rounded ${mode==='register' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              新規作成
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`px-3 py-1 rounded ${mode==='login' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              ログイン
            </button>
          </div>

          {mode === 'register' ? (
            // 既存の「新規作成フォーム」（あなたの handleUpdateProfile を使う）
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  ユーザー名
                </label>
                <input
                  type="text"
                  id="username"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="あなたのユーザー名"
                  maxLength={20}
                  required
                />
              </div>

              {/* 既存のアバターアップロード UI はそのまま */}
              <div>
                <label htmlFor="avatar_file" className="block text-sm font-medium text-gray-700 mb-1">
                  アバター画像アップロード
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="avatar_file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {avatarUrl && (
                    <>
                      <ImageWithFallback
                        src={avatarUrl}
                        alt="アバタープレビュー"
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        fallbackSrc="https://placehold.co/40x40/cccccc/333333?text=User"
                      />
                      <button
                        type="button"
                        onClick={handleClearAvatar}
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-full border border-red-500 hover:border-red-700 transition-colors duration-200 flex-shrink-0"
                      >
                        クリア
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  JPEG/PNG/GIFなどの画像ファイルを選択してください。（最大5MB）
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '保存中...' : 'プロフィールを保存'}
              </button>

              {message && (
                <p className={`text-sm mt-2 ${message.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
                  {message}
                </p>
              )}
            </form>
          ) : (
            // ▼ ログインフォーム（ユーザー名＋キー）
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ユーザー名</label>
                <input
                  type="text"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900"
                  value={username}
                  onChange={(e)=>setUsername(e.target.value)}
                  placeholder="あなたのユーザー名"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">サインインキー（10桁）</label>
                <input
                  type="text"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-gray-900 tracking-widest"
                  value={signinCodeInput}
                  onChange={(e)=>setSigninCodeInput(e.target.value)}
                  placeholder="xxxxxxxxxx"
                  maxLength={10}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '確認中...' : 'ログイン'}
              </button>
              {message && (
                <p className={`text-sm mt-2 ${message.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
                  {message}
                </p>
              )}
            </form>
          )}
        </>
      ) : (
        // （後半）プロフィールがあるときの表示はそのまま
        // ボタン文言だけ「アカウント削除」→「ログアウト」に変更
        <div className="mt-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">現在のプロフィール</h4>
          <div className="flex items-center justify-between gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center gap-4">
              <ImageWithFallback
                src={initialProfile.avatar_url || "https://placehold.co/60x60/cccccc/333333?text=User"}
                alt="現在のプロフィール画像"
                className="w-12 h-12 rounded-full object-cover shadow-sm"
                fallbackSrc="https://placehold.co/60x60/cccccc/333333?text=User"
              />
              <span className="text-lg font-medium text-gray-900">
                {initialProfile.username || '名無しさん'}
              </span>
            </div>
            <button
              onClick={handleLogout}               
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '処理中...' : 'ログアウト'}   
            </button>
          </div>
          {message && (
            <p className={`text-sm mt-2 ${message.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>
      )}

      {showCodeModal && issuedCode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowCodeModal(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold mb-2">サインインキーを保存してください</h3>
            <p className="text-sm text-gray-700 mb-3">
              今後プロフィールの編集やサインインに必要です。
              この端末にも保存しますが、必ず控えてください。
            </p>
            <div className="rounded-lg border bg-gray-50 p-4 text-center">
              <div className="font-mono text-3xl tracking-[0.3em] text-gray-900 select-all">
                {issuedCode}
              </div>
            </div>
            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={()=>setShowCodeModal(false)}
                className="rounded-md bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
