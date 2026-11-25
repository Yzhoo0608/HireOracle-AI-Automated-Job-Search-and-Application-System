import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { getInterviewSessionsByUser, deleteInterviewSession } from '@/backend/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const sessions = await getInterviewSessionsByUser(user.userId);
    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    let id = url.searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // no body
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 });
    }

    const success = await deleteInterviewSession(id, user.userId);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Session not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Session deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
