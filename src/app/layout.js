// src/app/layout.js
import './globals.css';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { SettingsProvider } from './context/SettingsContext';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';
import GlobalNavbar from './components/GlobalNavbar';
import SettingsButton from './components/SettingsButton';
import UploadButton from './components/UploadButton';

import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'HAREmonia',
  description: 'みんなの音楽を、もっと自由に。',
  themeColor: '#111827'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111827" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* iOS 用 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SettingsProvider>
          <AudioPlayerProvider>
            {children}
            <GlobalAudioPlayer />
            <GlobalNavbar />
            {/* ← ここに固定配置のコンテナをまとめる */}

            <div className="fixed top-4 right-4 z-[120] flex gap-3">
              <UploadButton />
              <SettingsButton />
            </div>

          </AudioPlayerProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
