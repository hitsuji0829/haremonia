'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SettingsContext = createContext(null);

// localStorage のキー（プロジェクト固有名にしておく）
const LS = {
  showEmotes: 'hare.showEmotes',
  emoteOpacity: 'hare.emoteOpacity',
  hideArtistWorkInPlayer: 'hare.hideArtistWorkInPlayer',
  // 旧キー（過去互換用）
  legacyShuffleArtistVisible: 'hare.shuffleArtistVisible',
};

export function SettingsProvider({ children }) {
  // ---- states ----
  const [showEmotes, setShowEmotes] = useState(true);
  const [emoteOpacity, setEmoteOpacity] = useState(0.6);         // 0〜1
  // 新フラグ：true = 「アーティスト名・作品名を非表示」
  const [hideArtistWorkInPlayer, setHideArtistWorkInPlayer] = useState(false);

  // ---- load from localStorage (初回だけ) ----
  useEffect(() => {
    try {
      const se = localStorage.getItem(LS.showEmotes);
      if (se !== null) setShowEmotes(se === 'true');

      const eo = localStorage.getItem(LS.emoteOpacity);
      if (eo !== null) {
        const v = Number(eo);
        if (!Number.isNaN(v)) setEmoteOpacity(Math.min(1, Math.max(0, v)));
      }

      const hv = localStorage.getItem(LS.hideArtistWorkInPlayer);
      if (hv !== null) {
        setHideArtistWorkInPlayer(hv === 'true');
      } else {
        // ★ 旧キーから移行：
        // 旧キーは「表示するか」を表していたので、非表示フラグへは反転して保存
        const legacy = localStorage.getItem(LS.legacyShuffleArtistVisible);
        if (legacy !== null) {
          const visible = legacy === 'true';
          const hidden = !visible;
          setHideArtistWorkInPlayer(hidden);
          localStorage.setItem(LS.hideArtistWorkInPlayer, String(hidden));
        }
      }
    } catch {}
  }, []);

  // ---- persist ----
  useEffect(() => {
    try { localStorage.setItem(LS.showEmotes, String(showEmotes)); } catch {}
  }, [showEmotes]);

  useEffect(() => {
    try { localStorage.setItem(LS.emoteOpacity, String(emoteOpacity)); } catch {}
  }, [emoteOpacity]);

  useEffect(() => {
    try { localStorage.setItem(LS.hideArtistWorkInPlayer, String(hideArtistWorkInPlayer)); } catch {}
  }, [hideArtistWorkInPlayer]);

  const value = useMemo(() => ({
    showEmotes,
    setShowEmotes,
    emoteOpacity,
    setEmoteOpacity,
    hideArtistWorkInPlayer,
    setHideArtistWorkInPlayer,
  }), [showEmotes, emoteOpacity, hideArtistWorkInPlayer]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
  return ctx;
}
