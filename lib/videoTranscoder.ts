import { spawn, spawnSync, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VideoDb, VideoRecord } from './db';

/**
 * Robust static FFmpeg binary path detection across platforms and bundling environments
 */
export function getFFmpegPath(): string {
  const root = process.cwd();
  const candidates = [
    // Pre-installed platform packages
    path.join(root, 'node_modules', '@ffmpeg-installer', 'darwin-arm64', 'ffmpeg'),
    path.join(root, 'node_modules', '@ffmpeg-installer', 'darwin-x64', 'ffmpeg'),
    path.join(root, 'node_modules', '@ffmpeg-installer', 'linux-x64', 'ffmpeg'),
    path.join(root, 'node_modules', '@ffmpeg-installer', 'linux-arm64', 'ffmpeg'),
    path.join(root, 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe'),
    // System paths
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // Fallback to environment variable if configured
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  return 'ffmpeg';
}

export class VideoTranscoder {
  /**
   * Determine whether a container format and MIME type can play directly in HTML5 video elements
   */
  static isBrowserCompatible(format: string, mimeType?: string): boolean {
    const fmt = format.toUpperCase();
    if (fmt === 'MP4' || fmt === 'WEBM') return true;
    if (mimeType === 'video/mp4' || mimeType === 'video/webm') return true;
    return false;
  }

  /**
   * Inspect container magic bytes: checks if the file has standard MP4 (ftyp) box
   */
  static isRealMp4(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    try {
      const buf = Buffer.alloc(32);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, 32, 0);
      fs.closeSync(fd);
      const str = buf.toString('latin1');
      return str.includes('ftyp');
    } catch {
      return false;
    }
  }

  /**
   * Extract video duration and audio tracks directly from file using FFmpeg
   */
  static extractMetadata(filePath: string): {
    durationSeconds: number;
    durationDisplay: string;
    audioTracks: Array<{ id: string; languageCode: string; label: string; isDefault: boolean; codec: string }>;
  } {
    const fallback = {
      durationSeconds: 120,
      durationDisplay: '2m 00s',
      audioTracks: [
        { id: `aud-1-en`, languageCode: 'en', label: 'English (Original Audio)', isDefault: true, codec: 'AAC' }
      ]
    };

    if (!fs.existsSync(filePath)) return fallback;

    try {
      const ffmpeg = getFFmpegPath();
      const res = spawnSync(ffmpeg, ['-i', filePath], { encoding: 'utf-8', timeout: 15000 });
      const output = (res.stdout || '') + (res.stderr || '');

      let durationSeconds = 120;
      let durationDisplay = '2m 00s';

      const durMatch = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})/);
      if (durMatch) {
        const hours = parseInt(durMatch[1], 10);
        const mins = parseInt(durMatch[2], 10);
        const secs = parseInt(durMatch[3], 10);
        durationSeconds = hours * 3600 + mins * 60 + secs;
        durationDisplay = hours > 0
          ? `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
          : `${mins}m ${secs.toString().padStart(2, '0')}s`;
      }

      const audioTracks: Array<{ id: string; languageCode: string; label: string; isDefault: boolean; codec: string }> = [];
      const trackRegex = /Stream #0:(\d+)(?:\(([^)]+)\))?: Audio: ([^,\n]+)/g;
      let m;

      while ((m = trackRegex.exec(output)) !== null) {
        const streamIdx = m[1];
        const rawLang = (m[2] || 'en').toLowerCase();
        let langCode = 'en';
        let label = 'English (Original Audio)';

        if (rawLang === 'hin' || rawLang === 'hi') {
          langCode = 'hi';
          label = 'हिन्दी (Hindi DD 2.0)';
        } else if (rawLang === 'ja' || rawLang === 'jpn') {
          langCode = 'ja';
          label = '日本語 (Japanese Dub)';
        } else if (rawLang === 'es' || rawLang === 'spa') {
          langCode = 'es';
          label = 'Español (Audio)';
        } else if (rawLang === 'fr' || rawLang === 'fra') {
          langCode = 'fr';
          label = 'Français (Audio)';
        } else if (rawLang === 'de' || rawLang === 'ger' || rawLang === 'deu') {
          langCode = 'de';
          label = 'Deutsch (Audio)';
        } else if (rawLang === 'en' || rawLang === 'eng') {
          langCode = 'en';
          label = 'English (Original Audio)';
        } else {
          langCode = rawLang;
          label = `${rawLang.toUpperCase()} Audio`;
        }

        audioTracks.push({
          id: `aud-${streamIdx}-${langCode}`,
          languageCode: langCode,
          label,
          isDefault: audioTracks.length === 0,
          codec: 'AAC'
        });
      }

      return {
        durationSeconds,
        durationDisplay,
        audioTracks: audioTracks.length > 0 ? audioTracks : fallback.audioTracks
      };
    } catch (err) {
      console.warn('Could not extract metadata via FFmpeg:', err);
      return fallback;
    }
  }

  /**
   * Extract high quality frame thumbnail directly from video using FFmpeg
   */
  static generateThumbnail(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    try {
      const ffmpeg = getFFmpegPath();
      const res = spawnSync(
        ffmpeg,
        [
          '-ss', '00:00:03',
          '-i', filePath,
          '-vframes', '1',
          '-f', 'image2pipe',
          '-s', '480x270',
          '-vcodec', 'mjpeg',
          '-'
        ],
        { maxBuffer: 10 * 1024 * 1024, timeout: 8000 }
      );
      if (res.status === 0 && res.stdout && res.stdout.length > 500) {
        return `data:image/jpeg;base64,${res.stdout.toString('base64')}`;
      }
    } catch {
      // fallback
    }
    return null;
  }

  /**
   * Ultra-fast synchronous remux to standard MP4 with +faststart (finishes in 1-2 seconds)
   * Maps all audio streams so multi-track videos (Hindi/English/Japanese) keep all tracks.
   * Uses spawnSync without shell globbing or escaping issues.
   */
  static fastRemuxSync(inputPath: string, outputPath: string): boolean {
    const ffmpeg = getFFmpegPath();
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Inspect input video codec using probe to apply correct container tags
    let isHevc = false;
    try {
      const probeRes = spawnSync(ffmpeg, ['-i', inputPath], { encoding: 'utf-8', timeout: 15000 });
      const probeOutput = (probeRes.stdout || '') + (probeRes.stderr || '');
      isHevc = probeOutput.includes('Video: hevc') || probeOutput.includes('Video: h265');
    } catch {
      // ignore
    }

    const tagArgs = isHevc ? ['-tag:v', 'hvc1'] : [];

    // Pass 1: Try stream copy on video and audio, with +faststart
    try {
      const res1 = spawnSync(
        ffmpeg,
        [
          '-y',
          '-i', inputPath,
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'copy',
          ...tagArgs,
          '-c:a', 'copy',
          '-movflags', '+faststart',
          outputPath,
        ],
        { timeout: 60000 }
      );
      if (res1.status === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        return true;
      }
    } catch {
      // Pass 1 failed (e.g. audio codec incompatible with MP4 container like DTS/Vorbis)
    }

    // Pass 2: Copy video stream, but transcode audio to standard AAC
    try {
      const res2 = spawnSync(
        ffmpeg,
        [
          '-y',
          '-i', inputPath,
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'copy',
          ...tagArgs,
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          outputPath,
        ],
        { timeout: 90000 }
      );
      if (res2.status === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        return true;
      }
    } catch (err2) {
      console.warn('Fast remux pass 2 failed:', err2);
    }

    return false;
  }

  /**
   * Fast-remux or transcode video to web-native H.264 / AAC MP4 with +faststart
   */
  static async transcodeToWebMp4(
    inputPath: string,
    outputPath: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const ffmpeg = getFFmpegPath();

    return new Promise((resolve, reject) => {
      // First attempt: try ultra-fast remuxing
      const args = [
        '-y',
        '-i', inputPath,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'copy',
        '-tag:v', 'hvc1',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        outputPath,
      ];

      const proc = spawn(ffmpeg, args);
      let stderrOutput = '';

      proc.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          resolve(outputPath);
        } else {
          // If remuxing failed (e.g. video codec wasn't H.264/HEVC), perform full transcoder to libx264
          console.log('Remuxing skipped or failed, falling back to full H.264 encode for compatibility...');
          const fullEncodeArgs = [
            '-y',
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            outputPath,
          ];

          const fullProc = spawn(ffmpeg, fullEncodeArgs);
          let fullStderr = '';

          fullProc.stderr.on('data', (d) => {
            fullStderr += d.toString();
          });

          fullProc.on('close', (fCode) => {
            if (fCode === 0 && fs.existsSync(outputPath)) {
              resolve(outputPath);
            } else {
              reject(new Error(`FFmpeg transcoding failed (exit code ${fCode}): ${fullStderr.slice(-300)}`));
            }
          });

          fullProc.on('error', (err) => reject(err));
        }
      });

      proc.on('error', (err) => reject(err));
    });
  }

  /**
   * Process a freshly uploaded video asynchronously in the background
   */
  static queueBackgroundTranscode(video: VideoRecord) {
    if (!video.storagePath || !fs.existsSync(video.storagePath)) {
      return;
    }

    if (this.isBrowserCompatible(video.format, video.mimeType) && this.isRealMp4(video.storagePath)) {
      VideoDb.update(video.id, { status: 'ready' });
      return;
    }

    // Update status to processing
    VideoDb.update(video.id, { status: 'processing' });

    const sourcePath = video.storagePath;
    const targetMp4Name = `${video.id}_web_compatible.mp4`;
    const targetMp4Path = path.join(path.dirname(sourcePath), targetMp4Name);

    console.log(`[VideoTranscoder] Starting background conversion for ${video.id} (${video.format} -> MP4)...`);

    this.transcodeToWebMp4(sourcePath, targetMp4Path)
      .then((convertedPath) => {
        const stat = fs.statSync(convertedPath);
        console.log(`[VideoTranscoder] Conversion complete for ${video.id}. New size: ${VideoDb.formatBytes(stat.size)}`);

        VideoDb.update(video.id, {
          status: 'ready',
          mp4FallbackUrl: `/api/stream/${video.id}?format=mp4`,
          storagePath: convertedPath,
          mimeType: 'video/mp4',
        });
      })
      .catch((err) => {
        console.error(`[VideoTranscoder] Transcoding error for ${video.id}:`, err);
        VideoDb.update(video.id, {
          status: 'ready',
          mp4FallbackUrl: `/api/stream/${video.id}`,
        });
      });
  }
}
