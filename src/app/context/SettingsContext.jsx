'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  // 表示ON/OFF（永続化）
  const [showEmotes, setShowEmotes] = useState(true);
  // 透明度 0.0〜1.0（永続化）
  const [emoteOpacity, setEmoteOpacity] = useState(1);
  const [shuffleArtistVisible, setShuffleArtistVisible] = useState(true);

  // 初期読み込み
  useEffect(() => {
    try {
      const s = localStorage.getItem('settings.showEmotes');
      if (s !== null) setShowEmotes(s === 'true');
      const o = localStorage.getItem('settings.emoteOpacity');
      if (o !== null) setEmoteOpacity(Number(o));
    } catch {}
  }, []);

  // 保存
  useEffect(() => {
    try { localStorage.setItem('settings.showEmotes', String(showEmotes)); } catch {}
  }, [showEmotes]);

  useEffect(() => {
    try { localStorage.setItem('settings.emoteOpacity', String(emoteOpacity)); } catch {}
  }, [emoteOpacity]);

  

  const value = useMemo(() => ({
    showEmotes,
    setShowEmotes,
    emoteOpacity,
    setEmoteOpacity,
    shuffleArtistVisible,
    setShuffleArtistVisible,
  }), [showEmotes, emoteOpacity, shuffleArtistVisible]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}