import { NextRequest, NextResponse } from 'next/server';
import { getB2Config, isB2Configured, getB2PartUploadUrl } from '@/lib/b2Client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storageKey, uploadId, partNumber } = body;

    if (!storageKey || !uploadId || typeof partNumber !== 'number') {
      return NextResponse.json(
        { success: false, error: 'storageKey, uploadId, and partNumber are required' },
        { status: 400 }
      );
    }

    if (!isB2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Backblaze B2 is not configured' },
        { status: 400 }
      );
    }

    const cfg = getB2Config();
    const presignedUrl = await getB2PartUploadUrl(
      cfg.bucketName,
      storageKey,
      uploadId,
      partNumber,
      3600 // 1 hour validity per part
    );

    return NextResponse.json({
      success: true,
      presignedUrl,
      partNumber,
    });
  } catch (error: any) {
    console.error('Error generating B2 presigned part URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate part presigned URL',
      },
      { status: 500 }
    );
  }
}
