import { NextRequest, NextResponse } from 'next/server';
import { getB2Config, completeB2MultipartUpload, getB2ObjectMetadata } from '@/lib/b2Client';
import { VideoDb } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator login required to complete uploads.' },
        { status: 401 }
      );
    }
    const body = await req.json();
    const {
      videoId,
      storageKey,
      uploadId,
      parts,
      fileName,
      totalSizeBytes,
      title,
      description,
      category,
      audioTracks,
      subtitleTracks,
      thumbnailUrl,
    } = body;

    if (!videoId || !storageKey || !uploadId || !Array.isArray(parts)) {
      return NextResponse.json(
        { success: false, error: 'Missing required multipart completion fields' },
        { status: 400 }
      );
    }

    const cfg = getB2Config();

    // 1. Finalize multipart upload with Backblaze B2 S3 API
    await completeB2MultipartUpload(cfg.bucketName, storageKey, uploadId, parts);

    // 2. Task 4: Strictly verify the uploaded object in B2 before marking 'ready'
    let verifiedSize = totalSizeBytes || 0;
    try {
      const metadata = await getB2ObjectMetadata(cfg.bucketName, storageKey);
      if (metadata && typeof metadata.ContentLength === 'number') {
        verifiedSize = metadata.ContentLength;
      } else {
        throw new Error('Object verification returned empty metadata from Backblaze B2');
      }
    } catch (verErr: any) {
      console.error(`[UploadComplete] Physical B2 verification failed for key "${storageKey}":`, verErr);
      // Mark as failed in DB
      VideoDb.update(videoId, {
        status: 'failed',
        description: `B2 upload verification failed: ${verErr.message}`,
      });
      return NextResponse.json(
        {
          success: false,
          error: `Backblaze B2 object verification failed: ${verErr.message}. The video was marked as failed.`,
        },
        { status: 502 }
      );
    }

    const ext = fileName.split('.').pop()?.toUpperCase() || 'MP4';

    // Deterministic thumbnail selection without Math.random()
    const defaultThumbs = [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    ];
    const hash = videoId.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const finalThumb = thumbnailUrl || defaultThumbs[Math.abs(hash) % defaultThumbs.length];

    // 3. Save or update record with verified status 'ready'
    const existing = VideoDb.getById(videoId);
    let finalVideo;

    if (existing) {
      finalVideo = VideoDb.update(videoId, {
        title: title || existing.title,
        description: description || 'Uploaded to Backblaze B2 Cloud Storage',
        originalFileName: fileName,
        storageKey,
        playbackUrl: `/api/stream/${videoId}`,
        fileSizeBytes: verifiedSize,
        fileSizeDisplay: VideoDb.formatBytes(verifiedSize),
        format: ext,
        mimeType: `video/${ext.toLowerCase() === 'mkv' ? 'x-matroska' : ext.toLowerCase()}`,
        thumbnailUrl: finalThumb,
        status: 'ready',
        cloudProvider: 'aws',
        cloudStorageLocation: `b2://${cfg.bucketName}/${storageKey}`,
        b2BucketName: cfg.bucketName,
        category: category || existing.category,
        audioTracks: audioTracks && audioTracks.length > 0 ? audioTracks : existing.audioTracks,
        subtitleTracks: subtitleTracks || existing.subtitleTracks,
      });
    } else {
      finalVideo = VideoDb.create({
        id: videoId,
        title: title || fileName.replace(/\.[^/.]+$/, ''),
        description: description || 'Uploaded to Backblaze B2 Cloud Storage',
        originalFileName: fileName,
        storageKey,
        playbackUrl: `/api/stream/${videoId}`,
        fileSizeBytes: verifiedSize,
        fileSizeDisplay: VideoDb.formatBytes(verifiedSize),
        durationSeconds: 180,
        durationDisplay: '3m 00s',
        format: ext,
        mimeType: `video/${ext.toLowerCase() === 'mkv' ? 'x-matroska' : ext.toLowerCase()}`,
        thumbnailUrl: finalThumb,
        status: 'ready',
        resolutions: ['1080p FHD', '720p HD', '480p'],
        cloudProvider: 'aws',
        cloudStorageLocation: `b2://${cfg.bucketName}/${storageKey}`,
        b2BucketName: cfg.bucketName,
        category: category || 'General',
        ownerId: 'user-yaswanth',
        audioTracks: audioTracks && audioTracks.length > 0 ? audioTracks : [
          { id: `aud-${Date.now()}-en`, languageCode: 'en', label: 'English (Original)', isDefault: true, codec: 'AAC' }
        ],
        subtitleTracks: subtitleTracks || [],
      });
    }

    return NextResponse.json({
      success: true,
      video: finalVideo,
    });
  } catch (error: any) {
    console.error('Error completing B2 upload:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to finalize Backblaze B2 upload',
      },
      { status: 500 }
    );
  }
}
