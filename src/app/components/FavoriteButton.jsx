// src/app/components/FavoriteButton.jsx
'use client'; // クライアントコンポーネントであることを明示

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // 絶対パスに統一
import { useAudioPlayer } from '@/context/AudioPlayerContext'; // 絶対パスに統一

// propsとして artistId, workId, trackId のいずれかを受け取る
export default function FavoriteButton({ artistId, workId, trackId, initialFavorited = false, onFavoriteRemoved }) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false); // 初期ロードはfalseに（Contextで管理するため）
  const [showTooltip, setShowTooltip] = useState(false); // ツールチップの表示状態

  // Contextから user, profile, loadingAuthAndProfile を取得
  const { user, profile, loadingAuthAndProfile } = useAudioPlayer();

  // どのタイプのアイテムか、どのIDか特定
  const itemType = artistId ? 'artist' : (workId ? 'work' : (trackId ? 'track' : null));
  const itemId = artistId || workId || trackId; // 実際のID

  // initialFavorited プロパティが変更されたら isFavorited を更新
  useEffect(() => {
    setIsFavorited(initialFavorited);
  }, [initialFavorited]);

  // ユーザーIDとアイテムIDに基づいてお気に入り状態をチェック
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      // user が null または profile が null の場合はチェックをスキップ
      if (!user || !profile || !itemId || !itemType) {
        setIsFavorited(false); // お気に入りではないとみなす
        setLoading(false); // ロード状態を解除
        return;
      }

      setLoading(true); // チェック開始時にロード状態に
      // ★ 修正: user.id ではなく user_id カラムを参照
      let query = supabase.from('favorites').select('id').eq('user_id', user.id);

      if (itemType === 'artist') {
        query = query.eq('artist_id', itemId);
      } else if (itemType === 'work') {
        query = query.eq('work_id', itemId);
      } else if (itemType === 'track') {
        query = query.eq('track_id', itemId);
      } else {
        setIsFavorited(false); // 不明なタイプ
        setLoading(false); // ロード状態を解除
        return;
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116はデータなしのエラー
        console.error('FavoriteButton: お気に入り状態のチェックエラー:', error);
        setIsFavorited(false);
      } else {
        setIsFavorited(!!data); // データがあればお気に入り済み
      }
      setLoading(false); // チェック完了後、ロード状態を解除
    };

    // user と profile の両方が存在し、かつ認証/プロフィールロードが完了したらチェックを実行
    if (user && profile && !loadingAuthAndProfile) {
      checkFavoriteStatus();
    } else if (user === null || profile === null) {
      // userがnullになった、またはprofileがnullになった場合は、お気に入り状態をリセット
      setIsFavorited(false);
      setLoading(false);
    }
  }, [user, profile, itemId, itemType, loadingAuthAndProfile]);


  const toggleFavorite = async () => {
    // クリック時にロード状態に
    setLoading(true);

    if (isFavorited) {
      // お気に入り解除
      let query = supabase.from('favorites').delete().eq('user_id', user.id);
      if (itemType === 'artist') {
        query = query.eq('artist_id', itemId);
      } else if (itemType === 'work') {
        query = query.eq('work_id', itemId);
      } else if (itemType === 'track') {
        query = query.eq('track_id', itemId);
      }

      const { error } = await query;

      if (error) {
        console.error('FavoriteButton: お気に入り解除エラー:', error);
        alert('お気に入り解除に失敗しました。');
      } else {
        setIsFavorited(false);
        if (onFavoriteRemoved) { // ライブラリページからのコールバック
          onFavoriteRemoved(itemId, itemType);
        }
      }
    } else {
      // お気に入り追加
      const insertData = { user_id: user.id }; // user_idを挿入
      if (itemType === 'artist') {
        insertData.artist_id = itemId;
      } else if (itemType === 'work') {
        insertData.work_id = itemId;
      } else if (itemType === 'track') {
        insertData.track_id = itemId;
      }

      const { error } = await supabase
        .from('favorites')
        .insert(insertData);

      if (error) {
        console.error('FavoriteButton: お気に入り追加エラー:', error);
        alert('お気に入り登録に失敗しました。');
      } else {
        setIsFavorited(true);
      }
    }
    setLoading(false); // 処理完了後、ロード状態を解除
  };

  // ボタンの disabled 状態を厳密に制御（UIの無効化ではなく、ロジックで制御）
  // ロード中、またはユーザーがまだ認証されていない（null）またはプロフィールが存在しない場合は、
  // ツールチップを表示し、実際のfav操作は行わない
  const isDisabledForAction = loadingAuthAndProfile || !user || !profile;

  // ホバー時の処理
  const handleMouseEnter = () => {
    if (isDisabledForAction) {
      setShowTooltip(true);
    }
  };

  // ホバー解除時の処理
  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // クリック時の処理
  const handleClick = (e) => {
    if (isDisabledForAction) {
      e.preventDefault(); // デフォルトのボタン動作を停止
      setShowTooltip(true); // クリック時もツールチップを表示
    } else {
      toggleFavorite(); // プロフィール設定済みなら通常のお気に入り操作
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`p-1 rounded-full transition-colors duration-200
          ${isFavorited ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-500'}
          ${loading ? 'opacity-50 cursor-wait' : ''}`}
        disabled={loading}
        aria-label={isFavorited ? "お気に入り解除" : "お気に入り追加"}
      >
        {isFavorited ? '❤️' : '🤍'}
      </button>

      {/* ツールチップ（左に表示 & 改行付き） */}
      {showTooltip && isDisabledForAction && (
        <div
          className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-3 py-1 bg-gray-700 text-white text-xs rounded-md shadow-lg z-50 text-center w-max"
        >
          お気に入り登録には<br />プロフィール設定を完了してください。
        </div>
      )}
    </div>
  );
}
