import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yaswanthcodm@gmail.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Doraemon@143';
export const AUTH_COOKIE_NAME = 'admin_session_token';
const SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'c4b8b67f139e728448d79a2961d2d1487ad0fbe38efd05903b22bbf585';

export interface AdminUser {
  email: string;
  role: 'admin';
}

/**
 * Validate admin login credentials
 */
export function validateAdminCredentials(email?: string, password?: string): boolean {
  if (!email || !password) return false;
  const cleanEmail = email.trim().toLowerCase();
  const targetEmail = ADMIN_EMAIL.trim().toLowerCase();
  return cleanEmail === targetEmail && password === ADMIN_PASSWORD;
}

/**
 * Create a cryptographically signed session token valid for 7 days
 */
export function createAdminToken(): string {
  const payload = JSON.stringify({
    email: ADMIN_EMAIL,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verify signed session token
 */
export function verifyAdminToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(payloadB64).digest('base64url');

  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (payload.role !== 'admin') return false;
    if (typeof payload.exp === 'number' && payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify whether an incoming NextRequest has valid admin authorization
 * Checks both HTTP-only cookie and Authorization: Bearer header
 */
export function verifyAdminRequest(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (verifyAdminToken(cookieToken)) return true;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (verifyAdminToken(bearerToken)) return true;
  }

  return false;
}
