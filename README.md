# AuraCloud Stream — 7GB+ Cloud Video Platform

> **100% Cloud-Based**: Videos up to **7 GB** are uploaded directly from the browser to cloud object storage. **Zero bytes are stored or transcoded on your laptop hard drive.**

---

## 🌟 Key Capabilities

### 1. 7 GB Resumable Cloud Ingestion
- **Tus.io & S3 Multipart Chunking**: Large video files are sliced into memory buffers (e.g. 10 MB chunks) in the browser and transmitted directly to cloud object storage.
- **Resilient**: If Wi-Fi or connection drops during a 7GB transfer, upload automatically resumes from the last confirmed chunk.
- **Zero Local Disk**: Files never touch your local filesystem.

### 2. Universal "Play Any Format" Transcoding
- Web browsers cannot natively decode containers like **MKV, AVI, WMV, FLV, or raw Apple ProRes**.
- Upon upload, cloud transcode workers unpack the container and package the streams into **HLS (HTTP Live Streaming)** with `.m3u8` master playlists and multi-bitrate ladders (4K, 1080p, 720p, 480p).
- Ensures seamless playback on any device, iPhone, Android, or desktop browser.

### 3. Multi-Language Audio & Subtitle Engine
- **Multiple Audio Dubs**: Supports attaching and switching between multiple audio streams (e.g. English Atmos, Spanish Studio Dub, Hindi Cinema Dub, French, Japanese, German).
- **Multi-Language Subtitles**: WebVTT (`.vtt`) and `.srt` caption rendering with language switching on the fly.
- **Interactive Synchronized Transcript**: Displays timecoded transcripts that highlight current speech in real-time, with click-to-seek playback.
- **UI Localization**: Instant UI translation across 6 languages (English, Spanish, Hindi, French, Japanese, German).

---

## 🏗️ Cloud Architecture

```
[User's Web Browser]
        │
        ├─ 1. Slices 7GB into 10MB chunks (In Memory)
        │
        ▼ (Direct Presigned HTTPS Transfer)
[Cloud Object Storage (Cloudflare R2 / AWS S3)]
        │
        ├─ 2. Triggers Cloud Transcoder (MediaConvert / Cloudflare Stream)
        │
        ▼
[Cloud Transcoding Worker]
        • Unpacks MKV / AVI / MOV / ProRes container
        • Normalizes video to H.264 / AV1 adaptive bitrates
        • Maps multiple audio streams into HLS #EXT-X-MEDIA:TYPE=AUDIO groups
        • Generates master.m3u8 playlist and WebVTT captions
        │
        ▼
[Global Edge CDN (Cloudflare / CloudFront)]
        │
        ▼
[Web Player (hls.js)] ──► Real-Time Multi-Audio & Subtitle Switching
```

---

## 🚀 Running the Project

### Local Development
```bash
cd /Users/yaswanth/.gemini/antigravity/scratch/cloud-video-platform
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run start
```

---

## ☁️ 100% Cloud Deployment (Zero Laptop Footprint)

To host the frontend completely in the cloud with zero software running on your computer:

### Option A: Deploy to Vercel (1-Click)
1. Push this project folder to your GitHub repository.
2. Go to [https://vercel.com/new](https://vercel.com/new) and import the repository.
3. Click **Deploy**. Vercel will build and host the app globally with HTTPS.

### Option B: Deploy to Cloudflare Pages
1. Go to your Cloudflare dashboard > **Workers & Pages**.
2. Connect your GitHub repository.
3. Build command: `npm run build`, Output directory: `.next`.
4. Deploy!

---

## ⚙️ Cloud Provider Credentials

You can test immediately using the built-in sandbox demo streams, or plug in live cloud credentials via the **Cloud Settings** button in the app:

### Cloudflare Stream (Recommended)
- **Account ID**: Found on your Cloudflare dashboard sidebar.
- **API Token**: Create a token with `Stream: Edit` permissions.

### AWS S3 + MediaConvert
- **AWS Access Key & Secret Key**
- **Bucket Name**: e.g., `production-video-vault`
- **Region**: e.g., `us-east-1`
