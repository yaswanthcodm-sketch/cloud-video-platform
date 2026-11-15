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
  const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  try {
    const { id } = await params;
    const rangeHeader = req.headers.get('range');
    const { searchParams } = new URL(req.url);
    const proxyMode = searchParams.get('proxy') === 'true';

    console.log(`[StreamAPI] [${reqId}] Incoming stream request for ID: "${id}"`);
    console.log(`[StreamAPI] [${reqId}] Headers - Range: "${rangeHeader || 'full'}" | ProxyMode: ${proxyMode}`);

    // 1. Establish single source of truth: lookup exact video by unique database ID
    const video = VideoDb.getById(id);

    if (!video) {
      console.warn(`[StreamAPI] [${reqId}] 404: Video not found in database for ID: "${id}"`);
      return NextResponse.json(
        {
          error: 'Video not found',
          message: `No video record exists with ID: "${id}"`,
          id,
          requestId: reqId,
        },
        {
          status: 404,
          headers: {
            'X-Request-Id': reqId,
            'X-Video-Id': id,
          },
        }
      );
    }

    console.log(
      `[StreamAPI] [${reqId}] Match: "${video.title}" (ID: ${video.id}) | Key: "${video.storageKey}" | Provider: "${video.cloudProvider}"`
    );

    // 2. Storage Strategy A: Deployed Static Samples (e.g. Video A Red Car / Video B Blue Car)
    // Check public/samples/ directory for verified test video files
    const publicSampleName = path.basename(video.originalFileName || '');
    const sampleCandidates = [
      video.cloudStorageLocation ? path.join(process.cwd(), video.cloudStorageLocation) : null,
      path.join(process.cwd(), 'public', 'samples', publicSampleName),
      path.join(process.cwd(), 'public', 'samples', `${video.id}.mp4`),
    ].filter(Boolean) as string[];

    for (const samplePath of sampleCandidates) {
      if (fs.existsSync(samplePath)) {
        console.log(`[StreamAPI] [${reqId}] Serving static verified file: ${samplePath}`);
        return serveLocalFileStream(samplePath, rangeHeader, reqId, video.id, video.storageKey, 'video/mp4');
      }
    }

    // 3. Storage Strategy B: Backblaze B2 Cloud Storage
    const isB2Video =
      video.cloudProvider === 'aws' ||
      video.cloudStorageLocation?.startsWith('b2://') ||
      video.storageKey?.startsWith('videos/');

    if (isB2Video && isB2Configured()) {
      const cfg = getB2Config();
      console.log(`[StreamAPI] [${reqId}] Routing to Backblaze B2 (Bucket: ${cfg.bucketName}, Key: ${video.storageKey})`);

      // Option A: Direct stream proxy through backend with HTTP 206 Range
      if (proxyMode && rangeHeader) {
        try {
          const b2Response = await getB2ObjectStream(cfg.bucketName, video.storageKey, rangeHeader);
          const bodyStream = b2Response.Body as any;
          const contentLength = b2Response.ContentLength?.toString() || '0';
          const contentRange = b2Response.ContentRange || '';
          const contentType = b2Response.ContentType || video.mimeType || 'video/mp4';

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
              'X-Request-Id': reqId,
              'X-Video-Id': video.id,
              'X-Storage-Key': video.storageKey,
            },
          });
        } catch (b2ProxyErr: any) {
          console.warn(`[StreamAPI] [${reqId}] B2 direct stream proxy failed:`, b2ProxyErr.message);
        }
      }

      // Option B: Presigned 6-hour direct GET URL for Backblaze B2 S3 storage
      try {
        const signedUrl = await getB2DownloadSignedUrl(cfg.bucketName, video.storageKey, 21600);
        console.log(`[StreamAPI] [${reqId}] Generated B2 presigned download URL for key: ${video.storageKey}`);
        return NextResponse.redirect(signedUrl, 307);
      } catch (signErr: any) {
        console.error(`[StreamAPI] [${reqId}] Failed to authorize B2 object:`, signErr.message);
        return NextResponse.json(
          {
            error: 'Backblaze B2 Authorization Error',
            message: signErr.message,
            storageKey: video.storageKey,
            bucket: cfg.bucketName,
            requestId: reqId,
          },
          {
            status: 403,
            headers: { 'X-Request-Id': reqId, 'X-Video-Id': video.id },
          }
        );
      }
    }

    // 4. Storage Strategy C: Local File Stream (On Localhost / Development)
    let streamFilePath = video.storagePath;

    // Check pre-remuxed web-compatible MP4 on disk
    if (streamFilePath) {
      const potentialWebMp4 = path.join(
        path.dirname(streamFilePath),
        `${video.id}_web_compatible.mp4`
      );

      if (fs.existsSync(potentialWebMp4)) {
        streamFilePath = potentialWebMp4;
      } else if (fs.existsSync(streamFilePath) && !VideoTranscoder.isRealMp4(streamFilePath)) {
        console.log(`[StreamAPI] [${reqId}] Non-MP4 container detected on local disk. Fast-remuxing...`);
        const remuxed = VideoTranscoder.fastRemuxSync(streamFilePath, potentialWebMp4);
        if (remuxed) streamFilePath = potentialWebMp4;
      }
    }

    if (streamFilePath && fs.existsSync(streamFilePath)) {
      console.log(`[StreamAPI] [${reqId}] Serving local filesystem video: ${streamFilePath}`);
      return serveLocalFileStream(
        streamFilePath,
        rangeHeader,
        reqId,
        video.id,
        video.storageKey,
        video.mimeType || 'video/mp4'
      );
    }

    // 5. Storage Strategy D: Dedicated Remote URL for THIS specific video (if configured)
    if (video.playbackUrl && video.playbackUrl.startsWith('http')) {
      console.log(`[StreamAPI] [${reqId}] Proxying dedicated remote URL: ${video.playbackUrl}`);
      try {
        const fetchHeaders: HeadersInit = {};
        if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

        const remoteRes = await fetch(video.playbackUrl, {
          headers: fetchHeaders,
          redirect: 'follow',
        });

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', remoteRes.headers.get('content-type') || 'video/mp4');
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Cache-Control', 'public, max-age=3600');
        responseHeaders.set('X-Request-Id', reqId);
        responseHeaders.set('X-Video-Id', video.id);
        responseHeaders.set('X-Storage-Key', video.storageKey);

        const contentLength = remoteRes.headers.get('content-length');
        if (contentLength) responseHeaders.set('Content-Length', contentLength);

        const contentRange = remoteRes.headers.get('content-range');
        if (contentRange) responseHeaders.set('Content-Range', contentRange);

        return new NextResponse(remoteRes.body as any, {
          status: remoteRes.status,
          headers: responseHeaders,
        });
      } catch (proxyErr: any) {
        console.warn(`[StreamAPI] [${reqId}] Remote proxy failed:`, proxyErr.message);
        return NextResponse.redirect(video.playbackUrl, 302);
      }
    }

    // 6. STRICT ERROR: NO SILENT SUBSTITUTION!
    // If the storage object for THIS exact video is not found, return explicit 404
    console.error(
      `[StreamAPI] [${reqId}] 404 Storage object not found for video: "${video.title}" (Key: ${video.storageKey})`
    );

    return NextResponse.json(
      {
        error: 'Video file not found in cloud storage',
        id: video.id,
        title: video.title,
        storageKey: video.storageKey,
        cloudProvider: video.cloudProvider,
        message: isB2Configured()
          ? `The object "${video.storageKey}" was not found in your Backblaze B2 bucket.`
          : 'Backblaze B2 is not configured on this server, and the video file does not exist locally.',
        requestId: reqId,
      },
      {
        status: 404,
        headers: {
          'X-Request-Id': reqId,
          'X-Video-Id': video.id,
          'X-Storage-Key': video.storageKey,
        },
      }
    );
  } catch (error: any) {
    console.error(`[StreamAPI] [${reqId}] Unhandled stream exception:`, error);
    return NextResponse.json(
      {
        error: 'Internal streaming server error',
        message: error.message || 'Unknown stream error',
        requestId: reqId,
      },
      {
        status: 500,
        headers: { 'X-Request-Id': reqId },
      }
    );
  }
}

/**
 * Helper to stream local files with full HTTP 206 Partial Content range seeking
 */
function serveLocalFileStream(
  filePath: string,
  rangeHeader: string | null,
  reqId: string,
  videoId: string,
  storageKey: string,
  defaultMime: string
) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = filePath.endsWith('.mp4') ? 'video/mp4' : defaultMime;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize) {
      return new NextResponse('Requested range not satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
          'X-Request-Id': reqId,
        },
      });
    }

    if (end >= fileSize) {
      end = fileSize - 1;
    }

    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

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
        'X-Request-Id': reqId,
        'X-Video-Id': videoId,
        'X-Storage-Key': storageKey,
      },
    });
  }

  // Full file stream
  const fileStream = fs.createReadStream(filePath);
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
      'X-Request-Id': reqId,
      'X-Video-Id': videoId,
      'X-Storage-Key': storageKey,
    },
  });
}
