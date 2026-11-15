import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

export interface B2Config {
  keyId: string;
  applicationKey: string;
  bucketName: string;
  endpoint: string;
  region: string;
}

let runtimeConfig: Partial<B2Config> | null = null;

function loadStoredConfig(): Partial<B2Config> {
  if (runtimeConfig) return runtimeConfig;
  const paths = [
    path.join(process.cwd(), 'data', 'b2_config.json'),
    '/tmp/b2_config.json',
  ];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          runtimeConfig = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return {};
}

export function saveStoredConfig(cfg: Partial<B2Config>) {
  runtimeConfig = { ...(runtimeConfig || {}), ...cfg };
  const paths = [
    path.join(process.cwd(), 'data', 'b2_config.json'),
    '/tmp/b2_config.json',
  ];
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(runtimeConfig, null, 2), 'utf8');
    } catch {}
  }
}

export function getB2Config(): B2Config {
  const stored = loadStoredConfig();
  return {
    keyId: process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY_ID || stored.keyId || '',
    applicationKey: process.env.B2_APPLICATION_KEY || stored.applicationKey || '',
    bucketName: process.env.B2_BUCKET_NAME || stored.bucketName || 'video-vault-user',
    endpoint: process.env.B2_ENDPOINT || stored.endpoint || 's3.us-east-005.backblazeb2.com',
    region: process.env.B2_REGION || stored.region || 'us-east-005',
  };
}

export function isB2Configured(): boolean {
  const cfg = getB2Config();
  return Boolean(cfg.keyId && cfg.applicationKey && cfg.bucketName);
}

export function getS3Client(): S3Client {
  const cfg = getB2Config();
  const rawEndpoint = cfg.endpoint.startsWith('http')
    ? cfg.endpoint
    : `https://${cfg.endpoint}`;

  return new S3Client({
    endpoint: rawEndpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.keyId,
      secretAccessKey: cfg.applicationKey,
    },
    forcePathStyle: true,
  });
}

/**
 * Initialize a multipart upload session in Backblaze B2
 */
export async function initB2MultipartUpload(
  bucketName: string,
  storageKey: string,
  contentType = 'video/mp4',
  metadata?: Record<string, string>
) {
  const client = getS3Client();
  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: storageKey,
    ContentType: contentType,
    Metadata: metadata,
  });

  const response = await client.send(command);
  if (!response.UploadId) {
    throw new Error('Failed to obtain UploadId from Backblaze B2');
  }

  return response.UploadId;
}

/**
 * Generate an authorized pre-signed URL for direct browser PUT upload of a single part
 */
export async function getB2PartUploadUrl(
  bucketName: string,
  storageKey: string,
  uploadId: string,
  partNumber: number,
  expiresInSeconds = 3600
): Promise<string> {
  const client = getS3Client();
  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: storageKey,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Finalize and complete multipart upload in Backblaze B2
 */
export async function completeB2MultipartUpload(
  bucketName: string,
  storageKey: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
) {
  const client = getS3Client();
  // Ensure parts are sorted strictly in ascending order by PartNumber
  const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: storageKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: sortedParts,
    },
  });

  return await client.send(command);
}

/**
 * Generate an authorized pre-signed URL for direct browser GET playback of private videos
 */
export async function getB2DownloadSignedUrl(
  bucketName: string,
  storageKey: string,
  expiresInSeconds = 21600 // 6 hours
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Fetch object metadata from Backblaze B2 to verify existence and byte size
 */
export async function getB2ObjectMetadata(
  bucketName: string,
  storageKey: string
) {
  const client = getS3Client();
  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
  });

  return await client.send(command);
}

/**
 * Stream an object directly from Backblaze B2 with optional HTTP Range header
 */
export async function getB2ObjectStream(
  bucketName: string,
  storageKey: string,
  range?: string | null
) {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: storageKey,
    Range: range || undefined,
  });

  return await client.send(command);
}

/**
 * Delete an object permanently from Backblaze B2 Cloud Storage
 */
export async function deleteB2Object(bucketName: string, storageKey: string) {
  try {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });
    return await client.send(command);
  } catch (err) {
    console.warn('Failed to delete object from Backblaze B2:', err);
  }
}

/**
 * Abort a multipart upload in Backblaze B2 if cancelled or failed
 */
export async function abortB2MultipartUpload(
  bucketName: string,
  storageKey: string,
  uploadId: string
) {
  try {
    const client = getS3Client();
    const command = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: storageKey,
      UploadId: uploadId,
    });
    return await client.send(command);
  } catch (err) {
    console.warn('Failed to abort multipart upload in B2:', err);
  }
}

export interface B2HealthResult {
  status: 'healthy' | 'unhealthy' | 'unconfigured';
  configured: boolean;
  authSuccess: boolean;
  bucketAccessible: boolean;
  bucketName: string;
  endpoint: string;
  region: string;
  canListObjects: boolean;
  canSignUrls: boolean;
  sampleKeyTested?: string;
  sampleSignedUrlGenerated: boolean;
  error?: string;
}

/**
 * Backend health check verifying Backblaze B2 authentication, bucket access,
 * object listing, and presigned playback URL generation without exposing secrets.
 */
export async function checkB2Health(): Promise<B2HealthResult> {
  const cfg = getB2Config();
  if (!isB2Configured()) {
    return {
      status: 'unconfigured',
      configured: false,
      authSuccess: false,
      bucketAccessible: false,
      bucketName: cfg.bucketName || 'video-vault-user',
      endpoint: cfg.endpoint,
      region: cfg.region,
      canListObjects: false,
      canSignUrls: false,
      sampleSignedUrlGenerated: false,
      error: 'B2_KEY_ID or B2_APPLICATION_KEY not configured on server',
    };
  }

  try {
    const client = getS3Client();
    // 1. Test B2 authentication and bucket access via ListObjectsV2
    const listCmd = new ListObjectsV2Command({
      Bucket: cfg.bucketName,
      MaxKeys: 5,
    });
    const listRes = await client.send(listCmd);
    const objects = listRes.Contents || [];
    const sampleKey = objects.length > 0 && objects[0].Key ? objects[0].Key : `health-check/probe_${Date.now()}.mp4`;

    // 2. Test presigned URL generation for playback
    let canSignUrls = false;
    let signedUrlGen = false;
    try {
      const getCmd = new GetObjectCommand({
        Bucket: cfg.bucketName,
        Key: sampleKey,
      });
      const url = await getSignedUrl(client, getCmd, { expiresIn: 300 });
      if (url && url.startsWith('http')) {
        canSignUrls = true;
        signedUrlGen = true;
      }
    } catch (signErr) {
      console.warn('Health check: failed to generate signed URL:', signErr);
    }

    return {
      status: 'healthy',
      configured: true,
      authSuccess: true,
      bucketAccessible: true,
      bucketName: cfg.bucketName,
      endpoint: cfg.endpoint,
      region: cfg.region,
      canListObjects: true,
      canSignUrls,
      sampleKeyTested: sampleKey,
      sampleSignedUrlGenerated: signedUrlGen,
    };
  } catch (err: any) {
    let cleanMsg = err.message || 'Backblaze B2 connection failed';
    if (cfg.applicationKey) cleanMsg = cleanMsg.replaceAll(cfg.applicationKey, '***');
    if (cfg.keyId) cleanMsg = cleanMsg.replaceAll(cfg.keyId, '***');

    return {
      status: 'unhealthy',
      configured: true,
      authSuccess: false,
      bucketAccessible: false,
      bucketName: cfg.bucketName,
      endpoint: cfg.endpoint,
      region: cfg.region,
      canListObjects: false,
      canSignUrls: false,
      sampleSignedUrlGenerated: false,
      error: cleanMsg,
    };
  }
}
