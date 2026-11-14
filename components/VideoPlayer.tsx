'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Languages,
  Subtitles,
  Tv,
  Check,
  RotateCcw,
  SkipForward,
  SkipBack,
  Cloud,
  FileCheck2,
  AlertCircle,
  Loader2,
  Share2,
  Trash2,
} from 'lucide-react';
import { VideoItem, AudioTrack, SubtitleTrack } from '../lib/types';

interface VideoPlayerProps {
  video: VideoItem;
  onTimeUpdate?: (seconds: number) => void;
  onNextVideo?: () => void;
  onPrevVideo?: () => void;
  seekToTime?: number | null;
  onSeekHandled?: () => void;
  onDeleteVideo?: (id: string) => void;
  isAdmin?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  onTimeUpdate,
  onNextVideo,
  onPrevVideo,
  seekToTime,
  onSeekHandled,
  onDeleteVideo,
  isAdmin = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Audio Dubs
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(video.audioTracks || []);
  const [selectedAudioId, setSelectedAudioId] = useState<string>(
    video.audioTracks?.find((a) => a.isDefault)?.id || video.audioTracks?.[0]?.id || 'default'
  );
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>(video.subtitleTracks || []);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(
    video.subtitleTracks?.find((s) => s.isDefault)?.id || null
  );
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [activeSubtitleText, setActiveSubtitleText] = useState<string>('');

  // Quality & Speed
  const [qualities, setQualities] = useState<string[]>(['Auto', '1080p FHD', '720p HD', '480p']);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // State tracking stream URL attempt
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [retryAttempt, setRetryAttempt] = useState(0);

  // CRITICAL FIX: Reset and cleanly reload whenever the video ID changes
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // 1. Clear previous player state completely
    setIsLoading(true);
    setPlayerError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setActiveSubtitleText('');
    setShowAudioMenu(false);
    setShowSubMenu(false);
    setShowQualityMenu(false);
    setShowSpeedMenu(false);

    // 2. Destroy any existing HLS instance cleanly
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 3. Set track states strictly for THIS video record
    setAudioTracks(video.audioTracks || []);
    setSelectedAudioId(
      video.audioTracks?.find((a) => a.isDefault)?.id || video.audioTracks?.[0]?.id || 'default'
    );
    setSubtitles(video.subtitleTracks || []);
    setSelectedSubId(
      video.subtitleTracks?.find((s) => s.isDefault)?.id || null
    );

    // 4. Resolve exact stream URL for THIS video ID
    // Always route through /api/stream/{id} to enforce private B2 presigned signatures and HTTP 206 ranges
    const targetStreamUrl = video.id
      ? `/api/stream/${video.id}${retryAttempt > 0 ? '?proxy=true' : ''}`
      : video.playbackUrl || video.mp4FallbackUrl || '';

    setStreamUrl(targetStreamUrl);

    if (!targetStreamUrl) {
      setPlayerError('No playback stream URL available for this video record.');
      setIsLoading(false);
      return;
    }

    // Check if it is an HLS stream (.m3u8)
    if (Hls.isSupported() && targetStreamUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(targetStreamUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        if (data.levels && data.levels.length > 0) {
          const lvls = data.levels.map((lvl) => `${lvl.height}p`);
          setQualities(['Auto', ...new Set(lvls)]);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn('HLS fatal error, falling back to native player:', data);
          videoEl.src = `/api/stream/${video.id}`;
        }
      });
    } else {
      // Standard video file or HTTP Range Stream
      videoEl.src = targetStreamUrl;
      videoEl.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.id, video.playbackUrl, video.mp4FallbackUrl, retryAttempt]);

  // Handle external seek jumps (e.g., from transcript or card click)
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekToTime;
      if (onSeekHandled) onSeekHandled();
    }
  }, [seekToTime, onSeekHandled]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += 5;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= 5;
          break;
        case 'm':
        case 'M':
          setIsMuted((prev) => {
            if (videoRef.current) videoRef.current.muted = !prev;
            return !prev;
          });
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (onTimeUpdate) onTimeUpdate(curr);

    // Synchronize active subtitle line
    if (selectedSubId && video.transcripts) {
      const activeLang = subtitles.find((s) => s.id === selectedSubId)?.languageCode || 'en';
      const lines = video.transcripts[activeLang] || video.transcripts['en'] || [];
      const line = lines.find((item) => curr >= item.start && curr <= item.end);
      setActiveSubtitleText(line ? line.text : '');
    } else {
      setActiveSubtitleText('');
    }

    // Buffer percentage
    if (videoRef.current.buffered.length > 0) {
      const buffEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const total = videoRef.current.duration || 1;
      setBufferedPercent((buffEnd / total) * 100);
    }
  };

  // Switch Audio Language
  const handleSelectAudio = (track: AudioTrack) => {
    setSelectedAudioId(track.id);
    setShowAudioMenu(false);
    // Preserves playback timestamp smoothly
    if (videoRef.current) {
      const savedTime = videoRef.current.currentTime;
      const isWasPlaying = !videoRef.current.paused;
      // If separate audio dub stream exists
      if (track.streamUrl) {
        // can swap stream or handle multi-channel
      }
      videoRef.current.currentTime = savedTime;
      if (isWasPlaying) videoRef.current.play().catch(() => {});
    }
  };

  // Switch Subtitles
  const handleSelectSubtitle = (subId: string | null) => {
    setSelectedSubId(subId);
    setShowSubMenu(false);
  };

  // Switch Speed
  const handleSelectSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    setShowSpeedMenu(false);
  };

  const activeAudioTrack = audioTracks.find((a) => a.id === selectedAudioId) || audioTracks[0];
  const activeSubTrack = subtitles.find((s) => s.id === selectedSubId);

  return (
    <div
      ref={containerRef}
      className={`rounded-3xl bg-white border border-[#E5EAF2] soft-shadow overflow-hidden transition-all ${
        isTheater ? 'w-full max-w-none col-span-full' : 'w-full'
      }`}
    >
      {/* Video Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center group overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            setIsLoading(false);
            if (videoRef.current) {
              setDuration(videoRef.current.duration || video.durationSeconds || 0);
            }
          }}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setIsLoading(false);
            const err = videoRef.current?.error;
            console.error('Video stream error on <video> element:', err);

            if (retryAttempt === 0 && video.id) {
              console.log('Direct stream failed, trying backend proxy stream...');
              setRetryAttempt(1);
              return;
            }

            let msg = 'Could not load stream for this video. Please check your network or format.';
            if (video.status === 'processing') {
              msg = `Video format (${video.format}) is currently being converted to browser-compatible H.264/AAC with FFmpeg. Please wait a moment and retry.`;
            } else if (err?.code === 4) {
              const isB2 = video.cloudProvider === 'aws' || video.cloudStorageLocation?.startsWith('b2://');
              if (isB2) {
                msg = 'Backblaze B2 access denied or object missing. If this is a private bucket, please verify your B2 Key ID and Application Key in Settings.';
              } else if (video.format && !['MP4', 'WEBM'].includes(video.format.toUpperCase())) {
                msg = `Format ${video.format} requires transcoding into MP4 container. Automatic background FFmpeg remuxing was queued.`;
              }
            } else if (err?.code === 2) {
              msg = 'Network connection interrupted during chunked video streaming.';
            }

            setPlayerError(msg);
          }}
          playsInline
        />

        {/* Loading Spinner */}
        {isLoading && !playerError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs pointer-events-none space-y-2">
            <Loader2 className="w-12 h-12 text-[#2196F3] animate-spin" />
            {video.status === 'processing' && (
              <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1 rounded-full">
                Processing video for streaming...
              </span>
            )}
          </div>
        )}

        {/* Error Overlay with Action Button */}
        {playerError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white p-6 text-center space-y-3 z-30">
            <AlertCircle className="w-12 h-12 text-[#DC2626]" />
            <h3 className="font-bold text-sm">Streaming Notice</h3>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed">{playerError}</p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPlayerError(null);
                  setIsLoading(true);
                  setRetryAttempt((prev) => prev + 1);
                }}
                className="px-4 py-2 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] text-xs font-bold text-white transition-colors"
              >
                Retry Stream
              </button>
            </div>
          </div>
        )}

        {/* Video Identity Watermark Badge (Verifies exact ID mapping) */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-[#2196F3] border border-white/20 font-bold flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5" />
            <span>ID: {video.id.slice(0, 16)}</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-white border border-white/20">
            {video.format || video.originalFormat?.split(' ')[0]}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono text-[#16A34A] border border-white/20">
            {video.fileSizeDisplay || video.originalSizeDisplay}
          </span>
        </div>

        {/* Active Audio & Subtitle Language Badge */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
          {activeAudioTrack && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-white border border-white/20">
              <Languages className="w-3.5 h-3.5 text-[#2196F3]" />
              <span>Audio: {activeAudioTrack.label.split(' ')[0]}</span>
            </span>
          )}
          {activeSubTrack && (
            <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-amber-300 border border-white/20">
              CC: {activeSubTrack.label.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Center Play Button on Pause */}
        {!isPlaying && !isLoading && !playerError && (
          <button
            onClick={togglePlay}
            className="absolute z-10 w-20 h-20 rounded-full bg-[#2196F3] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
          >
            <Play className="w-8 h-8 ml-1 fill-current" />
          </button>
        )}

        {/* Subtitle On-Screen Overlay */}
        {selectedSubId && activeSubtitleText && (
          <div className="absolute bottom-20 inset-x-4 flex justify-center pointer-events-none z-20">
            <span className="px-4 py-2 rounded-xl bg-black/85 backdrop-blur-sm text-white text-sm sm:text-base md:text-lg font-semibold tracking-wide border border-white/10 shadow-2xl text-center max-w-2xl">
              {activeSubtitleText}
            </span>
          </div>
        )}

        {/* Player Controls Bar */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          
          {/* Progress Seek Bar */}
          <div className="relative w-full h-2 mb-3 bg-white/20 rounded-full cursor-pointer flex items-center">
            {/* Buffer Bar */}
            <div
              className="absolute h-full bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Playback Progress */}
            <div
              className="h-full bg-[#2196F3] rounded-full pointer-events-none"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const target = parseFloat(e.target.value);
                setCurrentTime(target);
                if (videoRef.current) videoRef.current.currentTime = target;
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-white text-xs">
            
            {/* Left Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {onPrevVideo && (
                <button
                  onClick={onPrevVideo}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Previous Video"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={togglePlay}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-[#2196F3]" /> : <Play className="w-5 h-5" />}
              </button>

              {onNextVideo && (
                <button
                  onClick={onNextVideo}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Next Video"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              {/* Volume Slider */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextMute = !isMuted;
                    setIsMuted(nextMute);
                    if (videoRef.current) videoRef.current.muted = nextMute;
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/20"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-[#DC2626]" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setIsMuted(val === 0);
                    if (videoRef.current) {
                      videoRef.current.volume = val;
                      videoRef.current.muted = val === 0;
                    }
                  }}
                  className="w-16 h-1 accent-[#2196F3] cursor-pointer hidden sm:inline"
                />
              </div>

              <span className="font-mono text-white/90 text-[11px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1 sm:gap-2 relative">
              
              {/* Audio Dub Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubMenu(false);
                    setShowQualityMenu(false);
                    setShowSpeedMenu(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                  title="Switch Audio Language"
                >
                  <Languages className="w-4 h-4 text-[#2196F3]" />
                  <span className="hidden sm:inline">Audio</span>
                </button>

                {showAudioMenu && (
                  <div className="absolute bottom-10 right-0 w-64 rounded-2xl bg-white text-[#172B4D] border border-[#E5EAF2] shadow-2xl p-2 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#718096] uppercase tracking-wider border-b border-[#E5EAF2]">
                      Available Audio Dubs
                    </div>
                    <div className="max-h-56 overflow-y-auto mt-1 space-y-1">
                      {audioTracks.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => handleSelectAudio(track)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            selectedAudioId === track.id
                              ? 'bg-[#EAF4FF] text-[#2196F3] font-bold'
                              : 'text-[#172B4D] hover:bg-[#F7FAFF]'
                          }`}
                        >
                          <div>
                            <div>{track.label}</div>
                            <div className="text-[10px] text-[#718096] font-mono">{track.languageCode.toUpperCase()}</div>
                          </div>
                          {selectedAudioId === track.id && <Check className="w-4 h-4 text-[#2196F3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subtitles Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSubMenu(!showSubMenu);
                    setShowAudioMenu(false);
                    setShowQualityMenu(false);
                    setShowSpeedMenu(false);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/20 text-xs font-semibold transition-colors ${
                    selectedSubId ? 'text-amber-300' : 'text-white'
                  }`}
                  title="Subtitles"
                >
                  <Subtitles className="w-4 h-4" />
                  <span className="hidden sm:inline">CC</span>
                </button>

                {showSubMenu && (
                  <div className="absolute bottom-10 right-0 w-56 rounded-2xl bg-white text-[#172B4D] border border-[#E5EAF2] shadow-2xl p-2 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#718096] uppercase tracking-wider border-b border-[#E5EAF2]">
                      Subtitles / Closed Captions
                    </div>
                    <div className="max-h-56 overflow-y-auto mt-1 space-y-1">
                      <button
                        onClick={() => handleSelectSubtitle(null)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          selectedSubId === null
                            ? 'bg-[#EAF4FF] text-[#2196F3] font-bold'
                            : 'text-[#172B4D] hover:bg-[#F7FAFF]'
                        }`}
                      >
                        <span>Off</span>
                        {selectedSubId === null && <Check className="w-4 h-4 text-[#2196F3]" />}
                      </button>

                      {subtitles.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubtitle(sub.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            selectedSubId === sub.id
                              ? 'bg-[#EAF4FF] text-[#2196F3] font-bold'
                              : 'text-[#172B4D] hover:bg-[#F7FAFF]'
                          }`}
                        >
                          <span>{sub.label}</span>
                          {selectedSubId === sub.id && <Check className="w-4 h-4 text-[#2196F3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowAudioMenu(false);
                    setShowSubMenu(false);
                    setShowQualityMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg hover:bg-white/20 text-xs font-mono font-semibold"
                >
                  {playbackRate}x
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-10 right-0 w-36 rounded-2xl bg-white text-[#172B4D] border border-[#E5EAF2] shadow-2xl p-2 z-50">
                    <div className="px-3 py-1 text-[10px] font-bold text-[#718096] uppercase tracking-wider border-b border-[#E5EAF2]">
                      Playback Speed
                    </div>
                    <div className="mt-1 space-y-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleSelectSpeed(rate)}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between ${
                            playbackRate === rate ? 'bg-[#EAF4FF] text-[#2196F3] font-bold' : 'hover:bg-[#F7FAFF]'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <Check className="w-3.5 h-3.5 text-[#2196F3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Theater Mode */}
              <button
                onClick={() => setIsTheater(!isTheater)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Theater Mode"
              >
                <Tv className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Video Details Bar (Light Mode) */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#172B4D] tracking-tight">
              {video.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#718096] max-w-3xl leading-relaxed">
              {video.description || 'Uploaded video stored in private cloud vault.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && onDeleteVideo && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${video.title}" permanently from your cloud library?`)) {
                    onDeleteVideo(video.id);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#DC2626] font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Permanently remove video"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Video</span>
              </button>
            )}
            <span className="px-3 py-1.5 rounded-xl bg-[#F7FAFF] text-[#718096] font-mono text-xs border border-[#E5EAF2] font-semibold">
              {video.views?.toLocaleString() || 1} views
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[#EAF4FF] text-[#2196F3] font-mono text-xs font-bold">
              {video.durationDisplay}
            </span>
          </div>
        </div>

        {/* Video Metadata Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E5EAF2]">
          <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF4FF] text-[#2196F3] flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-[10px] font-bold text-[#718096] uppercase">Cloud Object Key</div>
              <div className="text-xs font-mono font-bold text-[#172B4D] truncate">
                {video.storageKey || `videos/${video.id}`}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF4FF] text-[#2196F3] flex items-center justify-center shrink-0">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#718096] uppercase">Audio Dubs ({audioTracks.length})</div>
              <div className="text-xs font-bold text-[#2196F3]">
                {activeAudioTrack?.label || 'English (Original)'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF4FF] text-[#16A34A] flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#718096] uppercase">Format & File Size</div>
              <div className="text-xs font-mono font-bold text-[#16A34A]">
                {video.format || video.originalFormat?.split(' ')[0]} • {video.fileSizeDisplay || video.originalSizeDisplay}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
