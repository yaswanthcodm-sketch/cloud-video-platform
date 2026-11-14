import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest, ADMIN_EMAIL } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const isAdmin = verifyAdminRequest(req);

  if (isAdmin) {
    return NextResponse.json({
      isAuthenticated: true,
      user: {
        email: ADMIN_EMAIL,
        role: 'admin',
      },
    });
  }

  return NextResponse.json({
    isAuthenticated: false,
    user: null,
  });
}
