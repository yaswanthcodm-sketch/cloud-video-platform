import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getB2Config, isB2Configured, initB2MultipartUpload } from '@/lib/b2Client';
import { verifyAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator login required to upload videos.' },
        { status: 401 }
      );
    }
    const body = await req.json();
    const { fileName, fileSizeBytes, contentType, title, category } = body;

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'File name is required' },
        { status: 400 }
      );
    }

    if (!isB2Configured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backblaze B2 is not fully configured. Please set B2_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME in your settings or .env.local file.',
          missingConfig: true,
        },
        { status: 400 }
      );
    }

    const cfg = getB2Config();
    const videoId = `vid_b2_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `videos/${videoId}/${sanitizedName}`;

    const uploadId = await initB2MultipartUpload(
      cfg.bucketName,
      storageKey,
      contentType || 'video/mp4',
      {
        videoId,
        originalName: fileName,
        title: title || fileName,
        category: category || 'General',
      }
    );

    return NextResponse.json({
      success: true,
      videoId,
      storageKey,
      uploadId,
      bucketName: cfg.bucketName,
      endpoint: cfg.endpoint,
    });
  } catch (error: any) {
    console.error('Error initializing B2 multipart upload:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize Backblaze B2 multipart session',
      },
      { status: 500 }
    );
  }
}
