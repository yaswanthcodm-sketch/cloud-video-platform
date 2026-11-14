import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, createAdminToken, ADMIN_EMAIL, AUTH_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!validateAdminCredentials(email, password)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid administrator email or password.',
        },
        { status: 401 }
      );
    }

    const token = createAdminToken();

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        email: ADMIN_EMAIL,
        role: 'admin',
      },
    });

    // Set secure HTTP-only cookie for browser sessions (7 days)
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Login failed',
      },
      { status: 500 }
    );
  }
}
