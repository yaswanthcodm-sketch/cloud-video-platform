'use client';

import React, { useState } from 'react';
import {
  Play,
  MoreVertical,
  Globe,
  Subtitles,
  Trash2,
  Share2,
  Clock,
  Layers,
  ArrowUpDown,
  Check,
  Film,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';
import { VideoItem } from '../lib/types';

interface VideoGridProps {
  videos: VideoItem[];
  selectedVideoId?: string;
  onSelectVideo: (video: VideoItem) => void;
  onDeleteVideo: (id: string) => void;
  onViewDetails?: (video: VideoItem) => void;
  onReuploadVideo?: (video: VideoItem) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  isAdmin?: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  selectedVideoId,
  onSelectVideo,
  onDeleteVideo,
  onViewDetails,
  onReuploadVideo,
  sortBy,
  onSortChange,
  isAdmin = false,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (video: VideoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/watch/${video.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(video.id);
    setTimeout(() => setCopiedId(null), 1500);
    setActiveMenuId(null);
  };

  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'largest', label: 'Largest Size' },
    { id: 'smallest', label: 'Smallest Size' },
    { id: 'title', label: 'Title (A-Z)' },
    { id: 'duration', label: 'Longest Duration' },
  ];

  return (
    <div className="space-y-4">
      
      {/* Grid Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5EAF2]">
        <div>
          <h3 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
            <Film className="w-4 h-4 text-[#2196F3]" />
            <span>Video Library ({videos.length})</span>
          </h3>
          <p className="text-xs text-[#718096]">
            Every video has a unique cloud storage key and direct streaming link
          </p>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#718096]" />
          <span className="text-xs text-[#718096]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E5EAF2] text-xs font-semibold text-[#172B4D] focus:border-[#2196F3] focus:outline-none cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map((item) => {
          const isSelected = item.id === selectedVideoId;

          return (
            <div
              key={item.id}
              onClick={() => onSelectVideo(item)}
              className={`group relative rounded-3xl bg-white border soft-shadow card-hover cursor-pointer overflow-hidden flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-[#2196F3] ring-2 ring-[#2196F3]/30 shadow-md'
                  : 'border-[#E5EAF2] hover:border-[#2196F3]/50'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full bg-[#F0F4F8] overflow-hidden">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                  <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-white font-bold">
                    {item.format || item.originalFormat?.split(' ')[0]}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-[#16A34A] font-bold">
                    {item.fileSizeDisplay || item.originalSizeDisplay}
                  </span>
                  {item.status === 'needs_reupload' && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-white text-[10px] font-bold backdrop-blur-md">
                      Needs Cloud Upload
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/90 text-white text-[10px] font-bold backdrop-blur-md animate-pulse">
                      Uploading...
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-600/90 text-white text-[10px] font-bold backdrop-blur-md">
                      Upload Failed
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/90 text-white text-[10px] font-bold backdrop-blur-md animate-pulse">
                      Processing...
                    </span>
                  )}
                </div>

                {/* Quick Hover Delete Action (Admin Only) */}
                {isAdmin && onDeleteVideo && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete "${item.title}" from your cloud library?`)) {
                        onDeleteVideo(item.id);
                      }
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 hover:bg-[#DC2626] backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all z-20 shadow-md"
                    title="Delete Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-mono text-white font-semibold">
                  {item.durationDisplay}
                </div>

                {/* Hover Center Play Button */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#2196F3] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#172B4D] truncate group-hover:text-[#2196F3] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#718096] line-clamp-1 mt-0.5">
                      {item.description || item.originalFileName}
                    </p>
                  </div>

                  {/* 3-Dots Menu Trigger */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                      }}
                      className="p-1.5 rounded-lg text-[#718096] hover:text-[#172B4D] hover:bg-[#F7FAFF] transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover Menu */}
                    {activeMenuId === item.id && (
                      <div className="absolute right-0 top-8 w-44 rounded-2xl bg-white border border-[#E5EAF2] shadow-xl py-1.5 z-40 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVideo(item);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#F7FAFF] text-[#172B4D] flex items-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5 text-[#2196F3]" />
                          <span>Play Video</span>
                        </button>

                        <button
                          onClick={(e) => handleCopyLink(item, e)}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#F7FAFF] text-[#172B4D] flex items-center gap-2"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#718096]" />
                          <span>{copiedId === item.id ? 'Copied URL!' : 'Copy Stream Link'}</span>
                        </button>

                        {onViewDetails && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails(item);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-[#F7FAFF] text-[#172B4D] flex items-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#718096]" />
                            <span>View Details</span>
                          </button>
                        )}

                        {onReuploadVideo && (item.status === 'needs_reupload' || item.status === 'failed' || isAdmin) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReuploadVideo(item);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-amber-700 flex items-center gap-2 font-medium"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                            <span>Re-upload to Cloud</span>
                          </button>
                        )}

                        {isAdmin && (
                          <>
                            <div className="border-t border-[#E5EAF2] my-1" />

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                                  onDeleteVideo(item.id);
                                }
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-[#DC2626] flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Video</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Badges */}
                <div className="pt-2.5 border-t border-[#E5EAF2] flex items-center justify-between text-[11px] text-[#718096]">
                  <div className="flex items-center gap-1.5 text-[#2196F3] font-semibold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{item.audioTracks?.length || 1} Audio Dubs</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#718096]">
                    <Subtitles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{item.subtitleTracks?.length || 0} Subs</span>
                  </div>

                  <div className="text-[10px] font-mono text-[#718096]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {videos.length === 0 && (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#E5EAF2] p-8 space-y-3">
          <Film className="w-12 h-12 mx-auto text-[#718096]/50" />
          <h4 className="font-bold text-sm text-[#172B4D]">No Videos Found</h4>
          <p className="text-xs text-[#718096] max-w-sm mx-auto">
            Try adjusting your search query, or upload your first 7.5GB video to your cloud library!
          </p>
        </div>
      )}

    </div>
  );
};
