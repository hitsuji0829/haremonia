// src/app/community/_components/ProfileEditor.jsx
'use client';

import React, { useState, useEffect, useRef } from 'react'; // useRefを追加
import { supabase } from '../../../lib/supabaseClient';
import ImageWithFallback from '../../components/ImageWithFallback';

export default function ProfileEditor({ user, initialProfile, onProfileUpdated }) {
  const [username, setUsername] = useState(initialProfile?.username || '');
  // avatarUrlは、DBから来たURL、またはアップロード中のファイルプレビューURL
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState(null); // 選択されたファイル
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null); // ファイル入力要素への参照

  // ユーザーや初期プロフィールが変わったら状態をリセット
  useEffect(() => {
    setUsername(initialProfile?.username || '');
    setAvatarUrl(initialProfile?.avatar_url || '');
    setAvatarFile(null); // ファイル選択もリセット
    setMessage('');
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

    try {
      // ファイルが選択されている場合のみアップロード処理
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
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username.trim() === '' ? null : username.trim(),
          avatar_url: newAvatarUrl, // アップロードされたURLまたはクリアされたURL
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('プロフィール更新エラー:', error);
        setMessage(`プロフィールの更新に失敗しました: ${error.message}`);
      } else {
        setMessage('プロフィールを更新しました！');
        if (onProfileUpdated) {
          onProfileUpdated(data);
        }
        setAvatarFile(null); // アップロード成功後、選択ファイルをクリア
        if (fileInputRef.current) { // ファイル入力のリセット
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      console.error('予期せぬエラー:', err);
      setMessage('予期せぬエラーが発生しました。');
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

  // アカウント削除処理
  const handleDeleteAccount = async () => {
    if (!user) {
      alert('エラー: ユーザーが認証されていません。');
      return;
    }

    const confirmDelete = confirm('本当にアカウントを削除しますか？\nこの操作は元に戻せません。');
    if (!confirmDelete) {
      return;
    }

    setLoading(true); // ボタンを無効化
    setMessage('');

    try {
      // Supabaseの認証セッションをログアウトさせる
      // これによりブラウザのセッションがクリアされ、この匿名アカウントは利用できなくなる
      // データベース上のauth.usersエントリ自体は残るが、ユーザー体験上は「削除」となる
      // 完全にauth.usersから削除するには、サービスロール権限を持つSupabase Functionが必要
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('アカウント削除（ログアウト）エラー:', error);
        setMessage('アカウントの削除に失敗しました。');
      } else {
        setMessage('アカウントを削除しました。新しいプロフィールを設定できます。');
        // ログアウト後、CommentSectionのonAuthStateChangeリスナーが発火し、
        // userとprofileの状態がリセットされ、プロフィール設定ボタンが表示されるはず
        // localStorageのanonymous_idもクリアされるため、完全に新しい匿名ユーザーとして扱われる
        localStorage.removeItem('anonymous_id'); // 匿名IDもクリア
      }
    } catch (err) {
      console.error('予期せぬアカウント削除エラー:', err);
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
            />
          </div>
          <div>
            <label htmlFor="avatar_file" className="block text-sm font-medium text-gray-700 mb-1">
              アバター画像アップロード
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="avatar_file"
                ref={fileInputRef} // refをセット
                accept="image/*" // 画像ファイルのみ選択可能に
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {avatarUrl && ( // プレビューとクリアボタン
                <>
                  <ImageWithFallback
                    src={avatarUrl}
                    alt="アバタープレビュー"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    fallbackSrc="https://placehold.co/40x40/cccccc/333333?text=User"
                  />
                  <button
                    type="button" // フォーム送信を防ぐ
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
        // プロフィールが設定されている場合は、現在のプロフィールと削除ボタンを表示
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
            {/* アカウント削除ボタン */}
            <button
              onClick={handleDeleteAccount}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '削除中...' : 'アカウント削除'}
            </button>
          </div>
          {message && (
            <p className={`text-sm mt-2 ${message.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
