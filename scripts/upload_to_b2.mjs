import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read environment from .env.local if present
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (!process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

// Check arguments or environment variables
const args = process.argv.slice(2);
let targetVideoId = 'vid_1794660415937_sltmtar'; // default to current target
let keyId = process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY_ID;
let applicationKey = process.env.B2_APPLICATION_KEY;
let bucketName = process.env.B2_BUCKET_NAME || 'video-vault-user';
let endpoint = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
let region = process.env.B2_REGION || 'us-east-005';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id' && args[i + 1]) {
    targetVideoId = args[i + 1];
    i++;
  } else if (!keyId && !args[i].startsWith('--')) {
    keyId = args[i];
  } else if (!applicationKey && !args[i].startsWith('--')) {
    applicationKey = args[i];
  } else if (args[i] && !args[i].startsWith('--')) {
    bucketName = args[i];
  }
}

if (!keyId || !applicationKey) {
  console.error('\n[Error] Backblaze B2 credentials not found in environment or arguments!');
  console.log('Usage: node scripts/upload_to_b2.mjs [B2_KEY_ID] [B2_APPLICATION_KEY] [BUCKET_NAME] [--id VIDEO_ID]');
  console.log('Example: node scripts/upload_to_b2.mjs --id vid_1794660415937_sltmtar');
  console.log('Or configure B2_KEY_ID and B2_APPLICATION_KEY in .env.local\n');
  process.exit(1);
}

const dbPath = path.join(rootDir, 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const video = db.find((v) => v.id === targetVideoId);

if (!video) {
  console.error(`\n[Error] Video ID "${targetVideoId}" not found in database!`);
  process.exit(1);
}

const targetObjectKey = video.storageKey || `videos/${targetVideoId}/${video.originalFileName}`;
const candidateFiles = [
  video.storagePath,
  path.join(rootDir, 'data', 'videos', `${targetVideoId}_web_compatible.mp4`),
  path.join(rootDir, 'data', 'videos', `${targetVideoId}_${video.originalFileName}`),
  path.join(rootDir, 'data', 'videos', `${targetVideoId}_The_Garden_of_Words_-_Anime_Salt.mp4`),
  path.join(rootDir, 'data', 'videos', `${targetVideoId}_Never.Ending.Summer.S01E03._DRAMAKEY.COM_.mkv`),
].filter(Boolean);

let localFilePath = null;
for (const p of candidateFiles) {
  if (fs.existsSync(p)) {
    localFilePath = p;
    break;
  }
}

if (!localFilePath) {
  console.error(`\n[Error] Local file for ${targetVideoId} not found in data/videos/!`);
  console.error(`Checked paths:`, candidateFiles);
  process.exit(1);
}

const stat = fs.statSync(localFilePath);
console.log(`\n==================================================`);
console.log(`Backblaze B2 Video Sync Tool`);
console.log(`==================================================`);
console.log(`Video ID:        ${targetVideoId}`);
console.log(`Title:           ${video.title}`);
console.log(`Target Key:      ${targetObjectKey}`);
console.log(`Bucket Name:     ${bucketName}`);
console.log(`Local File:      ${path.basename(localFilePath)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`B2 Endpoint:     ${endpoint}`);
console.log(`==================================================\n`);

const client = new S3Client({
  endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
  region: region,
  credentials: {
    accessKeyId: keyId,
    secretAccessKey: applicationKey,
  },
  forcePathStyle: true,
});

async function run() {
  try {
    console.log(`[1/3] Uploading file stream to B2... Please wait.`);
    const fileStream = fs.createReadStream(localFilePath);

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: targetObjectKey,
      Body: fileStream,
      ContentLength: stat.size,
      ContentType: video.mimeType || 'video/mp4',
    });

    await client.send(uploadCommand);
    console.log(`[Success] File uploaded successfully!`);

    console.log(`[2/3] Verifying object existence with HeadObject...`);
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: targetObjectKey,
    });
    const headRes = await client.send(headCommand);

    console.log(`[Verification Succeeded]`);
    console.log(`- Stored Object Key: ${targetObjectKey}`);
    console.log(`- Remote File Size:  ${headRes.ContentLength} bytes`);
    console.log(`- ETag:              ${headRes.ETag}`);

    console.log(`[3/3] Updating local database status to "ready"...`);
    video.status = 'ready';
    video.cloudProvider = 'aws';
    video.b2BucketName = bucketName;
    video.cloudStorageLocation = `b2://${bucketName}/${targetObjectKey}`;
    video.fileSizeBytes = headRes.ContentLength || stat.size;
    video.fileSizeDisplay = `${(video.fileSizeBytes / 1024 / 1024).toFixed(2)} MB`;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

    console.log(`\nAll done! Video "${video.title}" is now verified and ready in Backblaze B2!\n`);
  } catch (err) {
    console.error('[Upload Failed]:', err);
    process.exit(1);
  }
}

run();
