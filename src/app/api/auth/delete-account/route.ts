import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { deleteUser } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    
    // Perform cascading deletion
    await deleteUser(authUser.userId);

    const response = NextResponse.json({ success: true, message: 'Account and all associated records deleted successfully' });
    
    // Delete authentication cookie
    response.cookies.delete('auth_token');

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
