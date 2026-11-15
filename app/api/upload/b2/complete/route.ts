import { NextRequest, NextResponse } from 'next/server';
import { getB2Config, completeB2MultipartUpload } from '@/lib/b2Client';
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

    // Finalize with Backblaze B2 S3 API
    await completeB2MultipartUpload(cfg.bucketName, storageKey, uploadId, parts);

    const ext = fileName.split('.').pop()?.toUpperCase() || 'MP4';
    const publicB2Url = `https://${cfg.bucketName}.${cfg.endpoint}/${storageKey}`;

    // Select nice thumbnail if none provided
    const defaultThumbs = [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    ];
    const finalThumb =
      thumbnailUrl ||
      defaultThumbs[Math.floor(Math.random() * defaultThumbs.length)];

    // Register strictly in database with stream route that handles signed auth & range headers
    const newVideo = VideoDb.create({
      id: videoId,
      title: title || fileName.replace(/\.[^/.]+$/, ''),
      description: description || 'Uploaded to Backblaze B2 Cloud Storage',
      originalFileName: fileName,
      storageKey,
      playbackUrl: `/api/stream/${videoId}`,
      fileSizeBytes: totalSizeBytes || 0,
      fileSizeDisplay: VideoDb.formatBytes(totalSizeBytes || 0),
      durationSeconds: 180,
      durationDisplay: '3m 00s',
      format: ext,
      mimeType: `video/${ext.toLowerCase() === 'mkv' ? 'x-matroska' : ext.toLowerCase()}`,
      thumbnailUrl: finalThumb,
      status: 'ready',
      resolutions: ['1080p FHD', '720p HD', '480p'],
      cloudProvider: 'aws', // B2 uses S3 standard
      cloudStorageLocation: `b2://${cfg.bucketName}/${storageKey}`,
      b2BucketName: cfg.bucketName,
      category: category || 'General',
      ownerId: 'user-yaswanth',
      audioTracks: audioTracks && audioTracks.length > 0 ? audioTracks : [
        { id: `aud-${Date.now()}-en`, languageCode: 'en', label: 'English (Original)', isDefault: true, codec: 'AAC' }
      ],
      subtitleTracks: subtitleTracks || [],
    });

    return NextResponse.json({
      success: true,
      video: newVideo,
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
