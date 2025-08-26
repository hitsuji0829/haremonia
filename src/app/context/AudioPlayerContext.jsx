'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AudioPlayerContext = createContext();
export const useAudioPlayer = () => useContext(AudioPlayerContext);

export function AudioPlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [playbackOrigin, setPlaybackOrigin] = useState(null);

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingAuthAndProfile, setLoadingAuthAndProfile] = useState(true);
  const [emoteRestartNonce, setEmoteRestartNonce] = useState(0);
  const [emoteSuppressUntilMs,setEmoteSuppressUntilMs] = useState(0);
  const [emotesEnabled, setEmotesEnabled] = useState(true);

  // ===== ここから：即時表示用エモート（任意機能） =====
  const [emotes, setEmotes] = useState([]);                  // // 追加した箇所
  const addLocalEmote = (emoji, timestamp, pos) => {              // // 追加した箇所
    const id = Date.now() + Math.random();
    const x = typeof pos?.xPct === 'number' ? pos.xPct : Math.random() * 80 + 10;
    const y = typeof pos?.yPct === 'number' ? pos.yPct : Math.random() * 30 + 10;

    const newEmote = { id, emoji, x, y, timestamp, fadeOut: false };
    setEmotes(prev => [...prev, newEmote]);
    
    setTimeout(() => {
      setEmotes(prev => prev.map(e => e.id === id ? { ...e, fadeOut: true } : e));
    }, 3000);
    setTimeout(() => {
      setEmotes(prev => prev.filter(e => e.id !== id));
    }, 4000);
  };
  const showSyncedEmote = (emoji, timestamp) => {            // // 追加した箇所
    if (Math.abs(currentTime - timestamp) < 0.3) {
      addLocalEmote(emoji, timestamp);
    }
  };
  // ===== ここまで：即時表示用エモート =====

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => { setIsPlaying(true); setIsLoadingAudio(false); };
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleLoadStart = () => setIsLoadingAudio(true);
    const handleCanPlayThrough = () => setIsLoadingAudio(false);
    const handleWaiting = () => setIsLoadingAudio(true);

    const handleEnded = () => {
      if (playlist.length === 0 || currentTrackIndex === -1) return;
      const nextIndex = currentTrackIndex + 1;
      if (nextIndex < playlist.length) {
        playTrack(playlist[nextIndex], playlist, nextIndex);
      } else {
        playTrack(playlist[0], playlist, 0);
      }
    };

    const handleError = (e) => {
      console.error('[Audio Error]', e);
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrackIndex, playlist]);

  useEffect(() => {
    const fetchAuthAndProfile = async () => {
      setLoadingAuthAndProfile(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.error('プロフィール取得エラー:', error);
          setProfile(null);
        } else {
          setProfile(profileData || null);
        }
      } else {
        setProfile(null);
      }
      setLoadingAuthAndProfile(false);
    };

    fetchAuthAndProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchAuthAndProfile();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const updateProfileInContext = useCallback((updatedProfile) => {
    setProfile(updatedProfile);
  }, []);

  // ------ 再生系 ------
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else if (currentTrack?.audio_url) {
      setIsLoadingAudio(true);
      audio.play().catch(err => { console.error('再生エラー:', err); setIsLoadingAudio(false); });
    }
  };

  const playTrack = (track, newPlaylist = [], index = -1, opts = {}) => {
    if (opts.playbackOrigin) {
      setPlaybackOrigin(opts.playbackOrigin);
    }

    if (!track?.audio_url) return;
    const audio = audioRef.current;
    audio.src = track.audio_url;
    audio.load();
    setIsLoadingAudio(true);
    audio.play().catch(err => { console.error('再生開始エラー:', err); setIsLoadingAudio(false); });
    setCurrentTrack(track);
    setIsPlaying(true);
    if (newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
      setCurrentTrackIndex(index);
    } else if (index !== -1) {
      setCurrentTrackIndex(index);
    }
  };

  const markOriginArtist = () => setPlaybackOrigin('artist');
  const markOriginShuffle = () => setPlaybackOrigin('shuffle');

  const playNextTrack = () => {
    if (playlist.length === 0 || currentTrackIndex === -1) return;
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < playlist.length) playTrack(playlist[nextIndex], playlist, nextIndex);
    else playTrack(playlist[0], playlist, 0);
  };

  const playPrevTrack = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if ((audio.currentTime ?? 0) > 1){
      audio.currentTime = 0;
      const SUPPRESS_MS = 5000;
      setEmoteSuppressUntilMs(Date.now() + SUPPRESS_MS);
      setEmoteRestartNonce(n => n + 1);
      setCurrentTime(0);
      if(!isPlaying && currentTrack?.audio_url){
        audio.play().catch(err => console.error('先頭再生エラー:', err));
      }
      return;
    }

    if (playlist.length === 0 || currentTrackIndex === -1){
      audio.currentTime =0;
      const SUPPRESS_MS = 5000;
      setEmoteSuppressUntilMs(Date.now() + SUPPRESS_MS);
      setEmoteRestartNonce(n => N + 1);
      setCurrentTime(0);
      if (!isPlaying && currentTrack?.audio_url){
        audio.play().catch(err => console.error('先頭再生エラー:', err));
      }
      return;
    }

    const prevIndex = currentTrackIndex - 1;
    
    
    if (prevIndex >= 0) {
      playTrack(playlist[prevIndex], playlist, prevIndex);
    } else {
      const firstTrack = playlist[0];
      if (firstTrack?.audio_url){
        playTrack(firstTrack, playlist, 0);
      } else {
        audio.currentTime = 0;
        setCurrentTime(0);
        if (!isPlaying && currentTrack?.audio_url){
          audio.play().catch(err => console.error('先頭再生エラー:', err));
        }
      }
    }
  };
  

  const seekTo = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  useEffect(() => {
    let on = true;
    if (profile && typeof profile.emotes_enabled === 'boolean') {
      on = profile.emotes_enabled;
    } else if (typeof window !== 'undefined') {
      const ls = localStorage.getItem('emotes_enabled');
      if (ls !== null) on = ls === 'true';
    }
    setEmotesEnabled(on);
  }, [profile]);

  const toggleEmotes = async () => {
    setEmotesEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('emotes_enabled', String(next));
      }
      if (user) {
        supabase
          .from('profiles')
          .update({ emote_enabled: next })
          .eq('id', user.id)
          .then(() => {})
          .catch(console.error);
      }
      return next;
    });
  };

  const contextValue = {
    audioRef,                   // // 追加した箇所（refを共有）
    currentTrack,
    isPlaying,
    isLoadingAudio,
    currentTime,
    duration,
    playlist,
    currentTrackIndex,
    togglePlayPause,
    playTrack,
    playNextTrack,
    playPrevTrack,
    seekTo,
    user,
    profile,
    loadingAuthAndProfile,
    updateProfileInContext,
    playbackOrigin,
    markOriginArtist,
    markOriginShuffle,
    emotes,                     // // 追加した箇所
    addLocalEmote,              // // 追加した箇所
    showSyncedEmote,            // // 追加した箇所
    emoteRestartNonce,
    emoteSuppressUntilMs,
    emotesEnabled,
    toggleEmotes,
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {/* ← これが無いと音が出ません */}
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} /> {/* // 追加した箇所 */}
      {children}
    </AudioPlayerContext.Provider>
  );
}
