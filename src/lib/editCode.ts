// 10桁の編集コードを生成（紛らわしい文字は除外）
export function generateEditCode(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let s = '';
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}

// SHA-256 の16進ハッシュ文字列にする
export async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
