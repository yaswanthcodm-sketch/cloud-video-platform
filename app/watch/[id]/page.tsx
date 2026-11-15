'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Cloud,
  FileCheck2,
  Calendar,
  Clock,
  HardDrive,
  Languages,
  Subtitles,
  AlertCircle,
  Loader2,
  Share2,
} from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoItem } from '@/lib/types';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/videos/${videoId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Video not found`);
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data.success && data.video) {
            setVideo(data.video);
          } else {
            setError('Video record could not be loaded.');
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Error loading video record');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  const handleCopyShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-[#172B4D] flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5EAF2] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0F4F8] hover:bg-[#E2E8F0] text-xs font-semibold text-[#172B4D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#2196F3]" />
            <span>Back to Library</span>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2196F3] to-[#00B4D8] flex items-center justify-center text-white shadow-sm">
              <Cloud className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-[#172B4D] hidden sm:inline">
              CloudVideo<span className="text-[#2196F3]">Platform</span>
            </span>
          </Link>
        </div>

        {video && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5EAF2] bg-white hover:bg-[#F7FAFF] text-xs font-semibold text-[#172B4D] shadow-xs transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-[#2196F3]" />
              <span>{copied ? 'Copied Link!' : 'Share'}</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-10 h-10 text-[#2196F3] animate-spin" />
            <p className="text-xs font-semibold text-[#718096]">
              Loading video record: <strong>{videoId}</strong>...
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#172B4D]">Video Not Found</h2>
            <p className="text-xs text-[#718096] leading-relaxed">
              No database record matching permanent ID: <code className="font-mono text-[#2196F3] bg-blue-50 px-2 py-0.5 rounded">{videoId}</code>.
              Random fallback substitution is disabled.
            </p>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#2196F3] text-white text-xs font-bold hover:bg-[#1976D2] transition-colors"
            >
              Return to Catalog
            </Link>
          </div>
        )}

        {!loading && video && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Identity Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E5EAF2]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="text-xs font-mono font-bold text-[#718096]">
                  Exact Route: /watch/{video.id}
                </span>
              </div>
              <span className="text-xs text-[#718096] font-mono">
                Storage Key: <strong className="text-[#172B4D]">{video.storageKey || 'N/A'}</strong>
              </span>
            </div>

            {/* Video Player */}
            <div className="shadow-lg rounded-3xl overflow-hidden border border-[#E5EAF2]">
              <VideoPlayer key={video.id} video={video} />
            </div>

            {/* Video Metadata Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#E5EAF2] soft-shadow space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-extrabold text-[#172B4D]">{video.title}</h1>
                  <p className="text-xs text-[#718096] mt-1 font-mono">{video.originalFileName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-xl bg-[#F0F4F8] text-xs font-mono font-bold text-[#2196F3]">
                    {video.format || 'MP4'}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#F0F4F8] text-xs font-mono font-bold text-[#16A34A]">
                    {video.fileSizeDisplay || video.originalSizeDisplay}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#F0F4F8] text-xs font-mono font-semibold text-[#172B4D]">
                    {video.durationDisplay}
                  </span>
                </div>
              </div>

              {video.description && (
                <p className="text-xs text-[#4A5568] leading-relaxed pt-2 border-t border-[#F0F4F8]">
                  {video.description}
                </p>
              )}

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#F0F4F8]">
                <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
                  <span className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Cloud Storage</span>
                  <p className="text-xs font-mono font-bold text-[#172B4D] mt-0.5 truncate">
                    {video.cloudProvider?.toUpperCase() || 'LOCAL'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
                  <span className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Audio Tracks</span>
                  <p className="text-xs font-semibold text-[#172B4D] mt-0.5">
                    {video.audioTracks?.length || 1} Dubbed
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
                  <span className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Subtitles</span>
                  <p className="text-xs font-semibold text-[#172B4D] mt-0.5">
                    {video.subtitleTracks?.length || 0} Available
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2]">
                  <span className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">HTTP 206 Streaming</span>
                  <p className="text-xs font-semibold text-[#16A34A] mt-0.5 flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Range Ready</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
