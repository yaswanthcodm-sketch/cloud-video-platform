import { NextRequest, NextResponse } from 'next/server';
import { getB2Config, abortB2MultipartUpload } from '@/lib/b2Client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storageKey, uploadId } = body;

    if (!storageKey || !uploadId) {
      return NextResponse.json(
        { success: false, error: 'storageKey and uploadId are required' },
        { status: 400 }
      );
    }

    const cfg = getB2Config();
    await abortB2MultipartUpload(cfg.bucketName, storageKey, uploadId);

    return NextResponse.json({ success: true, message: 'Upload aborted' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
