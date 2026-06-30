import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getJobById, getCVProfile, createInterviewSession } from '@/lib/db';
import { generateInterviewQuestions } from '@/lib/agents/interview-agent';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { job_id, type } = await request.json();

    const job = getJobById(job_id);
    const cv = getCVProfile(user.userId);

    if (!job || !cv) {
      return NextResponse.json({ success: false, error: 'Job or CV not found' }, { status: 404 });
    }

    const messages = await generateInterviewQuestions(job, cv.structured_data, type);
    const session = createInterviewSession(user.userId, job_id, type, messages);

    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
