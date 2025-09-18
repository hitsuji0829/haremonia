'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SignInWithCode({ onSignedIn }) {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const LS_KEY = (u) => `profile_signin_code_${u}`;

  async function handleSignIn(e) {
    e.preventDefault();
    setMsg('');
    if (!username || code.length !== 10) {
      setMsg('ユーザー名と10桁キーを入力してください。');
      return;
    }
    // “空更新”で検証だけ
    const { data: ok, error } = await supabase.rpc('update_profile_with_code', {
      p_username: username,
      p_code: code,
      p_updates: {} // 検証のみ
    });
    if (error) {
      setMsg('サインインに失敗しました。時間をおいて再試行してください。');
      return;
    }
    if (!ok) {
      setMsg('ユーザー名またはキーが違います。');
      return;
    }
    try { localStorage.setItem(LS_KEY(username), code); } catch {}
    setMsg('サインインしました。');
    onSignedIn?.({ username }); // 呼び出し側で再読み込みなど
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
      <div className="flex-1">
        <label className="block text-sm text-gray-200">ユーザー名</label>
        <input className="w-full rounded-md p-2 bg-white text-gray-900"
               value={username} onChange={(e)=>setUsername(e.target.value)} />
      </div>
      <div className="flex-1">
        <label className="block text-sm text-gray-200">10桁キー</label>
        <input className="w-full rounded-md p-2 bg-white text-gray-900 tracking-widest"
               value={code} onChange={(e)=>setCode(e.target.value.toLowerCase())}
               maxLength={10} />
      </div>
      <button type="submit" className="h-10 sm:h-[42px] px-4 rounded-md bg-indigo-600 text-white font-semibold">
        サインイン
      </button>
      {msg && <p className="text-sm text-gray-100">{msg}</p>}
    </form>
  );
}
