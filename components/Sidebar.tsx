'use client';

import React from 'react';
import {
  Home,
  Film,
  Upload,
  Share2,
  ListVideo,
  Clock,
  Settings,
  HardDrive,
  Cloud,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { StorageStats } from '../lib/types';

export type NavTab = 'home' | 'my-videos' | 'upload' | 'shared' | 'playlists' | 'recent' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  stats?: StorageStats;
  onOpenUpload: () => void;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  stats,
  onOpenUpload,
  isAdmin = false,
}) => {
  const allNavItems = [
    { id: 'home' as NavTab, label: 'Home Dashboard', icon: Home },
    { id: 'my-videos' as NavTab, label: 'Video Library', icon: Film, badge: stats?.totalVideos },
    ...(isAdmin
      ? [{ id: 'upload' as NavTab, label: 'Upload Video', icon: Upload, action: onOpenUpload }]
      : []),
    { id: 'recent' as NavTab, label: 'Recently Watched', icon: Clock },
    { id: 'playlists' as NavTab, label: 'Playlists', icon: ListVideo },
    { id: 'shared' as NavTab, label: 'Shared Videos', icon: Share2 },
    ...(isAdmin
      ? [{ id: 'settings' as NavTab, label: 'Cloud Settings', icon: Settings }]
      : []),
  ];

  const usedPercentage = stats?.usedPercentage || 30;

  return (
    <aside className="w-64 bg-white border-r border-[#E5EAF2] flex flex-col justify-between shrink-0 min-h-[calc(100vh-70px)] p-4 select-none">
      
      {/* Navigation Links */}
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-[#718096] uppercase tracking-wider">
            {isAdmin ? 'Admin Navigation' : 'Explore Library'}
          </div>
          <nav className="space-y-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      onSelectTab(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#EAF4FF] text-[#2196F3] shadow-sm'
                      : 'text-[#172B4D] hover:bg-[#F7FAFF] hover:text-[#2196F3]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#2196F3]' : 'text-[#718096]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#2196F3] text-white'
                          : 'bg-[#F0F4F8] text-[#718096]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Cloud Vault Status Card */}
        <div className="p-3.5 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] space-y-2">
          <div className="flex items-center gap-2 text-[#172B4D] font-bold text-xs">
            {isAdmin ? (
              <>
                <Cloud className="w-4 h-4 text-[#2196F3]" />
                <span>Admin Cloud Vault</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-[#16A34A]" />
                <span>Public Streaming Vault</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-[#718096] leading-relaxed">
            {isAdmin
              ? 'Authorized to upload videos up to 7.5 GB, manage dubs, and configure cloud storage.'
              : 'Streaming enabled for all visitors with multi-language dubs, subtitles, and instant seeking.'}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Admin Mode (Full Access)' : 'Viewer Mode (Watch Only)'}</span>
          </div>
        </div>
      </div>

      {/* Cloud Storage Meter */}
      <div className="pt-4 border-t border-[#E5EAF2] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#172B4D] flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#2196F3]" />
            <span>Cloud Library</span>
          </span>
          <span className="font-bold text-[#2196F3]">
            {stats ? stats.totalSizeDisplay : '15.49 GB'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-[#E5EAF2] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2196F3] rounded-full transition-all duration-300"
            style={{ width: `${usedPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#718096]">
          <span>{stats?.totalVideos || 0} movies hosted</span>
          <span>{stats ? stats.availableDisplay : '34.51 GB'} free</span>
        </div>

        {/* Admin only Upload Button */}
        {isAdmin && (
          <button
            onClick={onOpenUpload}
            className="w-full py-2.5 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] text-white text-xs font-bold shadow-md shadow-[#2196F3]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload 7.5GB Video</span>
          </button>
        )}
      </div>

    </aside>
  );
};
