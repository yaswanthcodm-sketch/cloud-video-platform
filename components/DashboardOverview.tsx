'use client';

import React from 'react';
import {
  Film,
  HardDrive,
  Cloud,
  Globe,
  Upload,
  Play,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { VideoItem, StorageStats } from '../lib/types';

interface DashboardOverviewProps {
  stats?: StorageStats;
  recentVideos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  onOpenUpload: () => void;
  selectedFormat: string;
  onSelectFormat: (format: string) => void;
  isAdmin?: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  recentVideos,
  onSelectVideo,
  onOpenUpload,
  selectedFormat,
  onSelectFormat,
  isAdmin = false,
}) => {
  const formats = [
    { id: 'ALL', label: 'All Formats' },
    { id: 'MP4', label: 'MP4' },
    { id: 'MKV', label: 'MKV' },
    { id: 'MOV', label: 'MOV' },
    { id: 'AVI', label: 'AVI' },
    { id: 'WEBM', label: 'WebM' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#2196F3] via-[#1E88E5] to-[#1565C0] p-6 sm:p-8 text-white shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>100% Cloud-Native • 0 GB on Your Laptop</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Cloud Video Hosting & Streaming
            </h1>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              Upload individual videos up to <strong className="text-white">7.5 GB</strong> in any format (MKV, AVI, MOV, MP4) with instant multi-language audio dubbing and synchronized subtitles.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {isAdmin ? (
              <button
                onClick={onOpenUpload}
                className="px-5 py-3 rounded-2xl bg-white text-[#2196F3] hover:bg-[#F7FAFF] font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Video (Up to 7.5GB)</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/30 shadow-sm">
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Public Streaming Vault • Click Any Movie to Watch</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Videos */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EAF2] soft-shadow card-hover flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#718096]">Total Videos</div>
            <div className="text-2xl font-black text-[#172B4D] mt-1">
              {stats?.totalVideos || 0}
            </div>
            <div className="text-[11px] text-[#16A34A] font-semibold mt-0.5">
              100% In Cloud Storage
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2196F3] flex items-center justify-center">
            <Film className="w-6 h-6" />
          </div>
        </div>

        {/* Cloud Storage Used */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EAF2] soft-shadow card-hover flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#718096]">Storage Used</div>
            <div className="text-2xl font-black text-[#2196F3] mt-1">
              {stats?.totalSizeDisplay || '0 Bytes'}
            </div>
            <div className="text-[11px] text-[#718096] mt-0.5">
              {stats?.usedPercentage || 0}% of 50 GB
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2196F3] flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        {/* Free Storage Available */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EAF2] soft-shadow card-hover flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#718096]">Available Free Space</div>
            <div className="text-2xl font-black text-[#16A34A] mt-1">
              {stats?.availableDisplay || '50 GB'}
            </div>
            <div className="text-[11px] text-[#718096] mt-0.5">
              Hugging Face Free Tier
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#16A34A] flex items-center justify-center">
            <Cloud className="w-6 h-6" />
          </div>
        </div>

        {/* Multi-Language Support */}
        <div className="p-5 rounded-2xl bg-white border border-[#E5EAF2] soft-shadow card-hover flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#718096]">Multi-Audio & Dubs</div>
            <div className="text-2xl font-black text-[#172B4D] mt-1">
              EN • HI • TE
            </div>
            <div className="text-[11px] text-[#718096] mt-0.5">
              + Spanish, Japanese, etc.
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF4FF] text-[#2196F3] flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Recently Watched Quick Slider */}
      {recentVideos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-[#172B4D]">
              <Clock className="w-4 h-4 text-[#2196F3]" />
              <span>Recently Watched</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentVideos.slice(0, 3).map((video) => (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video)}
                className="group p-3 rounded-2xl bg-white border border-[#E5EAF2] soft-shadow card-hover cursor-pointer flex items-center gap-3.5"
              >
                <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-[#F0F4F8] shrink-0">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                    {video.durationDisplay}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[#172B4D] truncate group-hover:text-[#2196F3] transition-colors">
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#718096]">
                    <span className="font-mono px-1.5 py-0.5 rounded bg-[#EAF4FF] text-[#2196F3] text-[9px] font-bold">
                      {video.format || video.originalFormat?.split(' ')[0]}
                    </span>
                    <span>{video.fileSizeDisplay || video.originalSizeDisplay}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format Filter Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm font-bold text-[#172B4D]">Video Formats</div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => onSelectFormat(fmt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFormat === fmt.id
                  ? 'bg-[#2196F3] text-white shadow-sm'
                  : 'bg-white text-[#718096] hover:text-[#172B4D] border border-[#E5EAF2]'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
