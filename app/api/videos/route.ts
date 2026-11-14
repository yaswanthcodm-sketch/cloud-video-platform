import { NextRequest, NextResponse } from 'next/server';
import { VideoDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const format = searchParams.get('format') || undefined;
    const category = searchParams.get('category') || undefined;
    const sortBy = (searchParams.get('sortBy') as any) || 'newest';

    const videos = VideoDb.getAll({ search, format, category, sortBy });
    const stats = VideoDb.getStats();

    return NextResponse.json({
      success: true,
      videos,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.originalFileName) {
      return NextResponse.json(
        { success: false, error: 'Title and originalFileName are required' },
        { status: 400 }
      );
    }

    const created = VideoDb.create({
      title: body.title,
      description: body.description || '',
      originalFileName: body.originalFileName,
      storageKey: body.storageKey || `videos/uploads/${Date.now()}-${body.originalFileName}`,
      storagePath: body.storagePath,
      playbackUrl: body.playbackUrl || '',
      mp4FallbackUrl: body.mp4FallbackUrl,
      fileSizeBytes: body.fileSizeBytes || 0,
      fileSizeDisplay: VideoDb.formatBytes(body.fileSizeBytes || 0),
      durationSeconds: body.durationSeconds || 0,
      durationDisplay: body.durationDisplay || '00:00',
      format: body.format || body.originalFileName.split('.').pop()?.toUpperCase() || 'MP4',
      mimeType: body.mimeType || 'video/mp4',
      thumbnailUrl: body.thumbnailUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop',
      status: body.status || 'ready',
      resolutions: body.resolutions || ['1080p FHD', '720p HD', '480p'],
      cloudProvider: body.cloudProvider || 'huggingface',
      cloudStorageLocation: body.cloudStorageLocation || `hf://datasets/Yaswanth11ui/video-vault/${body.originalFileName}`,
      category: body.category || 'General',
      ownerId: body.ownerId || 'user-yaswanth',
      audioTracks: body.audioTracks || [
        { id: `aud-${Date.now()}-en`, languageCode: 'en', label: 'English (Original)', isDefault: true, codec: 'AAC' },
      ],
      subtitleTracks: body.subtitleTracks || [],
    });

    return NextResponse.json({
      success: true,
      video: created,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
