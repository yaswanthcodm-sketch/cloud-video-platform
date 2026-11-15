import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getB2Config, isB2Configured, saveStoredConfig } from '@/lib/b2Client';
import { verifyAdminRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = getB2Config();
  return NextResponse.json({
    configured: isB2Configured(),
    bucketName: cfg.bucketName || '',
    endpoint: cfg.endpoint,
    region: cfg.region,
    hasKeyId: Boolean(cfg.keyId),
    hasApplicationKey: Boolean(cfg.applicationKey),
    maskedKeyId: cfg.keyId ? `${cfg.keyId.substring(0, 6)}...${cfg.keyId.slice(-4)}` : '',
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminRequest(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Administrator login required to change settings.' },
        { status: 401 }
      );
    }
    const { keyId, applicationKey, bucketName, endpoint, region } = await req.json();

    const cleanKeyId = keyId ? keyId.trim() : undefined;
    const cleanAppKey = applicationKey ? applicationKey.trim() : undefined;
    const cleanBucket = bucketName ? bucketName.trim() : undefined;
    const cleanEndpoint = endpoint ? endpoint.trim() : undefined;
    const cleanRegion = region ? region.trim() : undefined;

    // 1. Update in-memory and stored config cache
    saveStoredConfig({
      keyId: cleanKeyId,
      applicationKey: cleanAppKey,
      bucketName: cleanBucket,
      endpoint: cleanEndpoint,
      region: cleanRegion,
    });

    // 2. Set current process.env variables
    if (cleanKeyId) process.env.B2_KEY_ID = cleanKeyId;
    if (cleanAppKey) process.env.B2_APPLICATION_KEY = cleanAppKey;
    if (cleanBucket) process.env.B2_BUCKET_NAME = cleanBucket;
    if (cleanEndpoint) process.env.B2_ENDPOINT = cleanEndpoint;
    if (cleanRegion) process.env.B2_REGION = cleanRegion;

    // 3. Persist to .env.local if local filesystem allows writing
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      const setEnvVar = (k: string, v: string) => {
        const regex = new RegExp(`^${k}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${k}=${v}`);
        } else {
          envContent += `\n${k}=${v}`;
        }
      };

      if (cleanKeyId) setEnvVar('B2_KEY_ID', cleanKeyId);
      if (cleanAppKey) setEnvVar('B2_APPLICATION_KEY', cleanAppKey);
      if (cleanBucket) setEnvVar('B2_BUCKET_NAME', cleanBucket);
      if (cleanEndpoint) setEnvVar('B2_ENDPOINT', cleanEndpoint);
      if (cleanRegion) setEnvVar('B2_REGION', cleanRegion);

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    } catch (fsErr) {
      console.warn('Could not update .env.local on disk (running in read-only environment):', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Backblaze B2 configuration updated successfully',
      configured: isB2Configured(),
      bucketName: cleanBucket || getB2Config().bucketName,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
