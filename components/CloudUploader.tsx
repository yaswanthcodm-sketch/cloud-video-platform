'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileVideo,
  X,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Headphones,
  Subtitles,
  Server,
  Zap,
  ShieldCheck,
  Key,
  HardDrive,
  Settings,
} from 'lucide-react';
import { AudioTrack, SubtitleTrack, VideoItem } from '../lib/types';
import { CloudVideoService, UploadProgress } from '../lib/cloudService';

interface CloudUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoCreated: (video: VideoItem) => void;
  reuploadVideo?: VideoItem | null;
}

export const CloudUploader: React.FC<CloudUploaderProps> = ({
  isOpen,
  onClose,
  onVideoCreated,
  reuploadVideo,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [formatNotice, setFormatNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cloud Target Selection
  const [cloudTarget, setCloudTarget] = useState<'backblaze' | 'chunked'>('chunked');
  const [b2Configured, setB2Configured] = useState(false);
  const [b2BucketName, setB2BucketName] = useState('video-vault-user');
  const [showB2Settings, setShowB2Settings] = useState(false);
  const [b2KeyIdInput, setB2KeyIdInput] = useState('');
  const [b2AppKeyInput, setB2AppKeyInput] = useState('');
  const [b2BucketInput, setB2BucketInput] = useState('');
  const [isSavingB2, setIsSavingB2] = useState(false);

  // Multi-Language Audio Tracks
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([
    { id: '1', languageCode: 'en', label: 'English (Original Audio)', isDefault: true, codec: 'AAC' },
  ]);
  const [newAudioLang, setNewAudioLang] = useState('te');
  const [newAudioLabel, setNewAudioLabel] = useState('తెలుగు (Telugu Dub)');

  // Multi-Language Subtitles
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([
    { id: 'sub-1', languageCode: 'en', label: 'English [CC]', isDefault: true },
  ]);
  const [newSubLang, setNewSubLang] = useState('hi');
  const [newSubLabel, setNewSubLabel] = useState('हिन्दी (Hindi Subtitles)');

  // Upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [speedMbps, setSpeedMbps] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isDone, setIsDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (reuploadVideo) {
        setTitle(reuploadVideo.title || '');
        setDescription(reuploadVideo.description || '');
        setCategory(reuploadVideo.category || 'General');
        if (reuploadVideo.audioTracks && reuploadVideo.audioTracks.length > 0) {
          setAudioTracks(reuploadVideo.audioTracks);
        }
        if (reuploadVideo.subtitleTracks && reuploadVideo.subtitleTracks.length > 0) {
          setSubtitleTracks(reuploadVideo.subtitleTracks);
        }
      }

      CloudVideoService.checkB2Status().then((status) => {
        setB2Configured(status.configured);
        if (status.bucketName) setB2BucketName(status.bucketName);
        if (status.configured) {
          setCloudTarget('backblaze');
        } else {
          setCloudTarget('chunked');
        }
      });
    }
  }, [isOpen, reuploadVideo]);

  if (!isOpen) return null;

  const MAX_SIZE_BYTES = 7.5 * 1024 * 1024 * 1024; // 7.5 GB max limit

  const handleFileSelect = (file: File) => {
    setUploadError(null);
    if (file.size > MAX_SIZE_BYTES) {
      alert(`File size exceeds the 7.5 GB cloud limit (${CloudVideoService.formatBytes(file.size)}). Please choose a file up to 7.5 GB.`);
      return;
    }

    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['mkv', 'avi', 'mov', 'flv', 'wmv'].includes(ext || '')) {
      setFormatNotice(`${ext?.toUpperCase()} Container: Fast streaming remux and multi-dub audio enabled.`);
    } else {
      setFormatNotice(null);
    }
  };

  const handleAddAudioTrack = () => {
    if (!newAudioLang || !newAudioLabel) return;
    const newTrack: AudioTrack = {
      id: 'aud-' + Date.now(),
      languageCode: newAudioLang,
      label: newAudioLabel,
      codec: 'AAC',
    };
    setAudioTracks([...audioTracks, newTrack]);
    setNewAudioLabel('');
  };

  const handleRemoveAudioTrack = (id: string) => {
    if (audioTracks.length <= 1) return;
    setAudioTracks(audioTracks.filter((track) => track.id !== id));
  };

  const handleAddSubtitleTrack = () => {
    if (!newSubLang || !newSubLabel) return;
    const newSub: SubtitleTrack = {
      id: 'sub-' + Date.now(),
      languageCode: newSubLang,
      label: newSubLabel,
    };
    setSubtitleTracks([...subtitleTracks, newSub]);
    setNewSubLabel('');
  };

  const handleRemoveSubtitleTrack = (id: string) => {
    setSubtitleTracks(subtitleTracks.filter((sub) => sub.id !== id));
  };

  const saveB2Credentials = async () => {
    if (!b2KeyIdInput || !b2AppKeyInput) {
      alert('Please enter both Key ID and Application Key');
      return;
    }
    setIsSavingB2(true);
    try {
      const res = await fetch('/api/settings/b2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: b2KeyIdInput,
          applicationKey: b2AppKeyInput,
          bucketName: b2BucketInput || 'video-vault-user',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setB2Configured(true);
        setCloudTarget('backblaze');
        setShowB2Settings(false);
        setUploadError(null);
      } else {
        alert(data.error || 'Failed to save configuration');
      }
    } catch (e: any) {
      alert(e.message || 'Error saving Backblaze keys');
    } finally {
      setIsSavingB2(false);
    }
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    setUploadError(null);
    setIsUploading(true);
    setIsPaused(false);
    setIsDone(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    const onProgress = (progress: UploadProgress) => {
      setUploadPercent(progress.percent);
      setCurrentChunk(progress.currentChunk);
      setTotalChunks(progress.totalChunks);
      setSpeedMbps(progress.speedMbps);
      setEtaSeconds(progress.etaSeconds);
      setStatusText(progress.statusText);
    };

    const onComplete = (newVideo: VideoItem) => {
      setIsDone(true);
      setIsUploading(false);
      setTimeout(() => {
        onVideoCreated(newVideo);
        onClose();
      }, 700);
    };

    try {
      if (cloudTarget === 'backblaze' && b2Configured) {
        // High-Performance Direct S3 Multipart Upload to Backblaze B2
        await CloudVideoService.uploadVideoB2Multipart(
          selectedFile,
          title,
          description,
          category,
          audioTracks,
          subtitleTracks,
          onProgress,
          onComplete,
          isPausedRef,
          isCancelledRef,
          reuploadVideo?.id
        );
      } else {
        // High-Reliability Chunked Stream Engine
        await CloudVideoService.uploadVideoChunked(
          selectedFile,
          title,
          description,
          category,
          audioTracks,
          subtitleTracks,
          onProgress,
          onComplete,
          isPausedRef,
          isCancelledRef
        );
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Upload interrupted. Please check network connection.');
      setIsUploading(false);
    }
  };

  const togglePause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    isPausedRef.current = nextState;
  };

  const cancelUpload = () => {
    isCancelledRef.current = true;
    setIsUploading(false);
    setIsPaused(false);
    setUploadPercent(0);
    setStatusText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5EAF2] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-[#172B4D]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5EAF2]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#EAF4FF] text-[#2196F3]">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#172B4D] flex items-center gap-2">
                {reuploadVideo ? 'Re-upload Video to Cloud Storage' : 'Upload Video to Cloud Vault'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF4FF] text-[#2196F3] border border-[#2196F3]/30">
                  {reuploadVideo ? `ID: ${reuploadVideo.id}` : 'Up to 7.5 GB'}
                </span>
              </h2>
              <p className="text-xs text-[#718096]">
                {reuploadVideo
                  ? `Replaces missing cloud object while preserving database ID, Telugu audio & subtitles`
                  : `Direct-to-cloud streaming architecture • 0 bytes stored in server RAM`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-[#718096] hover:text-[#172B4D] hover:bg-[#F7FAFF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-5">

          {/* Cloud Storage Destination Selector */}
          <div className="p-4 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#172B4D] flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#2196F3]" />
                <span>Cloud Storage Destination</span>
              </span>
              <button
                type="button"
                onClick={() => setShowB2Settings(!showB2Settings)}
                className="text-[11px] font-semibold text-[#2196F3] hover:underline flex items-center gap-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{b2Configured ? 'Configure B2 Keys' : 'Setup B2 Keys'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Backblaze B2 Option */}
              <button
                type="button"
                onClick={() => setCloudTarget('backblaze')}
                disabled={isUploading}
                className={`p-3 rounded-xl border text-left transition-all ${
                  cloudTarget === 'backblaze'
                    ? 'border-[#2196F3] bg-[#EAF4FF]/60 shadow-sm'
                    : 'border-[#E5EAF2] bg-white hover:border-[#2196F3]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                    <span className="text-xs font-bold text-[#172B4D]">Backblaze B2 Cloud</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    b2Configured ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {b2Configured ? 'S3 Multipart Ready' : 'Setup Required'}
                  </span>
                </div>
                <p className="text-[11px] text-[#718096] mt-1">
                  Direct browser-to-B2 S3 multipart upload. Up to 7.5 GB, 0 server RAM.
                </p>
              </button>

              {/* Chunked Streaming Engine */}
              <button
                type="button"
                onClick={() => setCloudTarget('chunked')}
                disabled={isUploading}
                className={`p-3 rounded-xl border text-left transition-all ${
                  cloudTarget === 'chunked'
                    ? 'border-[#2196F3] bg-[#EAF4FF]/60 shadow-sm'
                    : 'border-[#E5EAF2] bg-white hover:border-[#2196F3]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2196F3]" />
                    <span className="text-xs font-bold text-[#172B4D]">Chunked Stream Engine</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#EAF4FF] text-[#2196F3] border border-[#2196F3]/30">
                    Active & Resilient
                  </span>
                </div>
                <p className="text-[11px] text-[#718096] mt-1">
                  Slices videos in 5MB chunks with auto-retry and multi-language dub support.
                </p>
              </button>
            </div>

            {/* Quick B2 Configuration Drawer */}
            {showB2Settings && (
              <div className="p-4 rounded-xl bg-white border border-[#2196F3]/30 space-y-3 mt-2">
                <div className="text-xs font-bold text-[#172B4D] flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#2196F3]" />
                  <span>Backblaze B2 Application Key Setup</span>
                </div>
                <p className="text-[11px] text-[#718096]">
                  Enter your Backblaze B2 Application Key details from the Backblaze Web Console (under <strong>Application Keys</strong>).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#172B4D] mb-1">Key ID / Access Key ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 005a3b2..."
                      value={b2KeyIdInput}
                      onChange={(e) => setB2KeyIdInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F7FAFF] border border-[#E5EAF2] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#172B4D] mb-1">Application Key / Secret Key</label>
                    <input
                      type="password"
                      placeholder="e.g. K005..."
                      value={b2AppKeyInput}
                      onChange={(e) => setB2AppKeyInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F7FAFF] border border-[#E5EAF2] text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#172B4D] mb-1">Bucket Name</label>
                    <input
                      type="text"
                      placeholder="e.g. video-vault-user"
                      value={b2BucketInput}
                      onChange={(e) => setB2BucketInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#F7FAFF] border border-[#E5EAF2] text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowB2Settings(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5EAF2] text-xs text-[#718096] hover:bg-[#F7FAFF]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveB2Credentials}
                    disabled={isSavingB2}
                    className="px-4 py-1.5 rounded-lg bg-[#2196F3] hover:bg-[#1976D2] text-xs text-white font-bold"
                  >
                    {isSavingB2 ? 'Saving...' : 'Save B2 Credentials'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-[#DC2626] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">Upload Error</div>
                <div>{uploadError}</div>
                {uploadError.includes('Backblaze B2 is not fully configured') && (
                  <button
                    type="button"
                    onClick={() => setShowB2Settings(true)}
                    className="mt-1.5 font-bold text-[#2196F3] underline text-xs"
                  >
                    Click here to enter your B2 keys or switch to Chunked Stream Engine.
                  </button>
                )}
              </div>
            </div>
          )}

          {/* File Picker / Dropzone */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-[#2196F3]/40 hover:border-[#2196F3] rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all bg-[#F7FAFF] hover:bg-[#EAF4FF]/40 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="video/*,.mkv,.avi,.mov,.mp4,.flv,.wmv,.webm,.m4v,.ts"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#EAF4FF] group-hover:bg-[#2196F3] text-[#2196F3] group-hover:text-white flex items-center justify-center transition-colors">
                <FileVideo className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#172B4D]">
                Drag and drop your video file here, or browse
              </h3>
              <p className="text-xs text-[#718096] mt-1.5 max-w-sm mx-auto">
                Supports all formats: <strong className="text-[#172B4D]">MP4, MKV, MOV, AVI, WebM, FLV, WMV</strong> up to <strong className="text-[#2196F3]">7.5 GB</strong>.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] font-mono font-bold text-[#718096]">
                <span className="px-2 py-0.5 rounded bg-white border border-[#E5EAF2]">.MP4</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#E5EAF2]">.MKV</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#E5EAF2]">.MOV</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#E5EAF2]">.AVI</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#E5EAF2]">.WEBM</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Selected File Card */}
              <div className="p-3.5 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-[#EAF4FF] text-[#2196F3]">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-[#172B4D] truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-[#718096]">
                      {CloudVideoService.formatBytes(selectedFile.size)} • {selectedFile.type || 'Video'}
                    </p>
                  </div>
                </div>

                {!isUploading && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 text-[#718096] hover:text-[#DC2626] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Format Notice */}
              {formatNotice && (
                <div className="p-3 rounded-xl bg-[#EAF4FF] border border-[#2196F3]/30 text-xs text-[#172B4D] flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2196F3] shrink-0" />
                  <span className="font-semibold">{formatNotice}</span>
                </div>
              )}

              {/* Title, Category & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Video Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    disabled={isUploading}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter video title..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFF] border border-[#E5EAF2] text-xs text-[#172B4D] focus:bg-white focus:border-[#2196F3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    disabled={isUploading}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFF] border border-[#E5EAF2] text-xs text-[#172B4D] focus:bg-white focus:border-[#2196F3] focus:outline-none cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Movies">Movies</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Tutorials">Tutorials</option>
                    <option value="Nature">Nature</option>
                  </select>
                </div>
              </div>

              {/* Multi-Language Audio Dubs */}
              <div className="p-4 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#172B4D] flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-[#2196F3]" />
                    <span>Multi-Language Audio Dubs ({audioTracks.length})</span>
                  </span>
                  <span className="text-[10px] text-[#718096]">
                    Switchable in player
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {audioTracks.map((trk) => (
                    <div
                      key={trk.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-[#E5EAF2] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#EAF4FF] text-[#2196F3] font-mono text-[10px] font-bold uppercase">
                          {trk.languageCode}
                        </span>
                        <span className="font-semibold text-[#172B4D]">{trk.label}</span>
                        {trk.isDefault && (
                          <span className="text-[10px] text-[#718096]">(Default)</span>
                        )}
                      </div>
                      {!isUploading && audioTracks.length > 1 && (
                        <button
                          onClick={() => handleRemoveAudioTrack(trk.id)}
                          className="text-[#718096] hover:text-[#DC2626]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isUploading && (
                  <div className="flex gap-2 pt-1">
                    <select
                      value={newAudioLang}
                      onChange={(e) => {
                        setNewAudioLang(e.target.value);
                        const names: Record<string, string> = {
                          en: 'English (Original)',
                          te: 'తెలుగు (Telugu Dub)',
                          hi: 'हिन्दी (Hindi Dub)',
                          es: 'Español (Doblado)',
                          ja: '日本語 (Japanese Dub)',
                          fr: 'Français',
                          de: 'Deutsch',
                        };
                        setNewAudioLabel(names[e.target.value] || e.target.value.toUpperCase());
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#E5EAF2] text-xs text-[#172B4D] focus:border-[#2196F3]"
                    >
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="ja">日本語</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>

                    <input
                      type="text"
                      value={newAudioLabel}
                      onChange={(e) => setNewAudioLabel(e.target.value)}
                      placeholder="e.g. Telugu Theatrical Dub"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#E5EAF2] text-xs text-[#172B4D] placeholder-[#718096] focus:border-[#2196F3]"
                    />

                    <button
                      onClick={handleAddAudioTrack}
                      className="px-3 py-2 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] text-xs text-white font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Dub
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-Language Subtitles */}
              <div className="p-4 rounded-2xl bg-[#F7FAFF] border border-[#E5EAF2] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#172B4D] flex items-center gap-1.5">
                    <Subtitles className="w-4 h-4 text-amber-500" />
                    <span>Multi-Language Subtitles ({subtitleTracks.length})</span>
                  </span>
                  <span className="text-[10px] text-[#718096]">
                    SRT / WebVTT tracks
                  </span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {subtitleTracks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-[#E5EAF2] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[10px] font-bold uppercase">
                          {sub.languageCode}
                        </span>
                        <span className="font-semibold text-[#172B4D]">{sub.label}</span>
                      </div>
                      {!isUploading && (
                        <button
                          onClick={() => handleRemoveSubtitleTrack(sub.id)}
                          className="text-[#718096] hover:text-[#DC2626]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isUploading && (
                  <div className="flex gap-2 pt-1">
                    <select
                      value={newSubLang}
                      onChange={(e) => {
                        setNewSubLang(e.target.value);
                        const names: Record<string, string> = {
                          hi: 'हिन्दी (Hindi Subtitles)',
                          te: 'తెలుగు (Telugu Subtitles)',
                          en: 'English [CC]',
                          es: 'Español',
                          ja: '日本語',
                          fr: 'Français',
                          de: 'Deutsch',
                        };
                        setNewSubLabel(names[e.target.value] || e.target.value.toUpperCase());
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#E5EAF2] text-xs text-[#172B4D] focus:border-[#2196F3]"
                    >
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="te">తెలుగు (Telugu)</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="ja">日本語</option>
                      <option value="fr">Français</option>
                    </select>

                    <input
                      type="text"
                      value={newSubLabel}
                      onChange={(e) => setNewSubLabel(e.target.value)}
                      placeholder="e.g. Telugu Subtitles"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#E5EAF2] text-xs text-[#172B4D] placeholder-[#718096] focus:border-[#2196F3]"
                    />

                    <button
                      onClick={handleAddSubtitleTrack}
                      className="px-3 py-2 rounded-xl bg-[#2196F3] hover:bg-[#1976D2] text-xs text-white font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Sub
                    </button>
                  </div>
                )}
              </div>

              {/* Real Upload Progress Bar */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-[#EAF4FF] border border-[#2196F3]/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#2196F3] font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 animate-bounce" />
                      {statusText}
                    </span>
                    <span className="font-mono text-[#172B4D] font-black">{uploadPercent}%</span>
                  </div>

                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2196F3] transition-all duration-200"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>

                  {/* Telemetry info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white border border-[#E5EAF2]">
                      <div className="text-[#718096] text-[10px] uppercase font-bold">Transferred</div>
                      <div className="font-bold text-[#172B4D] text-[11px] mt-0.5">
                        {CloudVideoService.formatBytes((selectedFile.size * uploadPercent) / 100)} / {CloudVideoService.formatBytes(selectedFile.size)}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-[#E5EAF2]">
                      <div className="text-[#718096] text-[10px] uppercase font-bold">Parts/Chunks</div>
                      <div className="font-bold text-[#2196F3] text-[11px] mt-0.5">
                        {currentChunk} / {totalChunks}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-[#E5EAF2]">
                      <div className="text-[#718096] text-[10px] uppercase font-bold">Speed</div>
                      <div className="font-bold text-[#16A34A] text-[11px] font-mono mt-0.5">
                        {speedMbps} MB/s
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-[#E5EAF2]">
                      <div className="text-[#718096] text-[10px] uppercase font-bold">ETA</div>
                      <div className="font-bold text-[#172B4D] text-[11px] font-mono mt-0.5">
                        {etaSeconds > 60 ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` : `${etaSeconds}s`}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={togglePause}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F7FAFF] border border-[#E5EAF2] text-xs text-[#172B4D] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      onClick={cancelUpload}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#DC2626] border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {isDone && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                  <div>
                    <div className="font-bold">Upload Complete!</div>
                    <div>Exact video saved in cloud vault and loaded into player.</div>
                  </div>
                </div>
              )}

              {/* Start Upload Button */}
              {!isUploading && !isDone && (
                <button
                  onClick={startUpload}
                  className="w-full py-3.5 rounded-2xl bg-[#2196F3] hover:bg-[#1976D2] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#2196F3]/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Start Resumable Cloud Upload ({CloudVideoService.formatBytes(selectedFile.size)})</span>
                </button>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
