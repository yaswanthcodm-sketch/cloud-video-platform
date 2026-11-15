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

const keyId = process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY_ID || process.argv[2];
const applicationKey = process.env.B2_APPLICATION_KEY || process.argv[3];
const bucketName = process.env.B2_BUCKET_NAME || process.argv[4] || 'video-vault-user';
const endpoint = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
const region = process.env.B2_REGION || 'us-east-005';

if (!keyId || !applicationKey) {
  console.error('\n[Error] Backblaze B2 credentials not found!');
  console.log('Usage: node scripts/upload_to_b2.mjs [B2_KEY_ID] [B2_APPLICATION_KEY] [BUCKET_NAME]');
  console.log('Or define B2_KEY_ID and B2_APPLICATION_KEY in .env.local\n');
  process.exit(1);
}

const client = new S3Client({
  endpoint: endpoint.startsWith('http') ? endpoint : `https://${endpoint}`,
  region: region,
  credentials: {
    accessKeyId: keyId,
    secretAccessKey: applicationKey,
  },
  forcePathStyle: true,
});

const targetVideoId = 'vid_1794660285563_sx3r3co';
const targetObjectKey = `videos/${targetVideoId}/Never.Ending.Summer.S01E03._DRAMAKEY.COM_.mkv`;
const candidateFiles = [
  path.join(rootDir, 'data', 'videos', `${targetVideoId}_web_compatible.mp4`),
  path.join(rootDir, 'data', 'videos', `${targetVideoId}_Never.Ending.Summer.S01E03._DRAMAKEY.COM_.mkv`),
];

let localFilePath = null;
for (const p of candidateFiles) {
  if (fs.existsSync(p)) {
    localFilePath = p;
    break;
  }
}

if (!localFilePath) {
  console.error(`\n[Error] Local file for ${targetVideoId} not found in data/videos/!`);
  process.exit(1);
}

const stat = fs.statSync(localFilePath);
console.log(`\n==================================================`);
console.log(`Backblaze B2 Video Sync Tool`);
console.log(`==================================================`);
console.log(`Video ID:        ${targetVideoId}`);
console.log(`Target Key:      ${targetObjectKey}`);
console.log(`Bucket Name:     ${bucketName}`);
console.log(`Local File:      ${path.basename(localFilePath)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`B2 Endpoint:     ${endpoint}`);
console.log(`==================================================\n`);

async function run() {
  try {
    console.log(`Uploading file stream to B2... Please wait.`);
    const fileStream = fs.createReadStream(localFilePath);

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: targetObjectKey,
      Body: fileStream,
      ContentLength: stat.size,
      ContentType: 'video/mp4',
    });

    await client.send(uploadCommand);
    console.log(`[Success] File uploaded successfully!`);

    console.log(`Verifying object existence with HeadObject...`);
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: targetObjectKey,
    });
    const headRes = await client.send(headCommand);

    console.log(`\n[Verification Succeeded]`);
    console.log(`- Stored Object Key: ${targetObjectKey}`);
    console.log(`- Remote File Size:  ${headRes.ContentLength} bytes`);
    console.log(`- ETag:              ${headRes.ETag}`);
    console.log(`- Content Type:      ${headRes.ContentType}`);
    console.log(`\nThe video is now live in Backblaze B2 and ready for streaming!\n`);
  } catch (err) {
    console.error('[Upload Failed]:', err);
    process.exit(1);
  }
}

run();
