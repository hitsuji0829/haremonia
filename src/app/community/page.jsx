// src/app/community/page.jsx
// このファイルはサーバーコンポーネントとして動作するため、'use client' は不要です。

import { supabase } from '../../lib/supabaseClient'; // Supabaseクライアントをインポート
import ArtistCommentDisplay from './_components/ArtistCommentDisplay'; // アーティストコメント表示コンポーネントをインポート

export default async function CommunityPage() {
  console.log('--- CommunityPage Server Component Render ---'); // サーバー側ログ

  // すべてのアーティスト情報を取得
  const { data: artistsData, error: artistsError } = await supabase
    .from('artists')
    .select('id, name, image_url') // 必要なカラムのみ選択
    .order('name', { ascending: true }); // 名前順でソート

  if (artistsError) {
    console.error('コミュニティページ: アーティスト一覧取得エラー:', artistsError);
    return (
      <main className="p-4 max-w-4xl mx-auto min-h-screen mb-40">
        <h1 className="text-3xl font-bold mb-6 text-black dark:text-white">コミュニティ</h1>
        <p className="text-red-500">アーティスト一覧の読み込みに失敗しました。</p>
      </main>
    );
  }

  const artists = artistsData || [];
  console.log('コミュニティページ: 取得したアーティストデータ:', artists); // 取得したデータをログに出力

  return (
    <main className="p-4 max-w-4xl mx-auto min-h-screen mb-40"> {/* 下部に余白を追加 */}
      <h1 className="text-3xl font-bold mb-6 text-black dark:text-white">コミュニティ</h1>
      {artists.length > 0 ? (
        <ArtistCommentDisplay initialArtists={artists} />
      ) : (
        <p className="text-gray-500 text-center">まだアーティストが登録されていません。</p>
      )}
    </main>
  );
}
