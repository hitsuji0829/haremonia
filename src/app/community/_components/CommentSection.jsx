// src/app/community/_components/CommentSection.jsx
'use client'; // クライアントコンポーネントとして動作させる

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient'; // Supabaseクライアントをインポート
import { v4 as uuidv4 } from 'uuid'; // 匿名ID生成用
import ImageWithFallback from '../../components/ImageWithFallback'; // 画像エラーハンドリング用コンポーネント
import ProfileEditor from './ProfileEditor'; // プロフィールエディターコンポーネントをインポート

// 匿名ユーザーの識別子をローカルストレージから取得または生成する関数 (もう使用しないが、念のため残す)
const getAnonymousId = () => {
  let anonymousId = localStorage.getItem('anonymous_id');
  if (!anonymousId) {
    anonymousId = uuidv4(); // 新しいUUIDを生成
    localStorage.setItem('anonymous_id', anonymousId);
  }
  return anonymousId;
};

// 投稿制限のチェック関数（簡易版）
const checkPostLimit = (dailyPostCount, maxLimit, lastPostDate) => {
  const today = new Date().toDateString();
  const lastPostDay = lastPostDate ? new Date(lastPostDate).toDateString() : null;

  if (lastPostDay !== today) {
    return { canPost: true, newCount: 1 };
  } else {
    if (dailyPostCount < maxLimit) {
      return { canPost: true, newCount: dailyPostCount + 1 };
    } else {
      return { canPost: false, newCount: dailyPostCount };
    }
  }
};


// initialComments プロパティはもう受け取らない
export default function CommentSection({ artistId }) {
  // comments ステートを最も堅牢な方法で初期化
  const [comments, setComments] = useState([]); 
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null); // 認証済みユーザー情報 (auth.users)
  const [profile, setProfile] = useState(null); // profilesテーブルのユーザープロフィール
  const [loadingAuth, setLoadingAuth] = useState(true); // 認証状態のロード中
  const [loadingComments, setLoadingComments] = useState(true); // コメントのロード中状態
  const [commentsError, setCommentsError] = useState(null); // コメント取得エラー状態
  const [posting, setPosting] = useState(false); // 投稿中
  const [postLimitExceeded, setPostLimitExceeded] = useState(false); // 投稿制限超過フラグ

  const IDENTIFIED_POST_LIMIT = 30; // 認証済みユーザーの1日あたりの投稿制限
  const ANONYMOUS_POST_LIMIT = 10; // 匿名ユーザーの1日あたりの投稿制限 (UI表示用)


  // 認証状態とプロフィール情報の取得
  useEffect(() => {
    const getAuthAndProfile = async () => {
      setLoadingAuth(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

          try {
            const savedCode = localStorage.getItem(`profile_signin_code_uid_${currentUser.id}`);
            if ((!profileData || !profileData.username) && savedCode) {
              // キーで元プロフィールを探す（同一キーは1レコード想定）
              const { data: source } = await supabase
                .from('profiles')
                .select('*')
                .eq('signin_code_plain', savedCode)
                .maybeSingle();

              if (source && source.username) {
                const claimed = {
                  id: currentUser.id,
                  username: source.username,
                  avatar_url: source.avatar_url ?? null,
                  signin_code_plain: source.signin_code_plain,
                };
                await supabase.from('profiles').delete().eq('id', found.id);
                await supabase.from('profiles').upsert(claimed, { onConflict: 'id' });
                setProfile(claimed);
              } else {
                setProfile(profileData ?? null);
              }
            } else {
              setProfile(profileData ?? null);
            }
          } catch {
            setProfile(profileData ?? null);
          }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('プロフィール取得エラー:', profileError);
          setProfile(null);
        } else if (profileData) {
          setProfile(profileData);
        } else {
          setProfile(null);
          console.log('プロフィールが存在しません。ユーザーが手動で作成できます。');
        }
      } else {
        setProfile(null); // ユーザーが未認証ならプロフィールはnull
      }
      setLoadingAuth(false);
    };

    getAuthAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      getAuthAndProfile();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // コメントのリアルタイム購読と初期取得をこのuseEffectで一元管理
  useEffect(() => {
    const fetchAndSubscribeComments = async () => {
      if (!artistId) {
        setComments([]);
        setLoadingComments(false);
        return;
      }

      setLoadingComments(true);
      setCommentsError(null);

      // 初期コメントの取得
      const { data: commentsData, error: initialCommentsError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (initialCommentsError) {
        console.error('CommentSection: 初期コメント取得エラー:', initialCommentsError);
        setCommentsError('コメントの読み込みに失敗しました。');
        setComments([]);
      } else {
        setComments(commentsData || []);
        console.log('CommentSection: 初期コメント取得完了:', commentsData);
      }
      setLoadingComments(false);

      // リアルタイム購読
      console.log(`[Realtime Debug] Subscribing to comments for artistId: ${artistId}`);
      const channel = supabase
        .channel(`comments_for_artist_${artistId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comments', filter: `artist_id=eq.${artistId}` },
          (payload) => {
            console.log('[Realtime Debug] Received Realtime Payload:', payload);

            if (payload.eventType === 'INSERT') {
              const newCommentData = payload.new;
              if (newCommentData.user_id) { // user_idがある場合のみプロフィールを取得
                supabase
                  .from('profiles')
                  .select('username, avatar_url')
                  .eq('id', newCommentData.user_id)
                  .maybeSingle()
                  .then(({ data: profileData, error: profileError }) => {
                    if (!profileError && profileData) {
                      setComments((prevComments) => [
                        { ...newCommentData, profiles: profileData },
                        ...prevComments,
                      ]);
                      console.log('[Realtime Debug] INSERT: Profile fetched and comment added.');
                    } else {
                      setComments((prevComments) => [
                        { ...newCommentData, profiles: null },
                        ...prevComments,
                      ]);
                      console.log('[Realtime Debug] INSERT: No profile or error, comment added.');
                    }
                  });
              } else {
                console.log('[Realtime Debug] INSERT: Anonymous comment (not expected after policy change).');
              }
            } else if (payload.eventType === 'DELETE') {
              console.log('[Realtime Debug] DELETE Payload:', payload.old);

              setComments((prevComments) => {
                const filteredComments = prevComments.filter((comment) => comment.id !== payload.old.id);
                console.log(`[Realtime Debug] DELETE: Filtered comments count: ${filteredComments.length} (before: ${prevComments.length})`);
                return filteredComments;
              });
              console.log('[Realtime Debug] DELETE: Comment removed from UI (attempted).');
            }
          }
        )
        .subscribe();

      return () => {
        console.log(`[Realtime Debug] Unsubscribing from comments for artistId: ${artistId}`);
        supabase.removeChannel(channel);
      };
    };

    fetchAndSubscribeComments();
  }, [artistId]); // artistId が変わるたびにコメントを再取得・再購読

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setPosting(true);
    setPostLimitExceeded(false);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { alert('サインインしてください'); setPosting(false); return; }
    await supabase.from('profiles').upsert({ id: authUser.id }, { onConflict: 'id' });

    let userIdToPost = user.id;
    let currentDailyCount = profile?.daily_post_count || 0;
    let lastPostDateTime = profile?.last_post_date;
    let maxAllowedPosts = IDENTIFIED_POST_LIMIT;
    let canPost = true;

    const { canPost: _canPost, newCount } = checkPostLimit(
      currentDailyCount,
      maxAllowedPosts,
      lastPostDateTime
    );
    canPost = _canPost;

    if (canPost) {
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          daily_post_count: newCount,
          last_post_date: new Date().toISOString(),
        })
        .eq('id', userIdToPost);
      if (updateProfileError) {
        console.error('プロフィール投稿数更新エラー:', updateProfileError);
        alert('投稿に失敗しました。投稿数の更新に問題があります。');
        setPosting(false);
        return;
      }
    } else {
      setPostLimitExceeded(true);
      alert(`1日あたりの投稿制限を超過しました。（${maxAllowedPosts}件まで）`);
      setPosting(false);
      return;
    }

    const { data, error } = await supabase.from('comments').insert([
      {
        artist_id: artistId,
        user_id: userIdToPost,
        anonymous_id: null, // 匿名投稿は不可なので常にnull
        user_id: user.id,
        content: newComment.trim(),
      },
    ]);

    if (error) {
      console.error('コメント投稿エラー:', error);
      alert('コメントの投稿に失敗しました。');
      console.error(JSON.stringify(error, null, 2));
      console.groupEnd();
    } else {
      setNewComment('');
    }
    setPosting(false);
  };

  const getCommenterName = (comment) => {
    if (comment.profiles?.username) {
      return comment.profiles.username;
    }
    return '名無しさん';
  };

  const getAvatarUrl = (comment) => {
    if (comment.profiles?.avatar_url) {
      return comment.profiles.avatar_url;
    }
    return 'https://placehold.co/40x40/cccccc/333333?text=User';
  };

  const handleAnonymousSignIn = async () => {
    setLoadingAuth(true);
    const { data: { user }, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('匿名サインインエラー:', error);
      alert('サインインに失敗しました。');
    } else {
      alert('匿名アカウントでサインインしました。プロフィール画面で「新規作成」または「ログイン」してください。');
    }
    setLoadingAuth(false);
  };


  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  const handleReportComment = async (comment) => {
    if (confirm('このコメントを通報しますか？')) {
      alert(`コメントID: ${comment.id} を通報しました。（ダミー機能）\nこの情報はデータベースには記録されません。`);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('本当にこのコメントを削除しますか？\nこの操作は元に戻せません。')) {
      return;
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
        console.error('コメント削除エラー:', error);
        alert('コメントの削除に失敗しました。');
    } else {
        alert('コメントを削除しました。');
    }
  };

  // コメントフォームのdisabled状態を決定
  // ユーザーが認証済み (userが存在) かつ、プロフィールが存在 (profileが存在) する場合にのみ有効
  const isCommentFormDisabled = posting || loadingAuth || postLimitExceeded || !user || !profile || !profile?.username;

  console.log('--- CommentSection Render ---');
  console.log('CommentSection: comments state value:', comments);
  console.log('CommentSection: user state value:', user); 
  console.log('CommentSection: profile state value:', profile); // profile の状態をログに出力
  console.log('CommentSection: isCommentFormDisabled:', isCommentFormDisabled); 


  return (
    <section className="mt-10 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">コメント</h2>

      {/* プロフィール設定エリア */}
      {!loadingAuth && ( // 認証状態のロードが完了したら表示
        <div className="mb-8">
          {user ? ( // ユーザーが認証済みならプロフィールエディターを表示
            <ProfileEditor user={user} initialProfile={profile} onProfileUpdated={handleProfileUpdated} />
          ) : ( // ユーザーが未認証ならサインインを促すボタンを表示
            <div className="p-4 bg-gray-100 rounded-lg text-center">
              <p className="text-gray-700 mb-3">
                コメントを投稿するにはプロフィール設定が必要です。
              </p>
              <button
                onClick={handleAnonymousSignIn}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
                disabled={loadingAuth} // ロード中は無効
              >
                プロフィールを設定する（匿名サインイン）
              </button>
            </div>
          )}
        </div>
      )}


      {/* コメント投稿フォーム */}
      <form onSubmit={handleSubmitComment} className="mb-8">
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-y min-h-[80px] text-gray-900"
          placeholder={user && profile && profile.username ? "コメントを投稿..." : "ユーザー名を設定してください"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isCommentFormDisabled} // disabled状態を適用
        ></textarea>
        {postLimitExceeded && (
          <p className="text-red-500 text-sm mt-1">
            1日あたりの投稿制限を超過しました。（{IDENTIFIED_POST_LIMIT}件まで）
          </p>
        )}
        <button
          type="submit"
          className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
          disabled={isCommentFormDisabled || !newComment.trim()} // disabled状態を適用
        >
          {posting ? '投稿中...' : '投稿する'}
        </button>
        {loadingAuth && <p className="text-gray-500 text-sm mt-2">認証状態を確認中...</p>}
        {/* ユーザーが未認証またはプロフィール未設定の場合のメッセージ */}
        {(!user || !profile || !profile?.username) && !loadingAuth && (
          <p className="text-gray-600 text-sm mt-2">
            コメントを投稿するには、上記の「プロフィールを設定する」から
            <b>ユーザー名を保存</b>してください。（名無しでは投稿できません）
          </p>
        )}
      </form>

      {/* コメントリスト */}
      <div className="space-y-4">
        {loadingComments ? ( // コメントロード中の表示
          <div className="text-center text-gray-600 p-4">コメントを読み込み中...</div>
        ) : commentsError ? ( // コメント取得エラーの表示
          <div className="text-center text-red-500 p-4">{commentsError}</div>
        ) : Array.isArray(comments) && comments.length > 0 ? ( // comments が配列であり、かつ要素があるかチェック
          comments.map((comment) => (
            <div key={comment.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
              <div className="flex items-center mb-2">
                <ImageWithFallback
                  src={getAvatarUrl(comment)}
                  alt="アバター"
                  className="w-8 h-8 rounded-full mr-3 object-cover"
                  fallbackSrc="https://placehold.co/40x40/cccccc/333333?text=User"
                />
                <span className="font-semibold text-gray-700">{getCommenterName(comment)}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
                {/* 通報ボタン */}
                <button
                  onClick={() => handleReportComment(comment)}
                  className="ml-2 text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded-full border border-red-500 hover:border-red-700 transition-colors duration-200"
                >
                  通報
                </button>
                {/* 削除ボタン (認証済みユーザーのみ表示) */}
                {user && comment.user_id === user.id ? (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="ml-2 text-gray-500 hover:text-gray-700 text-xs px-2 py-1 rounded-full border border-gray-500 hover:border-gray-700 transition-colors duration-200"
                  >
                    削除
                  </button>
                ) : null}
              </div>
              <p className="text-gray-800">{comment.content}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center">まだコメントはありません。</p>
        )}
      </div>
    </section>
  );
}
