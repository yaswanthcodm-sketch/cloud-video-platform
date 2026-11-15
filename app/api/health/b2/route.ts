import { NextResponse } from 'next/server';
import { checkB2Health } from '@/lib/b2Client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await checkB2Health();
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'unconfigured' ? 200 : 503;
  return NextResponse.json(result, { status: statusCode });
}
