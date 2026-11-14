'use client';

import React from 'react';
import { Cloud, Upload, Settings, Globe, ShieldCheck, Film } from 'lucide-react';
import { SupportedLang, DICTIONARY } from '../lib/i18n';

interface NavbarProps {
  currentLang: SupportedLang;
  onSelectLang: (lang: SupportedLang) => void;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  videoCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onSelectLang,
  onOpenUpload,
  onOpenSettings,
  videoCount,
}) => {
  const t = DICTIONARY[currentLang];

  const languages: { code: SupportedLang; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 shadow-lg shadow-indigo-500/25 p-0.5">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Film className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
              <Cloud className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white font-mono">
                Aura<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Cloud</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                7GB HLS
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-emerald-400 font-medium">0 GB Local Storage</span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span>Cloud Streaming</span>
            </div>
          </div>
        </div>

        {/* Feature Badges (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>🤗 Yaswanth11ui/video-vault</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">50 GB Free</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-semibold text-white">MKV • AVI • MOV • MP4</span>
            <span className="text-slate-500">→ HLS</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-Audio Dubs</span>
          </div>
        </div>

        {/* Actions & Language Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* UI Language Switcher */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium transition-all">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="uppercase font-mono">{currentLang}</span>
            </button>
            
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select UI Language
              </div>
              {languages.map((item) => (
                <button
                  key={item.code}
                  onClick={() => onSelectLang(item.code)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                    currentLang === item.code
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </span>
                  {currentLang === item.code && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Cloud Settings Modal Trigger */}
          <button
            onClick={onOpenSettings}
            title={t.configureCloud}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{t.uploadButton}</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>

      </div>
    </header>
  );
};
