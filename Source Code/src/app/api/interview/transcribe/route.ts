import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { transcribeAudio } from '@/backend/groq';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 });
    }

    const language = (formData.get('language') as string) || 'en';

    const text = await transcribeAudio(file, language);

    return NextResponse.json({ success: true, text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to transcribe audio' }, { status: 500 });
  }
}
