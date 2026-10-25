import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { checkCompanyReplies } from '@/lib/agents/reply-agent';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    
    const result = await checkCompanyReplies(authUser.userId);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
