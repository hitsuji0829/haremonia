'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

/** カテゴリ + QA（記号は除去。本文は一語一句同じ・改行保持） */
const CATEGORIES = [
  {
    title: 'このアプリ・研究について',
    qa: [
      {
        q: 'HAREmoniaとは？',
        a: `インディーズアーティストが気軽に楽曲を投稿できるように開発された“日本語対応“の音楽特化型投稿サービス。
利用料・登録料完全無料で、ボーダレスな音楽交流を目指します。`,
      },
      {
        q: 'HAREmoniaの由来は？',
        a: `古代ギリシャ語で調和、ハーモニーを意味する「Harmonia」と、日本の伝統的な概念であり、非日常を意味する「ハレ」を組み合わせた造語。
音楽体験を通じて非日常へ連れていってくれる、そんなサービスにしたいと願い、命名しました。`,
      },
      {
        q: '個人情報の取り扱いについて',
        a: `アーティスト登録や、コメントのプロフィール登録などに入力していただいた情報は、本研究のみに使用いたします。
また、なるべく個人情報の登録はお控えください。`,
      },
    ],
  },
  {
    title: '楽曲登録について',
    qa: [
      {
        q: 'プロフィールを編集したいです。',
        a: `アーティストページのヘッダーから「プロフィールを編集」を押し、編集キーを入力して編集ができます。`,
      },
      {
        q: 'SNSアカウントやHPのリンクを掲載・変更したいです。',
        a: `プロフィール編集から可能です。`,
      },
      {
        q: '編集キーとは？',
        a: `2曲目以降を配信する場合と、プロフィールを編集するために必要なキーです。本人確認のために割り当てています。
セキュリティ上初回アーティスト登録時のみ発行され、以降は表示されません。アーティスト様ご自身での管理をお願いいたします。`,
      },
      {
        q: '編集キーを忘れてしまいました。',
        a: `登録したデバイスに原則保存されていますが、万が一お忘れの場合は以下管理者までお問い合わせください。
rikuto.hitsujikai@gmail.com`,
      },
      {
        q: '1作品に複数楽曲登録できますか？',
        a: `現段階ではシングル楽曲（1作品1曲）のみ登録できます。`,
      },
      {
        q: 'アーティストや楽曲を削除したい。',
        a: `管理者までお問い合わせください。管理者が削除いたします。
rikuto.hitsujikai@gmail.com`,
      },
      {
        q: '画像がアップロードできません。',
        a: `1600x1600以上の正方形のアーティスト画像・ジャケット写真をご用意ください。`,
      },
      {
        q: '音源のファイル形式は？',
        a: `mp3 / wavの音声ファイルを推奨いたします。`,
      },
    ],
  },
  {
    title: '楽曲再生について',
    qa: [
      {
        q: 'HARE Push!!とは？',
        a: `HAREmoniaに登録されている全楽曲の中から3曲ランダムで表示される機能です。ページをリロードするたび楽曲は切り替わります。`,
      },
      {
        q: 'トップページの「シャッフル再生」とは？',
        a: `HAREmoniaに登録されている全楽曲を対象に、シャッフル再生が行われます。またジャンルを絞ることで、ジャンルごとのシャッフル再生をお楽しみいただけます。`,
      },
      {
        q: 'リピート再生はできますか？',
        a: `楽曲を指定して再生した場合のみリピート再生されます。シャッフル再生時は適用されません。`,
      },
      {
        q: 'バックグラウンド再生はできますか？',
        a: `可能です。スマートフォンやPCのウェブプレイヤーにも対応しており、そちらでの再生・停止や楽曲の移動も可能です。`,
      },
    ],
  },
  {
    title: '検索について',
    qa: [
      {
        q: '検索方法は？',
        a: `検索窓に文字列を入力すると、登録アーティスト・作品・楽曲名を検索できます。曖昧検索には対応しておらず、完全一致検索のみとなっています。また、ジャンルで検索も可能で、検索窓と組み合わせての検索もできます。`,
      },
    ],
  },
  {
    title: 'ライブラリについて',
    qa: [
      {
        q: 'お気に入り登録とは？',
        a: `アーティスト・作品・楽曲を対象にお気に入りを登録することができます。ライブラリに保存され、そこから再生も可能です。
お気に入り登録には、アカウント / コミュニティタブよりプロフィールを設定する必要があります。`,
      },
      {
        q: 'お気に入り登録ができません。',
        a: `お気に入りの登録・閲覧にはアカウント / コミュニティタブよりプロフィールを設定が必要です。`,
      },
      {
        q: '1作品1曲なら、作品のお気に入りって意味なくないですか？',
        a: `おっしゃる通りです。将来的に複数楽曲登録を見据えた運用となっております。`,
      },
    ],
  },
  {
    title: 'アカウント / コミュニティについて',
    qa: [
      {
        q: 'このサービスにおけるアカウントとは？',
        a: `コミュニティ機能や、お気に入り機能を使用するためのアカウントです。`,
      },
      {
        q: 'このサービスにおけるコミュニティとは？',
        a: `アーティスト別に残せるコメントを指します。掲示板形式です。誹謗中傷はおやめください。`,
      },
      {
        q: '書いたコメントは削除できますか？',
        a: `該当コメントの削除ボタンから削除してください。自らのコメントのみ削除対象で、アカウントを削除すると削除できなくなりますのでご注意ください。`,
      },
      {
        q: 'アカウントを削除したい。',
        a: `「アカウント削除」ボタンを押して削除してください。コメントは残りますが、お気に入りのデータは削除されます。`,
      },
      {
        q: 'グループのような機能はありませんか？',
        a: `ありません。管理者が管理できる範囲で現在は運用しております。`,
      },
    ],
  },
  {
    title: 'エモートについて',
    qa: [
      {
        q: 'エモートとは？',
        a: `楽曲に感情を動かされた瞬間をスタンプでシェアする機能です。
一度押すと、再生するたび該当楽曲のそのタイミングでスタンプが表示され、リアルでみんなと繋がる音楽体験ができます。設定で再生中の表示の有無、表示濃度を切り替えられます。`,
      },
      {
        q: 'エモートはどこから送れますか？',
        a: `再生バーの右端の💬ボタンから6つの絵文字が選択できます。送りたい絵文字を押すと再生バー付近に表示されます。
荒らし対策のため、投稿間に3秒のクールダウンタイムがあります。`,
      },
      {
        q: 'エモートを誤タップしました。削除できますか？',
        a: `エモートの投稿は匿名ですので、そんなに気にすることはないと思います。あきらめましょう。もしどうしてもという場合は管理者まで。`,
      },
      {
        q: '絵文字を追加することはできますか？',
        a: `できません。治安維持のため最小限にさせていただいております。`,
      },
      {
        q: 'プロフィール登録なしでエモートの投稿はできますか？',
        a: `はい、誰でもエモート投稿できます。`,
      },
    ],
  },
];

function QAItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <div className="bg-gray-800 px-4 py-3">
        <h3 className="font-semibold text-gray-100">{q}</h3>
      </div>
      <div className="bg-gray-900 px-4 py-3 text-gray-200 whitespace-pre-wrap leading-relaxed">
        {a}
      </div>
    </div>
  );
}

function CategoryBlock({ title, qa }: { title: string; qa: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-bold text-gray-100">{title}</span>
        <span className={`ml-4 inline-block transition-transform ${open ? 'rotate-45' : ''}`}>＋</span>
      </button>
      <div className={`transition-[max-height] duration-300 ease-in-out ${open ? 'max-h-[4000px]' : 'max-h-0'} overflow-hidden`}>
        <div className="p-4 space-y-3 bg-gray-900">
          {qa.map((item, i) => <QAItem key={i} q={item.q} a={item.a} />)}
        </div>
      </div>
    </section>
  );
}

export default function SettingsFaqPage() {
  const [kw, setKw] = useState('');
  const filtered = useMemo(() => {
    const q = kw.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map(cat => ({
      ...cat,
      qa: cat.qa.filter(item =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.qa.length);
  }, [kw]);

  return (
    <main className="p-4 max-w-3xl mx-auto mb-40 text-gray-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">FAQ</h1>
      </div>

      <div className="mb-6">
        <input
          value={kw}
          onChange={e => setKw(e.target.value)}
          placeholder="キーワード検索（例：画像、削除、編集キー）"
          className="w-full rounded-md border border-gray-700 bg-gray-900 p-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-4">
        {filtered.length ? (
          filtered.map(cat => <CategoryBlock key={cat.title} title={cat.title} qa={cat.qa} />)
        ) : (
          <p className="text-gray-400">該当するFAQが見つかりませんでした。</p>
        )}
      </div>
    </main>
  );
}
