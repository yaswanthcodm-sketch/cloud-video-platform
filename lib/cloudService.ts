import { VideoItem, AudioTrack, SubtitleTrack } from './types';

export interface UploadProgress {
  percent: number;
  uploadedBytes: number;
  currentChunk: number;
  totalChunks: number;
  speedMbps: number;
  etaSeconds: number;
  statusText: string;
}

export class CloudVideoService {
  /**
   * Format bytes into clean human readable string
   */
  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Extract video frame thumbnail in the browser directly from the file.
   * Immediately skips non-browser-native containers (MKV, AVI, etc.) to prevent hanging.
   * Includes strict 600ms safety timeout so uploads are NEVER blocked.
   */
  static async extractThumbnail(file: File): Promise<string> {
    const fallback = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop';
    
    // MKV, AVI, WMV, FLV, TS cannot be decoded natively by HTML5 <video> - skip browser canvas extraction
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['mkv', 'avi', 'wmv', 'flv', 'ts', 'vob', 'm4v'].includes(ext || '')) {
      return fallback;
    }

    return new Promise((resolve) => {
      let settled = false;
      let objectUrl = '';

      const finish = (url: string) => {
        if (settled) return;
        settled = true;
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch {}
        }
        resolve(url);
      };

      // Strict safety timeout: NEVER hang the upload for thumbnail extraction
      const timer = setTimeout(() => {
        finish(fallback);
      }, 600);

      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;

        video.onloadeddata = () => {
          try {
            video.currentTime = Math.min(2, Math.max(0.5, (video.duration || 4) / 4));
          } catch {
            clearTimeout(timer);
            finish(fallback);
          }
        };

        video.onseeked = () => {
          clearTimeout(timer);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 480;
            canvas.height = 270;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              finish(dataUrl);
              return;
            }
          } catch {
            // fallback
          }
          finish(fallback);
        };

        video.onerror = () => {
          clearTimeout(timer);
          finish(fallback);
        };
      } catch {
        clearTimeout(timer);
        finish(fallback);
      }
    });
  }

  /**
   * Check if Backblaze B2 is configured
   */
  static async checkB2Status(): Promise<{ configured: boolean; bucketName?: string; endpoint?: string }> {
    try {
      const res = await fetch('/api/settings/b2');
      if (!res.ok) return { configured: false };
      return await res.json();
    } catch {
      return { configured: false };
    }
  }

  /**
   * Direct Backblaze B2 S3 Multipart Upload
   * Transfers videos up to 7.5 GB directly from browser to B2 with zero server RAM usage!
   */
  static async uploadVideoB2Multipart(
    file: File,
    title: string,
    description: string,
    category: string,
    audioTracks: AudioTrack[],
    subtitleTracks: SubtitleTrack[],
    onProgress: (state: UploadProgress) => void,
    onComplete: (video: VideoItem) => void,
    isPausedRef: { current: boolean },
    isCancelledRef: { current: boolean },
    existingVideoId?: string
  ) {
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB parts for optimal B2 S3 throughput
    const totalBytes = file.size;
    const totalParts = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));
    let uploadedBytes = 0;
    const startTime = Date.now();

    onProgress({
      percent: 0,
      uploadedBytes: 0,
      currentChunk: 0,
      totalChunks: totalParts,
      speedMbps: 0,
      etaSeconds: 0,
      statusText: 'Initializing Backblaze B2 cloud multipart session...',
    });

    const clientThumb = await this.extractThumbnail(file);

    // 1. Initialize Multipart Session on Backblaze B2
    const initRes = await fetch('/api/upload/b2/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSizeBytes: totalBytes,
        contentType: file.type || 'video/mp4',
        title,
        category,
        videoId: existingVideoId,
      }),
    });

    if (!initRes.ok) {
      const errData = await initRes.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to initiate Backblaze B2 session (${initRes.statusText})`);
    }

    const { videoId, storageKey, uploadId } = await initRes.json();
    const completedParts: Array<{ PartNumber: number; ETag: string }> = [];

    try {
      // 2. Upload each part directly to Backblaze B2 via presigned PUT URLs
      for (let partIndex = 0; partIndex < totalParts; partIndex++) {
        if (isCancelledRef.current) {
          await fetch('/api/upload/b2/abort', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storageKey, uploadId }),
          });
          return;
        }

        // Pause loop
        while (isPausedRef.current) {
          await new Promise((r) => setTimeout(r, 200));
          if (isCancelledRef.current) {
            await fetch('/api/upload/b2/abort', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storageKey, uploadId }),
            });
            return;
          }
        }

        const partNumber = partIndex + 1;
        const start = partIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalBytes);
        const partBlob = file.slice(start, end);

        // Fetch presigned URL for this part
        const signRes = await fetch('/api/upload/b2/sign-part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageKey, uploadId, partNumber }),
        });

        if (!signRes.ok) {
          throw new Error(`Failed to authorize part ${partNumber} for B2 upload`);
        }

        const { presignedUrl } = await signRes.json();

        // Upload part with retry mechanism
        let attempts = 0;
        let etag = '';
        while (attempts < 3) {
          try {
            attempts++;
            const uploadRes = await fetch(presignedUrl, {
              method: 'PUT',
              body: partBlob,
            });

            if (!uploadRes.ok) {
              throw new Error(`B2 Part ${partNumber} upload returned ${uploadRes.status}`);
            }

            etag = uploadRes.headers.get('ETag') || `etag-part-${partNumber}`;
            break;
          } catch (partErr: any) {
            if (attempts >= 3) throw partErr;
            await new Promise((r) => setTimeout(r, 1000 * attempts));
          }
        }

        completedParts.push({ PartNumber: partNumber, ETag: etag });
        uploadedBytes = end;

        const percent = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
        const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
        const speedBytesPerSec = uploadedBytes / elapsedSec;
        const speedMbps = +(speedBytesPerSec / (1024 * 1024)).toFixed(1);
        const remainingBytes = totalBytes - uploadedBytes;
        const etaSeconds = speedBytesPerSec > 0 ? Math.ceil(remainingBytes / speedBytesPerSec) : 0;

        onProgress({
          percent,
          uploadedBytes,
          currentChunk: partNumber,
          totalChunks: totalParts,
          speedMbps,
          etaSeconds,
          statusText: `Uploading part ${partNumber}/${totalParts} directly to B2 Cloud (${percent}%)...`,
        });
      }

      // 3. Complete Multipart Upload
      onProgress({
        percent: 100,
        uploadedBytes: totalBytes,
        currentChunk: totalParts,
        totalChunks: totalParts,
        speedMbps: 0,
        etaSeconds: 0,
        statusText: 'Finalizing multipart upload and registering video in cloud database...',
      });

      const completeRes = await fetch('/api/upload/b2/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          storageKey,
          uploadId,
          parts: completedParts,
          fileName: file.name,
          totalSizeBytes: totalBytes,
          title,
          description,
          category,
          audioTracks,
          subtitleTracks,
          thumbnailUrl: clientThumb,
        }),
      });

      if (!completeRes.ok) {
        const errJson = await completeRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to finalize Backblaze B2 upload');
      }

      const { video: newVideo } = await completeRes.json();
      setTimeout(() => onComplete(newVideo), 400);
    } catch (uploadErr) {
      // Abort multipart on failure
      fetch('/api/upload/b2/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, storageKey, uploadId }),
      }).catch(() => {});
      throw uploadErr;
    }
  }

  /**
   * Resilient server-assisted chunked upload
   */
  static async uploadVideoChunked(
    file: File,
    title: string,
    description: string,
    category: string,
    audioTracks: AudioTrack[],
    subtitleTracks: SubtitleTrack[],
    onProgress: (state: UploadProgress) => void,
    onComplete: (video: VideoItem) => void,
    isPausedRef: { current: boolean },
    isCancelledRef: { current: boolean }
  ) {
    const videoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
    const totalBytes = file.size;
    const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));
    let uploadedBytes = 0;
    const startTime = Date.now();

    const clientThumb = await this.extractThumbnail(file);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (isCancelledRef.current) return;

      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 200));
        if (isCancelledRef.current) return;
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkBlob = file.slice(start, end);

      const formData = new FormData();
      formData.append('videoId', videoId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('fileName', file.name);
      formData.append('totalSizeBytes', totalBytes.toString());
      formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('description', description);
      formData.append('category', category || 'General');
      formData.append('audioTracks', JSON.stringify(audioTracks || []));
      formData.append('subtitleTracks', JSON.stringify(subtitleTracks || []));
      formData.append('thumbnailUrl', clientThumb);
      formData.append('chunk', chunkBlob, `chunk_${chunkIndex}`);

      let attempts = 0;
      let data: any = null;

      while (attempts < 3) {
        try {
          attempts++;
          const res = await fetch('/api/upload/chunk', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `Upload server error (${res.status} ${res.statusText})`);
          }

          data = await res.json();
          break;
        } catch (retryErr: any) {
          if (attempts >= 3) {
            throw retryErr;
          }
          await new Promise((r) => setTimeout(r, 800 * attempts));
        }
      }

      uploadedBytes = end;
      const percent = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
      const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
      const speedBytesPerSec = uploadedBytes / elapsedSec;
      const speedMbps = +(speedBytesPerSec / (1024 * 1024)).toFixed(1);
      const remainingBytes = totalBytes - uploadedBytes;
      const etaSeconds = speedBytesPerSec > 0 ? Math.ceil(remainingBytes / speedBytesPerSec) : 0;

      onProgress({
        percent,
        uploadedBytes,
        currentChunk: chunkIndex + 1,
        totalChunks,
        speedMbps,
        etaSeconds,
        statusText: `Uploading chunk ${chunkIndex + 1}/${totalChunks} (${percent}%)...`,
      });

      if (data && data.complete && data.video) {
        onProgress({
          percent: 100,
          uploadedBytes: totalBytes,
          currentChunk: totalChunks,
          totalChunks,
          speedMbps,
          etaSeconds: 0,
          statusText: 'Upload completed! Video registered in cloud storage.',
        });

        const finalVideo = {
          ...data.video,
          thumbnailUrl: clientThumb || data.video.thumbnailUrl,
        };

        setTimeout(() => onComplete(finalVideo), 400);
        return;
      }
    }
  }
}
