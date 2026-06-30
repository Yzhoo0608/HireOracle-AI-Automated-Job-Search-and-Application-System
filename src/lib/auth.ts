// ============================================================
// Auth Utilities — JWT + bcrypt for multi-user support
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'auth_token';

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a password with its hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT token.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Get the authenticated user ID from the request cookies.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Get the authenticated user ID, throwing if not authenticated.
 */
export async function requireAuth(): Promise<JWTPayload> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Extract token from Authorization header as fallback.
 */
export function getTokenFromHeader(authHeader: string | null): JWTPayload | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}
