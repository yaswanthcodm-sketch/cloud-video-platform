import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VideoItem, AudioTrack, SubtitleTrack } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface VideoRecord {
  id: string;
  title: string;
  description: string;
  originalFileName: string;
  storageKey: string;
  storagePath?: string;
  playbackUrl: string;
  mp4FallbackUrl?: string;
  hlsStreamUrl?: string;
  fileSizeBytes: number;
  fileSizeDisplay: string;
  durationSeconds: number;
  durationDisplay: string;
  format: string;
  mimeType: string;
  thumbnailUrl: string;
  status: 'ready' | 'processing' | 'failed';
  resolutions: string[];
  cloudProvider: 'huggingface' | 'cloudflare' | 'aws' | 'local';
  cloudStorageLocation: string;
  createdAt: string;
  updatedAt: string;
  lastWatchedAt?: string;
  views: number;
  category: string;
  ownerId: string;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
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

// Initial seed data with distinct videos, distinct URLs, and proper unique IDs
const SEED_VIDEOS: VideoRecord[] = [
  {
    id: 'video_a_red_car',
    title: 'Video A - Red Car Test',
    description: 'Deterministic Production Benchmark Video A - High Visibility Red Car with 440Hz tone. Permanent ID: video_a_red_car',
    originalFileName: 'video_a_red_car.mp4',
    storageKey: 'videos/video_a_red_car/video_a_red_car.mp4',
    storagePath: 'public/samples/video_a_red_car.mp4',
    playbackUrl: '/api/stream/video_a_red_car',
    fileSizeBytes: 76840,
    fileSizeDisplay: '75.0 KB',
    durationSeconds: 6,
    durationDisplay: '0m 06s',
    format: 'MP4',
    mimeType: 'video/mp4',
    thumbnailUrl: '/samples/thumb_red_car.jpg',
    status: 'ready',
    resolutions: ['720p HD', '480p'],
    cloudProvider: 'local',
    cloudStorageLocation: 'public/samples/video_a_red_car.mp4',
    createdAt: '2026-11-15T01:00:00.000Z',
    updatedAt: '2026-11-15T01:00:00.000Z',
    views: 24,
    category: 'Benchmark',
    ownerId: 'admin',
    audioTracks: [
      { id: 'aud-a-1', languageCode: 'en', label: 'Stereo (440Hz Reference)', codec: 'AAC', isDefault: true }
    ],
    subtitleTracks: [
      { id: 'sub-a-1', languageCode: 'en', label: 'English [CC]', isDefault: true }
    ]
  },
  {
    id: 'video_b_blue_car',
    title: 'Video B - Blue Car Test',
    description: 'Deterministic Production Benchmark Video B - High Visibility Blue Car with 880Hz tone. Permanent ID: video_b_blue_car',
    originalFileName: 'video_b_blue_car.mp4',
    storageKey: 'videos/video_b_blue_car/video_b_blue_car.mp4',
    storagePath: 'public/samples/video_b_blue_car.mp4',
    playbackUrl: '/api/stream/video_b_blue_car',
    fileSizeBytes: 73780,
    fileSizeDisplay: '72.0 KB',
    durationSeconds: 6,
    durationDisplay: '0m 06s',
    format: 'MP4',
    mimeType: 'video/mp4',
    thumbnailUrl: '/samples/thumb_blue_car.jpg',
    status: 'ready',
    resolutions: ['720p HD', '480p'],
    cloudProvider: 'local',
    cloudStorageLocation: 'public/samples/video_b_blue_car.mp4',
    createdAt: '2026-11-15T00:59:00.000Z',
    updatedAt: '2026-11-15T00:59:00.000Z',
    views: 18,
    category: 'Benchmark',
    ownerId: 'admin',
    audioTracks: [
      { id: 'aud-b-1', languageCode: 'en', label: 'Stereo (880Hz Reference)', codec: 'AAC', isDefault: true }
    ],
    subtitleTracks: [
      { id: 'sub-b-1', languageCode: 'en', label: 'English [CC]', isDefault: true }
    ]
  },
  {
    id: 'vid-interstellar-master',
    title: 'Interstellar Odyssey: 4K Master Documentary',
    description: 'Deep-space exploratory mission cinematic captured in high-bitrate ProRes. Features full multi-language audio dubbing and synchronized subtitles.',
    originalFileName: 'Interstellar_Odyssey_Master.mkv',
    storageKey: 'videos/system/vid-interstellar-master.mp4',
    playbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    mp4FallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    fileSizeBytes: 6925631488, // 6.45 GB
    fileSizeDisplay: '6.45 GB',
    durationSeconds: 734,
    durationDisplay: '12m 14s',
    format: 'MKV',
    mimeType: 'video/x-matroska',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    status: 'ready',
    resolutions: ['4K UHD (2160p)', '1080p FHD', '720p HD', '480p'],
    cloudProvider: 'huggingface',
    cloudStorageLocation: 'hf://datasets/Yaswanth11ui/video-vault/Interstellar_Odyssey_Master.mkv',
    createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
    lastWatchedAt: '2026-11-14T08:15:00.000Z',
    views: 1240,
    category: 'Documentary',
    ownerId: 'user-yaswanth',
    audioTracks: [
      { id: 'aud-en-1', languageCode: 'en', label: 'English (Original Audio 5.1)', isDefault: true, codec: 'AAC' },
      { id: 'aud-es-1', languageCode: 'es', label: 'Español (Castilian Studio Dub)', isDefault: false, codec: 'AAC' },
      { id: 'aud-hi-1', languageCode: 'hi', label: 'हिन्दी (Hindi Cinema Dub)', isDefault: false, codec: 'AAC' },
      { id: 'aud-te-1', languageCode: 'te', label: 'తెలుగు (Telugu Dub)', isDefault: false, codec: 'AAC' },
      { id: 'aud-ja-1', languageCode: 'ja', label: '日本語 (Japanese Dub)', isDefault: false, codec: 'AAC' },
    ],
    subtitleTracks: [
      { id: 'sub-en-1', languageCode: 'en', label: 'English [CC]', isDefault: true },
      { id: 'sub-hi-1', languageCode: 'hi', label: 'हिन्दी (Hindi Subtitles)', isDefault: false },
      { id: 'sub-te-1', languageCode: 'te', label: 'తెలుగు (Telugu Subtitles)', isDefault: false },
      { id: 'sub-es-1', languageCode: 'es', label: 'Español', isDefault: false },
      { id: 'sub-ja-1', languageCode: 'ja', label: '日本語', isDefault: false },
    ],
  },
  {
    id: 'vid-cyberpunk-aerial',
    title: 'Metropolis 2088: Drone Cinematography',
    description: 'High-speed autonomous drone tracking shot captured in raw QuickTime MOV across modern skyline architectural wonders.',
    originalFileName: 'Metropolis_2088_Drone_RAW.mov',
    storageKey: 'videos/system/vid-cyberpunk-aerial.mp4',
    playbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    mp4FallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    fileSizeBytes: 5410652160, // 5.04 GB
    fileSizeDisplay: '5.04 GB',
    durationSeconds: 888,
    durationDisplay: '14m 48s',
    format: 'MOV',
    mimeType: 'video/quicktime',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    status: 'ready',
    resolutions: ['4K UHD', '1080p FHD', '720p HD'],
    cloudProvider: 'huggingface',
    cloudStorageLocation: 'hf://datasets/Yaswanth11ui/video-vault/Metropolis_2088_Drone_RAW.mov',
    createdAt: '2026-11-13T14:30:00.000Z',
    updatedAt: '2026-11-13T14:30:00.000Z',
    lastWatchedAt: '2026-11-14T07:20:00.000Z',
    views: 840,
    category: 'Film & Animation',
    ownerId: 'user-yaswanth',
    audioTracks: [
      { id: 'aud-en-2', languageCode: 'en', label: 'English (Original Audio)', isDefault: true, codec: 'AAC' },
      { id: 'aud-ja-2', languageCode: 'ja', label: '日本語 (Original Ambient + Commentary)', isDefault: false, codec: 'AAC' },
      { id: 'aud-es-2', languageCode: 'es', label: 'Español (Doblado)', isDefault: false, codec: 'AAC' },
    ],
    subtitleTracks: [
      { id: 'sub-en-2', languageCode: 'en', label: 'English', isDefault: true },
      { id: 'sub-ja-2', languageCode: 'ja', label: '日本語', isDefault: false },
      { id: 'sub-es-2', languageCode: 'es', label: 'Español', isDefault: false },
    ],
  },
  {
    id: 'vid-nature-4k-avi',
    title: 'Alpine Sanctuary: Wild Nature in Ultra HD',
    description: 'Raw high frame rate nature study saved in uncompressed AVI format, demonstrating seamless cloud playback and fast scrubbing.',
    originalFileName: 'Alpine_Sanctuary_Nature.avi',
    storageKey: 'videos/system/vid-nature-4k-avi.mp4',
    playbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    mp4FallbackUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    fileSizeBytes: 4294967296, // 4.00 GB
    fileSizeDisplay: '4.00 GB',
    durationSeconds: 596,
    durationDisplay: '9m 56s',
    format: 'AVI',
    mimeType: 'video/x-msvideo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop',
    status: 'ready',
    resolutions: ['1080p FHD', '720p HD', '480p'],
    cloudProvider: 'huggingface',
    cloudStorageLocation: 'hf://datasets/Yaswanth11ui/video-vault/Alpine_Sanctuary_Nature.avi',
    createdAt: '2026-11-14T02:15:00.000Z',
    updatedAt: '2026-11-14T02:15:00.000Z',
    lastWatchedAt: '2026-11-14T09:10:00.000Z',
    views: 450,
    category: 'Nature',
    ownerId: 'user-yaswanth',
    audioTracks: [
      { id: 'aud-en-3', languageCode: 'en', label: 'English (Nature Acoustics + Narration)', isDefault: true, codec: 'AAC' },
      { id: 'aud-hi-3', languageCode: 'hi', label: 'हिन्दी (Hindi Audio)', isDefault: false, codec: 'AAC' },
      { id: 'aud-te-3', languageCode: 'te', label: 'తెలుగు (Telugu Audio)', isDefault: false, codec: 'AAC' },
    ],
    subtitleTracks: [
      { id: 'sub-en-3', languageCode: 'en', label: 'English [CC]', isDefault: true },
      { id: 'sub-hi-3', languageCode: 'hi', label: 'हिन्दी (Hindi)', isDefault: false },
      { id: 'sub-te-3', languageCode: 'te', label: 'తెలుగు (Telugu)', isDefault: false },
    ],
  },
];

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

let memoryCache: VideoRecord[] | null = null;

function ensureDbFile(): VideoRecord[] {
  if (memoryCache && memoryCache.length > 0) {
    return [...memoryCache];
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_VIDEOS, null, 2), 'utf8');
    memoryCache = [...SEED_VIDEOS];
    return [...SEED_VIDEOS];
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    if (!raw.trim()) {
      fs.writeFileSync(DB_FILE, JSON.stringify(SEED_VIDEOS, null, 2), 'utf8');
      memoryCache = [...SEED_VIDEOS];
      return [...SEED_VIDEOS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryCache = parsed;
      return [...parsed];
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_VIDEOS, null, 2), 'utf8');
    memoryCache = [...SEED_VIDEOS];
    return [...SEED_VIDEOS];
  } catch (e) {
    if (memoryCache && memoryCache.length > 0) {
      return [...memoryCache];
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_VIDEOS, null, 2), 'utf8');
    memoryCache = [...SEED_VIDEOS];
    return [...SEED_VIDEOS];
  }
}

function writeDbFile(videos: VideoRecord[]) {
  memoryCache = [...videos];
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(videos, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_FILE);
  } catch (err) {
    console.error('Failed to write db file:', err);
  }
}

export const VideoDb = {
  formatBytes,

  getAll(options?: {
    search?: string;
    format?: string;
    category?: string;
    sortBy?: 'newest' | 'oldest' | 'largest' | 'smallest' | 'title' | 'duration' | 'recent';
  }): VideoRecord[] {
    let videos = ensureDbFile();

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      videos = videos.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.originalFileName.toLowerCase().includes(q) ||
          v.format.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.audioTracks.some((a) => a.label.toLowerCase().includes(q) || a.languageCode.includes(q))
      );
    }

    if (options?.format && options.format !== 'ALL') {
      const fmt = options.format.toUpperCase();
      videos = videos.filter((v) => v.format.toUpperCase() === fmt);
    }

    if (options?.category && options.category !== 'ALL') {
      videos = videos.filter((v) => v.category.toLowerCase() === options.category!.toLowerCase());
    }

    const sort = options?.sortBy || 'newest';
    videos.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'largest':
          return b.fileSizeBytes - a.fileSizeBytes;
        case 'smallest':
          return a.fileSizeBytes - b.fileSizeBytes;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'duration':
          return b.durationSeconds - a.durationSeconds;
        case 'recent':
          return (
            new Date(b.lastWatchedAt || b.createdAt).getTime() -
            new Date(a.lastWatchedAt || a.createdAt).getTime()
          );
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return videos;
  },

  getById(id: string): VideoRecord | null {
    if (!id) return null;
    const videos = ensureDbFile();
    return videos.find((v) => v.id === id) || null;
  },

  recordWatch(id: string): VideoRecord | null {
    const videos = ensureDbFile();
    const index = videos.findIndex((v) => v.id === id);
    if (index === -1) return null;

    videos[index].views = (videos[index].views || 0) + 1;
    videos[index].lastWatchedAt = new Date().toISOString();
    writeDbFile(videos);
    return videos[index];
  },

  create(record: Omit<VideoRecord, 'id' | 'createdAt' | 'updatedAt' | 'views'> & { id?: string }): VideoRecord {
    const videos = ensureDbFile();
    const newId = record.id || `vid_${crypto.randomUUID()}`;

    // Prevent duplicate ID collision
    const existingIndex = videos.findIndex((v) => v.id === newId);
    if (existingIndex !== -1) {
      throw new Error(`Video with ID ${newId} already exists`);
    }

    const now = new Date().toISOString();
    const newRecord: VideoRecord = {
      ...record,
      id: newId,
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Prepend so newly uploaded video is immediately first in library
    videos.unshift(newRecord);
    writeDbFile(videos);
    return newRecord;
  },

  update(id: string, updates: Partial<Omit<VideoRecord, 'id' | 'createdAt'>>): VideoRecord | null {
    const videos = ensureDbFile();
    const index = videos.findIndex((v) => v.id === id);
    if (index === -1) return null;

    videos[index] = {
      ...videos[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeDbFile(videos);
    return videos[index];
  },

  delete(id: string): boolean {
    const videos = ensureDbFile();
    const target = videos.find((v) => v.id === id);
    if (!target) return false;

    // Delete associated physical file if locally stored
    if (target.storagePath && fs.existsSync(target.storagePath)) {
      try {
        fs.unlinkSync(target.storagePath);
      } catch (err) {
        console.error('Failed to delete physical video file:', err);
      }
    }

    // Also check for any transcoded web version
    if (target.storagePath) {
      const dir = path.dirname(target.storagePath);
      const webMp4 = path.join(dir, `${id}_web_compatible.mp4`);
      if (fs.existsSync(webMp4)) {
        try {
          fs.unlinkSync(webMp4);
        } catch (e) {}
      }
    }

    // Clean up any remaining chunk directory
    const chunkDir = path.join(DATA_DIR, 'chunks', id);
    if (fs.existsSync(chunkDir)) {
      try {
        fs.rmSync(chunkDir, { recursive: true, force: true });
      } catch (e) {}
    }

    const filtered = videos.filter((v) => v.id !== id);
    writeDbFile(filtered);
    return true;
  },

  getStats(): StorageStats {
    const videos = ensureDbFile();
    const MAX_STORAGE = 50 * 1024 * 1024 * 1024; // 50 GB free cloud limit (e.g. Hugging Face free tier)
    const totalSizeBytes = videos.reduce((acc, v) => acc + (v.fileSizeBytes || 0), 0);
    const availableBytes = Math.max(0, MAX_STORAGE - totalSizeBytes);
    const usedPercentage = Math.min(100, Math.round((totalSizeBytes / MAX_STORAGE) * 100));

    return {
      totalVideos: videos.length,
      totalSizeBytes,
      totalSizeDisplay: formatBytes(totalSizeBytes),
      maxStorageBytes: MAX_STORAGE,
      maxStorageDisplay: formatBytes(MAX_STORAGE),
      usedPercentage,
      availableBytes,
      availableDisplay: formatBytes(availableBytes),
    };
  },
};
