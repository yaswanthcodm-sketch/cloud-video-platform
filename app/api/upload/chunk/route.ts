import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VideoDb } from '@/lib/db';
import { VideoTranscoder } from '@/lib/videoTranscoder';
import { verifyAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'videos');
const CHUNKS_DIR = path.join(process.cwd(), 'data', 'chunks');

function ensureDirectories() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Administrator login (yaswanthcodm@gmail.com) required to upload videos.',
        },
        { status: 401 }
      );
    }

    ensureDirectories();
    const formData = await req.formData();

    const videoId = (formData.get('videoId') as string) || `vid_${crypto.randomUUID()}`;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const totalChunks = parseInt(formData.get('totalChunks') as string, 10);
    const fileName = (formData.get('fileName') as string) || 'video.mp4';
    const totalSizeBytes = parseInt((formData.get('totalSizeBytes') as string) || '0', 10);
    const title = (formData.get('title') as string) || fileName.replace(/\.[^/.]+$/, '');
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || 'General';
    const audioTracksRaw = formData.get('audioTracks') as string;
    const subtitleTracksRaw = formData.get('subtitleTracks') as string;
    const clientThumb = formData.get('thumbnailUrl') as string;

    const chunk = formData.get('chunk') as Blob | null;

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || totalChunks <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid chunk data or missing parameters' },
        { status: 400 }
      );
    }

    // Directory for this specific video's chunks
    const videoChunkDir = path.join(CHUNKS_DIR, videoId);
    if (!fs.existsSync(videoChunkDir)) {
      fs.mkdirSync(videoChunkDir, { recursive: true });
    }

    // Save this chunk to disk
    const chunkPath = path.join(videoChunkDir, `chunk_${chunkIndex}`);
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(chunkPath, buffer);

    // Verify whether EVERY individual chunk from 0 to totalChunks - 1 exists
    let allChunksPresent = true;
    for (let i = 0; i < totalChunks; i++) {
      if (!fs.existsSync(path.join(videoChunkDir, `chunk_${i}`))) {
        allChunksPresent = false;
        break;
      }
    }

    if (allChunksPresent) {
      const lockPath = path.join(videoChunkDir, 'assembling.lock');
      if (fs.existsSync(lockPath)) {
        // Another chunk request is already reassembling the file
        return NextResponse.json({
          success: true,
          complete: false,
          videoId,
          chunkIndex,
          receivedChunks: totalChunks,
          totalChunks,
        });
      }
      fs.writeFileSync(lockPath, '1');

      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const finalFileName = `${videoId}_${sanitizedName}`;
      const finalFilePath = path.join(UPLOADS_DIR, finalFileName);

      // Reassemble chunks sequentially using direct synchronous file descriptor writes.
      // This prevents Node.js writable stream buffer overflow and EINVAL errors on large files!
      const fd = fs.openSync(finalFilePath, 'w');
      try {
        for (let i = 0; i < totalChunks; i++) {
          const cPath = path.join(videoChunkDir, `chunk_${i}`);
          if (fs.existsSync(cPath)) {
            const chunkData = fs.readFileSync(cPath);
            fs.writeSync(fd, chunkData);
          }
        }
      } finally {
        fs.closeSync(fd);
      }

      // Safely cleanup temporary chunk files after file is reassembled
      try {
        fs.rmSync(videoChunkDir, { recursive: true, force: true });
      } catch (cleanErr) {
        console.warn('Could not remove temp chunks folder:', cleanErr);
      }

      // Safe track parsing
      const audioTracks = safeJsonParse(audioTracksRaw, [
        { id: `aud-${Date.now()}-en`, languageCode: 'en', label: 'English (Original Audio)', isDefault: true, codec: 'AAC' }
      ]);
      const subtitleTracks = safeJsonParse(subtitleTracksRaw, []);

      const extension = fileName.split('.').pop()?.toUpperCase() || 'MP4';
      const stat = fs.existsSync(finalFilePath) ? fs.statSync(finalFilePath) : { size: totalSizeBytes };

      // Thumbnail selection
      const fallbackThumbs = [
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      ];
      let thumbnailToUse =
        clientThumb && clientThumb.startsWith('data:image')
          ? clientThumb
          : null;

      let effectiveStoragePath = finalFilePath;
      let effectiveFormat = extension;
      let effectiveMime = getMimeType(extension);

      // Verify if container is real MP4 or Matroska/MKV disguised as .mp4
      let isWebReady = VideoTranscoder.isRealMp4(finalFilePath);
      if (!isWebReady) {
        console.log(`[UploadChunk] Non-MP4 container detected for ${videoId} (${fileName}). Remuxing for web streaming...`);
        const webMp4Path = path.join(UPLOADS_DIR, `${videoId}_web_compatible.mp4`);
        const remuxed = VideoTranscoder.fastRemuxSync(finalFilePath, webMp4Path);
        if (remuxed) {
          effectiveStoragePath = webMp4Path;
          effectiveFormat = 'MP4';
          effectiveMime = 'video/mp4';
          isWebReady = true;
          console.log(`[UploadChunk] Fast remux succeeded for ${videoId} -> ${webMp4Path}`);
        } else {
          console.warn(`[UploadChunk] Fast remux failed, will queue background transcode`);
        }
      }

      // Generate real frame thumbnail using FFmpeg if client thumb was not base64
      if (!thumbnailToUse) {
        const generatedThumb = VideoTranscoder.generateThumbnail(effectiveStoragePath);
        thumbnailToUse = generatedThumb || fallbackThumbs[Math.floor(Math.random() * fallbackThumbs.length)];
      }

      // Extract accurate duration and audio tracks
      const meta = VideoTranscoder.extractMetadata(effectiveStoragePath);
      const parsedAudioTracks = audioTracks && audioTracks.length > 0 && audioTracks[0].languageCode !== 'en'
        ? audioTracks
        : (meta.audioTracks.length > 0 ? meta.audioTracks : audioTracks);

      const status = isWebReady ? 'ready' : 'processing';

      // Register video in database
      const newRecord = VideoDb.create({
        id: videoId,
        title,
        description: description || `Uploaded via chunked storage engine`,
        originalFileName: fileName,
        storageKey: `videos/${videoId}/${sanitizedName}`,
        storagePath: effectiveStoragePath,
        playbackUrl: `/api/stream/${videoId}`,
        fileSizeBytes: stat.size,
        fileSizeDisplay: VideoDb.formatBytes(stat.size),
        durationSeconds: meta.durationSeconds,
        durationDisplay: meta.durationDisplay,
        format: effectiveFormat,
        mimeType: effectiveMime,
        thumbnailUrl: thumbnailToUse,
        status,
        resolutions: ['1080p FHD', '720p HD', '480p'],
        cloudProvider: 'huggingface',
        cloudStorageLocation: `hf://datasets/Yaswanth11ui/video-vault/${sanitizedName}`,
        category,
        ownerId: 'user-yaswanth',
        audioTracks: parsedAudioTracks,
        subtitleTracks,
      });

      if (status === 'processing') {
        VideoTranscoder.queueBackgroundTranscode(newRecord);
      }

      return NextResponse.json({
        success: true,
        complete: true,
        videoId,
        video: newRecord,
      });
    }

    // Return ongoing progress
    const receivedCount = fs.readdirSync(videoChunkDir).length;
    return NextResponse.json({
      success: true,
      complete: false,
      videoId,
      chunkIndex,
      receivedChunks: receivedCount,
      totalChunks,
    });
  } catch (error: any) {
    console.error('Error handling upload chunk:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Chunk upload failed',
      },
      { status: 500 }
    );
  }
}

function getMimeType(ext: string): string {
  switch (ext.toUpperCase()) {
    case 'MP4':
      return 'video/mp4';
    case 'MKV':
      return 'video/x-matroska';
    case 'WEBM':
      return 'video/webm';
    case 'MOV':
      return 'video/quicktime';
    case 'AVI':
      return 'video/x-msvideo';
    case 'FLV':
      return 'video/x-flv';
    case 'WMV':
      return 'video/x-ms-wmv';
    default:
      return 'video/mp4';
  }
}
