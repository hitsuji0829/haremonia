// 秒（number or "208" のような文字列）→ "m:ss" に整形
export function formatDuration(raw?: number | string | null): string {
  if (raw == null || raw === '') return '0:00';

  // "3:28" のように既に mm:ss っぽい場合はそのまま返す
  if (typeof raw === 'string' && raw.includes(':')) return raw;

  const sec = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(sec)) return '0:00';

  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
