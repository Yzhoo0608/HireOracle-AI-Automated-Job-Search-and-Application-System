import { NextResponse } from 'next/server';

// This endpoint is no longer used.
// Password reset is now handled via the temporary password flow:
// 1. POST /api/auth/forgot-password  → emails a temp password
// 2. POST /api/auth/change-password  → user sets new password after logging in with temp password
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'This endpoint is deprecated. Use the temporary password flow instead.' },
    { status: 410 }
  );
}
