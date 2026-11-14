'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Film,
  HardDrive,
  Cloud,
  Languages,
  Subtitles,
  ExternalLink,
  Code,
  Calendar,
  Trash2,
} from 'lucide-react';
import { VideoItem } from '../lib/types';

interface VideoDetailModalProps {
  video: VideoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteVideo?: (id: string) => void;
  isAdmin?: boolean;
}

export const VideoDetailModal: React.FC<VideoDetailModalProps> = ({
  video,
  isOpen,
  onClose,
  onDeleteVideo,
  isAdmin = false,
}) => {
  const [copiedStream, setCopiedStream] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!isOpen || !video) return null;

  const streamUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/stream/${video.id}`
    : `/api/stream/${video.id}`;

  const embedCode = `<iframe src="${streamUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

  const copyToClipboard = (text: string, type: 'stream' | 'embed') => {
    navigator.clipboard.writeText(text);
    if (type === 'stream') {
      setCopiedStream(true);
      setTimeout(() => setCopiedStream(false), 1500);
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5EAF2] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-[#172B4D]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5EAF2]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#EAF4FF] text-[#2196F3]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">
                Video Details & Storage Identity
              </h2>
              <p className="text-xs text-[#718096]">
                Unique database record & cloud stream manifest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#718096] hover:text-[#172B4D] hover:bg-[#F7FAFF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-4 text-xs">
          
          {/* Title & Description */}
          <div>
            <div className="text-[10px] font-bold text-[#718096] uppercase">Title</div>
            <div className="text-sm font-bold text-[#172B4D] mt-0.5">{video.title}</div>
            {video.description && (
              <p className="text-xs text-[#718096] mt-1">{video.description}</p>
            )}
          </div>

          {/* Database & Cloud Keys */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
            <div>
              <div className="text-[10px] font-bold text-[#718096] uppercase">Unique Database ID</div>
              <div className="font-mono text-xs font-bold text-[#2196F3] mt-0.5 select-all">
                {video.id}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-[#718096] uppercase">Original File</div>
              <div className="font-mono text-xs font-bold text-[#172B4D] mt-0.5 truncate">
                {video.originalFileName}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-[#718096] uppercase">Storage Object Key</div>
              <div className="font-mono text-[11px] text-[#718096] mt-0.5 truncate select-all">
                {video.storageKey || `videos/${video.id}`}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-[#718096] uppercase">File Size & Format</div>
              <div className="text-xs font-bold text-[#16A34A] mt-0.5">
                {video.fileSizeDisplay || video.originalSizeDisplay} • {video.format || video.originalFormat?.split(' ')[0]}
              </div>
            </div>
          </div>

          {/* Direct Stream URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#718096] uppercase flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#2196F3]" />
                Direct HTTP Range Streaming URL
              </span>
              <button
                onClick={() => copyToClipboard(streamUrl, 'stream')}
                className="text-[11px] font-bold text-[#2196F3] hover:underline flex items-center gap-1"
              >
                {copiedStream ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedStream ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F7FAFF] border border-[#E5EAF2] font-mono text-[11px] text-[#172B4D] break-all select-all">
              {streamUrl}
            </div>
          </div>

          {/* Embed Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#718096] uppercase flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-[#2196F3]" />
                Embed Code (HTML iFrame)
              </span>
              <button
                onClick={() => copyToClipboard(embedCode, 'embed')}
                className="text-[11px] font-bold text-[#2196F3] hover:underline flex items-center gap-1"
              >
                {copiedEmbed ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEmbed ? 'Copied' : 'Copy Embed'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F7FAFF] border border-[#E5EAF2] font-mono text-[11px] text-[#718096] break-all select-all">
              {embedCode}
            </div>
          </div>

          {/* Audio Dubs & Subtitles List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] space-y-1.5">
              <span className="font-bold text-[#172B4D] text-xs flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-[#2196F3]" />
                <span>Audio Dubs ({video.audioTracks?.length || 1})</span>
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {video.audioTracks?.map((a) => (
                  <div key={a.id} className="text-[11px] text-[#718096] flex items-center gap-2">
                    <span className="font-mono uppercase font-bold text-[#2196F3] bg-[#EAF4FF] px-1.5 py-0.5 rounded text-[9px]">
                      {a.languageCode}
                    </span>
                    <span>{a.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] space-y-1.5">
              <span className="font-bold text-[#172B4D] text-xs flex items-center gap-1.5">
                <Subtitles className="w-3.5 h-3.5 text-amber-500" />
                <span>Subtitles ({video.subtitleTracks?.length || 0})</span>
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {video.subtitleTracks && video.subtitleTracks.length > 0 ? (
                  video.subtitleTracks.map((s) => (
                    <div key={s.id} className="text-[11px] text-[#718096] flex items-center gap-2">
                      <span className="font-mono uppercase font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[9px]">
                        {s.languageCode}
                      </span>
                      <span>{s.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[#718096] italic">No extra subtitles attached</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with Delete Action (Admin Only) */}
          {isAdmin && onDeleteVideo && (
            <div className="pt-4 border-t border-[#E5EAF2] flex items-center justify-between">
              <span className="text-[11px] text-[#718096]">Permanently remove from cloud library</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently delete "${video.title}"?`)) {
                    onDeleteVideo(video.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#DC2626] border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Video</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
