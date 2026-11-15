export interface AudioTrack {
  id: string;
  languageCode: string;
  label: string;
  isDefault?: boolean;
  codec?: string;
  channels?: string;
  file?: File;
  streamUrl?: string;
}

export interface SubtitleTrack {
  id: string;
  languageCode: string;
  label: string;
  isDefault?: boolean;
  vttContent?: string;
  vttUrl?: string;
  file?: File;
}

export interface TranscriptItem {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  originalFileName: string;
  storageKey?: string;
  storagePath?: string;
  playbackUrl?: string;
  hlsStreamUrl?: string;
  mp4FallbackUrl?: string;
  originalFormat: string;
  format?: string;
  originalSizeBytes: number;
  fileSizeBytes?: number;
  originalSizeDisplay: string;
  fileSizeDisplay?: string;
  durationSeconds: number;
  durationDisplay: string;
  thumbnailUrl: string;
  status: 'ready' | 'processing' | 'uploading' | 'failed' | 'error';
  resolutions: string[];
  cloudProvider: 'huggingface' | 'backblaze' | 'b2' | 'cloudflare' | 'aws' | 'r2' | 'local';
  cloudStorageLocation: string;
  b2BucketName?: string;
  createdAt: string;
  updatedAt?: string;
  lastWatchedAt?: string;
  views: number;
  category?: string;
  ownerId?: string;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  transcripts?: Record<string, TranscriptItem[]>;
}

export interface StorageStats {
  totalVideos: number;
  totalSizeBytes: number;
  totalSizeDisplay: string;
  maxStorageBytes: number;
  maxStorageDisplay: string;
  usedPercentage: number;
  availableBytes: number;
  availableDisplay: string;
}

export interface CloudConfig {
  provider: 'huggingface' | 'backblaze' | 'cloudflare' | 'aws' | 'r2';
  hfToken: string;
  hfRepo: string;
  hfIsPrivate: boolean;
  b2KeyId: string;
  b2AppKey: string;
  b2Bucket: string;
  b2Endpoint: string;
  cloudflareToken: string;
  cloudflareAccountId: string;
  awsAccessKey: string;
  awsSecretKey: string;
  awsBucket: string;
  awsRegion: string;
  transcodePreset: 'fast' | 'balanced' | 'cinema';
}

export interface ChunkUploadState {
  file: File | null;
  videoTitle: string;
  videoDescription: string;
  category: string;
  totalSize: number;
  uploadedBytes: number;
  percent: number;
  currentChunk: number;
  totalChunks: number;
  speedMbps: number;
  etaSeconds: number;
  status: 'idle' | 'uploading' | 'paused' | 'processing' | 'ready' | 'error';
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  errorMessage?: string;
}
