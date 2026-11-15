'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Film,
  Upload,
  Search,
  HardDrive,
  Globe,
  Sparkles,
  Play,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { TopNavbar } from '../components/TopNavbar';
import { Sidebar, NavTab } from '../components/Sidebar';
import { DashboardOverview } from '../components/DashboardOverview';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoGrid } from '../components/VideoGrid';
import { CloudUploader } from '../components/CloudUploader';
import { VideoDetailModal } from '../components/VideoDetailModal';
import { CloudSettingsModal } from '../components/CloudSettingsModal';
import { AdminLoginModal } from '../components/AdminLoginModal';
import { VideoItem, StorageStats } from '../lib/types';
import { SupportedLang } from '../lib/i18n';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentLang, setCurrentLang] = useState<SupportedLang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Video data & stats
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState<StorageStats | undefined>(undefined);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [reuploadVideo, setReuploadVideo] = useState<VideoItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [detailModalVideo, setDetailModalVideo] = useState<VideoItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenReupload = (video: VideoItem) => {
    setReuploadVideo(video);
    setIsUploadOpen(true);
  };

  // Check admin session on mount
  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAdmin(true);
          setAdminEmail(data.user?.email || 'admin');
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_logged_in', 'true');
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Admin session check error:', e);
    }

    // Default to viewer mode if not authenticated
    setIsAdmin(false);
    setAdminEmail('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_logged_in');
    }
  }, []);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  // Login & Logout Handlers
  const handleLoginSuccess = (email: string) => {
    setIsAdmin(true);
    setAdminEmail(email);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_logged_in', 'true');
    }
    showToast('Welcome back, Administrator!');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setIsAdmin(false);
    setAdminEmail('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_logged_in');
    }
    showToast('Signed out of Admin session. You are now in Public Viewer mode.');
  };

  // Fetch all videos from persistent backend API
  const fetchVideos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedFormat && selectedFormat !== 'ALL') params.set('format', selectedFormat);
      if (sortBy) params.set('sortBy', sortBy);

      const res = await fetch(`/api/videos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.videos)) {
          setVideos(data.videos);
          setStats(data.stats);

          // If no video is selected yet, check URL query param first, then fallback to first video
          setSelectedVideoId((prev) => {
            if (prev && data.videos.some((v: VideoItem) => v.id === prev)) {
              return prev;
            }
            if (typeof window !== 'undefined') {
              const urlParams = new URLSearchParams(window.location.search);
              const requestedVid = urlParams.get('v');
              if (requestedVid && data.videos.some((v: VideoItem) => v.id === requestedVid)) {
                return requestedVid;
              }
            }
            return data.videos[0]?.id || null;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load videos from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedFormat, sortBy]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // CRITICAL FIX: Safe lookup of current video by unique ID
  const currentVideo = videos.find((v) => v.id === selectedVideoId) || videos[0] || null;

  // Handle Video Selection with URL synchronization
  const handleSelectVideo = (video: VideoItem) => {
    setSelectedVideoId(video.id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('v', video.id);
      window.history.pushState({}, '', url.toString());
    }
    // Smooth scroll to player container if in home view
    if (activeTab === 'home') {
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  };

  // Next / Previous Video
  const handleNextVideo = () => {
    if (!currentVideo || videos.length <= 1) return;
    const currentIndex = videos.findIndex((v) => v.id === currentVideo.id);
    const nextIndex = (currentIndex + 1) % videos.length;
    const nextVid = videos[nextIndex];
    setSelectedVideoId(nextVid.id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('v', nextVid.id);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handlePrevVideo = () => {
    if (!currentVideo || videos.length <= 1) return;
    const currentIndex = videos.findIndex((v) => v.id === currentVideo.id);
    const prevIndex = (currentIndex - 1 + videos.length) % videos.length;
    const prevVid = videos[prevIndex];
    setSelectedVideoId(prevVid.id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('v', prevVid.id);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Handle Video Upload Completion
  const handleVideoCreated = (newVideo: VideoItem) => {
    // 1. Add to front of state
    setVideos((prev) => [newVideo, ...prev.filter((v) => v.id !== newVideo.id)]);
    // 2. Select this exact newly uploaded video
    setSelectedVideoId(newVideo.id);
    // 3. Refresh backend stats
    fetchVideos();
    // 4. Scroll to player
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Handle Video Deletion
  const handleDeleteVideo = async (id: string) => {
    const targetVideo = videos.find((v) => v.id === id);
    try {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
        if (selectedVideoId === id) {
          const remaining = videos.filter((v) => v.id !== id);
          setSelectedVideoId(remaining[0]?.id || null);
        }
        fetchVideos();
        showToast(`Video "${targetVideo?.title || 'Selected video'}" removed from cloud library.`);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(`Failed to delete: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Failed to delete video:', err);
      showToast('Network error while deleting video.');
    }
  };

  const recentVideos = videos.filter((v) => v.lastWatchedAt || v.views > 0);

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-[#172B4D] flex flex-col">
      
      {/* Top Navbar */}
      <TopNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentLang={currentLang}
        onSelectLang={setCurrentLang}
        isAdmin={isAdmin}
        adminEmail={adminEmail}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          stats={stats}
          onOpenUpload={() => setIsUploadOpen(true)}
          isAdmin={isAdmin}
        />

        {/* Right Content Area */}
        <main className="flex-1 p-5 sm:p-8 space-y-8 min-w-0">
          
          {/* Dashboard Header / Welcome View */}
          {activeTab === 'home' && (
            <DashboardOverview
              stats={stats}
              recentVideos={recentVideos}
              onSelectVideo={handleSelectVideo}
              onOpenUpload={() => setIsUploadOpen(true)}
              selectedFormat={selectedFormat}
              onSelectFormat={setSelectedFormat}
              isAdmin={isAdmin}
            />
          )}

          {/* Master Video Player Container (When video is available) */}
          {currentVideo && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#2196F3] fill-current" />
                  <span>Now Streaming</span>
                </h3>
                <span className="text-xs text-[#718096] font-mono">
                  Playing: <strong>{currentVideo.originalFileName}</strong> (ID: {currentVideo.id.slice(0, 12)}...)
                </span>
              </div>

              <VideoPlayer
                key={currentVideo.id} // Stable key guarantees clean reload
                video={currentVideo}
                onNextVideo={videos.length > 1 ? handleNextVideo : undefined}
                onPrevVideo={videos.length > 1 ? handlePrevVideo : undefined}
                onDeleteVideo={handleDeleteVideo}
                onReuploadVideo={handleOpenReupload}
                isAdmin={isAdmin}
              />
            </section>
          )}

          {/* Video Library Grid Section */}
          <section className="space-y-4">
            <VideoGrid
              videos={videos}
              selectedVideoId={currentVideo?.id}
              onSelectVideo={handleSelectVideo}
              onDeleteVideo={handleDeleteVideo}
              onViewDetails={(v) => setDetailModalVideo(v)}
              onReuploadVideo={handleOpenReupload}
              sortBy={sortBy}
              onSortChange={setSortBy}
              isAdmin={isAdmin}
            />
          </section>

        </main>

      </div>

      {/* Modals */}
      <CloudUploader
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setReuploadVideo(null);
        }}
        onVideoCreated={handleVideoCreated}
        reuploadVideo={reuploadVideo}
      />

      <VideoDetailModal
        video={detailModalVideo}
        isOpen={!!detailModalVideo}
        onClose={() => setDetailModalVideo(null)}
        onDeleteVideo={handleDeleteVideo}
        onReuploadVideo={handleOpenReupload}
        isAdmin={isAdmin}
      />

      <CloudSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLang={currentLang}
      />

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#172B4D] text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
