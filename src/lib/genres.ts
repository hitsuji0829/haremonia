export const GENRES = [
  { label: 'J-POP', value: 'jpop' },
  { label: 'アイドル', value: 'idol_pop' },
  { label: 'ボカロ', value: 'vocaloid' },
  { label: 'アニソン / 声優', value: 'anisong' },
  { label: 'シティポップ', value: 'city_pop' },
  { label: 'ロック / J-ROCK', value: 'jrock' },
  { label: 'パンク / メロコア', value: 'punk' },
  { label: 'メタル / V系', value: 'metal_vkei' },
  { label: 'バンドサウンド', value: 'band_emo' },
  { label: 'フュージョン', value: 'fusion' },
  { label: 'ジャズ', value: 'jazz' },
  { label: 'R&B / ネオソウル', value: 'rnb_neosoul' },
  { label: 'ヒップホップ', value: 'jhiphop' },
  { label: 'トラップ / Lo-Fi', value: 'trap_lofi' },
  { label: 'EDM / ダンス', value: 'edm' },
  { label: 'ハウス / テクノ', value: 'house_techno' },
  { label: 'アンビエント', value: 'ambient' },
  { label: 'DNB / ジューク', value: 'dnb_juke' },
  { label: 'ゲーム / チップチューン', value: 'game_chip' },
  { label: '同人 / インディー', value: 'doujin_indie' },
  { label: '歌ってみた / カバー', value: 'cover' },
  { label: '器楽 / ピアノ', value: 'instrumental_piano' },
  { label: 'フォーク / 演歌', value: 'folk_enka' },
  { label: 'ワールド / 伝統音楽', value: 'world_traditional' },
  { label: 'サントラ / 劇伴 / BGM', value: 'soundtrack' },
  { label: 'その他', value: 'other' },
] as const;

export type GenreValue = typeof GENRES[number]['value'];

// value → label 変換用
export const genreLabelFromValue = (v?: string | null) =>
  GENRES.find(g => g.value === v)?.label ?? 'その他';
