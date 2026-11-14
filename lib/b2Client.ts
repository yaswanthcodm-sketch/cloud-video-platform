import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface B2Config {
  keyId: string;
  applicationKey: string;
  bucketName: string;
  endpoint: string;
  region: string;
}

export function getB2Config(): B2Config {
  return {
    keyId: process.env.B2_KEY_ID || process.env.B2_APPLICATION_KEY_ID || '',
    applicationKey: process.env.B2_APPLICATION_KEY || '',
    bucketName: process.env.B2_BUCKET_NAME || 'video-vault-user',
    endpoint: process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com',
    region: process.env.B2_REGION || 'us-east-005',
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
