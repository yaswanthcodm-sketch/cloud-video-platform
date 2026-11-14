import { NextRequest, NextResponse } from 'next/server';
import { VideoDb } from '@/lib/db';
import { getB2Config, isB2Configured, deleteB2Object } from '@/lib/b2Client';
import { verifyAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = VideoDb.getById(id);

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    // Record view
    VideoDb.recordWatch(id);

    return NextResponse.json({
      success: true,
      video,
    });
  } catch (error: any) {
    console.error('Error fetching video by ID:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = VideoDb.update(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      video: updated,
    });
  } catch (error: any) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required to delete videos.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const video = VideoDb.getById(id);

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    // Clean up Backblaze B2 cloud storage object if hosted on B2
    if (
      (video.cloudProvider === 'aws' || video.cloudStorageLocation?.startsWith('b2://')) &&
      isB2Configured()
    ) {
      const cfg = getB2Config();
      deleteB2Object(cfg.bucketName, video.storageKey).catch((err) => {
        console.warn('Error deleting object from B2:', err);
      });
    }

    const deleted = VideoDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete video record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully from cloud library and storage',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
