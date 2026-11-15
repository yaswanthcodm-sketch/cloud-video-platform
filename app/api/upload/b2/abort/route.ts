import { NextRequest, NextResponse } from 'next/server';
import { getB2Config, abortB2MultipartUpload } from '@/lib/b2Client';
import { VideoDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storageKey, uploadId, videoId } = body;

    if (!storageKey || !uploadId) {
      return NextResponse.json(
        { success: false, error: 'storageKey and uploadId are required' },
        { status: 400 }
      );
    }

    const cfg = getB2Config();
    await abortB2MultipartUpload(cfg.bucketName, storageKey, uploadId);

    // Extract videoId from storageKey if not provided directly
    const match = storageKey.match(/^videos\/([^/]+)\//);
    const targetId = videoId || (match ? match[1] : null);
    if (targetId) {
      VideoDb.update(targetId, {
        status: 'failed',
        description: 'Upload cancelled or aborted by user.',
      });
    }

    return NextResponse.json({ success: true, message: 'Upload aborted and record marked failed' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
