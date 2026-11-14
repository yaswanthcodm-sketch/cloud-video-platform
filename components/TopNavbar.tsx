'use client';

import React, { useState } from 'react';
import {
  Film,
  Search,
  Bell,
  Upload,
  Globe,
  Settings,
  ChevronDown,
  Check,
  ShieldCheck,
  Lock,
  LogOut,
  X,
  User,
} from 'lucide-react';
import { SupportedLang } from '../lib/i18n';

interface TopNavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  currentLang: SupportedLang;
  onSelectLang: (lang: SupportedLang) => void;
  isAdmin?: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  adminEmail?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onOpenSettings,
  currentLang,
  onSelectLang,
  isAdmin = false,
  onOpenLogin,
  onLogout,
  adminEmail = 'yaswanthcodm@gmail.com',
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const languages: { code: SupportedLang; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5EAF2] h-[70px] flex items-center justify-between px-4 sm:px-6 shadow-sm select-none">
      
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#EAF4FF] flex items-center justify-center text-[#2196F3] shadow-sm">
          <Film className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-[#172B4D]">
              Cloud<span className="text-[#2196F3]">Stream</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF4FF] text-[#2196F3] border border-[#2196F3]/30">
              7.5GB HLS
            </span>
            {isAdmin ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-[#718096] border border-slate-200">
                Viewer Mode
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#718096] hidden sm:block">
            Universal Cloud Video Vault & Multi-Language Streaming
          </p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-lg mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search videos by title, format (MKV, MOV), or audio language (Telugu, Hindi)..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#F7FAFF] border border-[#E5EAF2] text-xs text-[#172B4D] placeholder-[#718096] focus:bg-white focus:border-[#2196F3] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#172B4D]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7FAFF] hover:bg-[#EAF4FF] border border-[#E5EAF2] text-xs font-semibold text-[#172B4D] transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-[#2196F3]" />
            <span className="uppercase font-mono text-[11px]">{currentLang}</span>
            <ChevronDown className="w-3 h-3 text-[#718096]" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#E5EAF2] shadow-xl py-2 z-50">
              <div className="px-3 py-1 text-[10px] font-bold text-[#718096] uppercase tracking-wider">
                Select Language
              </div>
              {languages.map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    onSelectLang(item.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                    currentLang === item.code
                      ? 'bg-[#EAF4FF] text-[#2196F3] font-bold'
                      : 'text-[#172B4D] hover:bg-[#F7FAFF]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </span>
                  {currentLang === item.code && <Check className="w-3.5 h-3.5 text-[#2196F3]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-[#F7FAFF] hover:bg-[#EAF4FF] border border-[#E5EAF2] text-[#718096] hover:text-[#172B4D] transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2196F3]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E5EAF2] shadow-xl p-3 z-50 space-y-2">
              <div className="font-bold text-xs text-[#172B4D] pb-1 border-b border-[#E5EAF2]">
                Notifications
              </div>
              <div className="p-2.5 rounded-xl bg-[#EAF4FF] text-xs text-[#172B4D]">
                <div className="font-semibold text-[#2196F3]">Cloud Stream Vault Active</div>
                <div className="text-[11px] text-[#718096] mt-0.5">
                  50 GB free private cloud storage connected.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ADMIN ONLY: Cloud Settings Trigger */}
        {isAdmin && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-[#F7FAFF] hover:bg-[#EAF4FF] border border-[#E5EAF2] text-[#718096] hover:text-[#2196F3] transition-colors"
            title="Cloud Settings (Admin Only)"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* ADMIN ONLY: Upload Button */}
        {isAdmin ? (
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold shadow-md shadow-[#2196F3]/25 active:scale-95 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Video</span>
          </button>
        ) : (
          /* NON-ADMIN: Admin Login Button */
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            title="Sign in as Administrator to add or manage videos"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>
        )}

        {/* User Profile / Status Avatar */}
        <div className="relative">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 border-l border-[#E5EAF2] cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="relative">
              <div className={`w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-sm ${
                isAdmin ? 'bg-[#16A34A]' : 'bg-[#718096]'
              }`}>
                {isAdmin ? 'A' : <User className="w-4 h-4" />}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isAdmin ? 'bg-[#16A34A]' : 'bg-[#2196F3]'
              }`} />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-[#172B4D]">
                {isAdmin ? 'Yaswanth (Admin)' : 'Viewer (Guest)'}
              </div>
              <div className="text-[10px] text-[#718096]">
                {isAdmin ? 'Upload Enabled' : 'Watch Only'}
              </div>
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#E5EAF2] shadow-xl p-3 z-50 space-y-2">
              <div className="pb-2 border-b border-[#E5EAF2]">
                <div className="text-xs font-bold text-[#172B4D]">
                  {isAdmin ? 'Administrator Account' : 'Public Viewer'}
                </div>
                <div className="text-[11px] text-[#718096] truncate">
                  {isAdmin ? adminEmail : 'Watching enabled for all videos'}
                </div>
              </div>

              {isAdmin ? (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#DC2626] hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out (Switch to Watch Only)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#2196F3] hover:bg-[#EAF4FF] transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>Admin Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
