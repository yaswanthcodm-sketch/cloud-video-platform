import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getB2Config, isB2Configured } from '@/lib/b2Client';
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

    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const setEnvVar = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
      process.env[key] = value;
    };

    if (keyId) setEnvVar('B2_KEY_ID', keyId.trim());
    if (applicationKey) setEnvVar('B2_APPLICATION_KEY', applicationKey.trim());
    if (bucketName) setEnvVar('B2_BUCKET_NAME', bucketName.trim());
    if (endpoint) setEnvVar('B2_ENDPOINT', endpoint.trim());
    if (region) setEnvVar('B2_REGION', region.trim());

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

    return NextResponse.json({
      success: true,
      message: 'Backblaze B2 configuration updated successfully',
      configured: isB2Configured(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
