import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { VideoDb } from '@/lib/db';
import { getB2Config, isB2Configured, getB2DownloadSignedUrl, getB2ObjectStream } from '@/lib/b2Client';
import { VideoTranscoder } from '@/lib/videoTranscoder';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = VideoDb.getById(id);

    if (!video) {
      return new NextResponse('Video record not found in cloud database', { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const formatReq = searchParams.get('format');
    const proxyMode = searchParams.get('proxy') === 'true';
    const rangeHeader = req.headers.get('range');

    // 1. Backblaze B2 Cloud Storage Stream
    const isB2Video =
      video.cloudProvider === 'aws' ||
      video.cloudStorageLocation?.startsWith('b2://') ||
      video.storageKey?.startsWith('videos/vid_b2_');

    if (isB2Video && isB2Configured()) {
      const cfg = getB2Config();

      if (proxyMode && rangeHeader) {
        // Stream directly through backend proxy
        try {
          const b2Response = await getB2ObjectStream(cfg.bucketName, video.storageKey, rangeHeader);
          const bodyStream = b2Response.Body as any;
          const contentLength = b2Response.ContentLength?.toString() || '0';
          const contentRange = b2Response.ContentRange || '';
          const contentType = b2Response.ContentType || 'video/mp4';

          const webStream = new ReadableStream({
            start(controller) {
              bodyStream.on('data', (chunk: any) => controller.enqueue(chunk));
              bodyStream.on('end', () => controller.close());
              bodyStream.on('error', (err: any) => controller.error(err));
            },
            cancel() {
              if (bodyStream.destroy) bodyStream.destroy();
            },
          });

          return new NextResponse(webStream, {
            status: 206,
            headers: {
              'Content-Range': contentRange,
              'Accept-Ranges': 'bytes',
              'Content-Length': contentLength,
              'Content-Type': contentType,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        } catch (b2ProxyErr) {
          console.warn('B2 direct stream proxy failed, falling back to signed URL redirect:', b2ProxyErr);
        }
      }

      // Generate a secure, 6-hour presigned GET URL for Backblaze B2
      try {
        const signedUrl = await getB2DownloadSignedUrl(cfg.bucketName, video.storageKey, 21600);
        return NextResponse.redirect(signedUrl, 307);
      } catch (signErr: any) {
        console.error('Failed to generate B2 signed URL:', signErr);
        return new NextResponse(`Backblaze B2 Authorization Error: ${signErr.message}`, { status: 403 });
      }
    }

    // 2. Physical File Stream with Full HTTP 206 Range Seeking Support
    let streamFilePath = video.storagePath;

    // Check default uploads folder for pre-remuxed web-compatible MP4
    const uploadsDir = path.join(process.cwd(), 'data', 'videos');
    const localWebMp4 = path.join(uploadsDir, `${video.id}_web_compatible.mp4`);

    if (fs.existsSync(localWebMp4)) {
      streamFilePath = localWebMp4;
      if (video.storagePath !== localWebMp4) {
        VideoDb.update(video.id, {
          storagePath: localWebMp4,
          format: 'MP4',
          mimeType: 'video/mp4',
          status: 'ready',
        });
      }
    } else if (streamFilePath && fs.existsSync(streamFilePath)) {
      const potentialMp4 = path.join(
        path.dirname(streamFilePath),
        `${video.id}_web_compatible.mp4`
      );

      // Priority 1: If pre-remuxed web-compatible MP4 exists, use it
      if (fs.existsSync(potentialMp4)) {
        streamFilePath = potentialMp4;
        if (video.storagePath !== potentialMp4) {
          VideoDb.update(video.id, {
            storagePath: potentialMp4,
            format: 'MP4',
            mimeType: 'video/mp4',
            status: 'ready',
          });
        }
      }
      // Priority 2: If the current file is not genuine web MP4, fast-remux on the fly
      else if (!VideoTranscoder.isRealMp4(streamFilePath)) {
        console.log(`[StreamEngine] Detected non-web MP4 container for ${video.id}. Fast-remuxing to web MP4...`);
        const remuxed = VideoTranscoder.fastRemuxSync(streamFilePath, potentialMp4);
        if (remuxed) {
          streamFilePath = potentialMp4;
          VideoDb.update(video.id, {
            storagePath: potentialMp4,
            format: 'MP4',
            mimeType: 'video/mp4',
            status: 'ready',
          });
        }
      }
    }

    if (streamFilePath && fs.existsSync(streamFilePath)) {
      const stat = fs.statSync(streamFilePath);
      const fileSize = stat.size;
      const mimeType = streamFilePath.endsWith('.mp4') ? 'video/mp4' : video.mimeType || 'video/mp4';

      if (rangeHeader) {
        // Parse HTTP Range: e.g. "bytes=0-1048575" or "bytes=1048576-"
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start) || start >= fileSize) {
          return new NextResponse('Requested range not satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
          });
        }

        if (end >= fileSize) {
          end = fileSize - 1;
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(streamFilePath, { start, end });

        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => controller.enqueue(chunk));
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }

      // Full file delivery (initial probe or non-seeking client)
      const fileStream = fs.createReadStream(streamFilePath);
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 3. Fallback Remote CDN / Storage URL
    const remoteUrl = video.mp4FallbackUrl || video.playbackUrl;
    if (remoteUrl && remoteUrl.startsWith('http')) {
      return NextResponse.redirect(remoteUrl, 307);
    }

    return new NextResponse('Video stream unavailable. Storage object not found.', { status: 404 });
  } catch (error: any) {
    console.error('Error handling video stream:', error);
    return new NextResponse(`Streaming error: ${error.message || 'Internal error'}`, { status: 500 });
  }
}
