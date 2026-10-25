import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { askJSON } from '@/lib/groq';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

export interface LinkedInAnalysis {
  score: number; // 0-100 overall profile strength
  headline_score: number;
  about_score: number;
  experience_score: number;
  skills_score: number;
  completeness_score: number;
  strengths: string[];
  missing_sections: string[];
  improvements: string[];
  keyword_gaps: string[];
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const contentType = request.headers.get('content-type') || '';

    let profileText = '';

    if (contentType.includes('multipart/form-data')) {
      // PDF upload path
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf') {
        return NextResponse.json({ success: false, error: 'Only PDF files are supported. Please export your LinkedIn profile as a PDF.' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const parsed = await pdfParse(buffer);
        profileText = parsed.text;
      } catch {
        return NextResponse.json({ success: false, error: 'Could not parse the PDF. Please make sure it is a valid LinkedIn PDF export.' }, { status: 400 });
      }
    } else {
      // Plain text paste path
      const body = await request.json();
      profileText = body.text || '';
    }

    if (!profileText || profileText.trim().length < 50) {
      return NextResponse.json({ success: false, error: 'Profile content is too short to analyze. Please provide more details.' }, { status: 400 });
    }

    const analysis = await askJSON<LinkedInAnalysis>(
      `You are an expert LinkedIn profile coach and career advisor. Analyze the following LinkedIn profile text and return a detailed JSON analysis.

LinkedIn Profile Text:
---
${profileText.slice(0, 6000)}
---

Return a JSON object with exactly these fields:
{
  "score": <integer 0-100, overall profile strength>,
  "headline_score": <integer 0-100, quality of headline/title>,
  "about_score": <integer 0-100, quality of About/Summary section, 0 if missing>,
  "experience_score": <integer 0-100, quality and detail of work experience>,
  "skills_score": <integer 0-100, skills section completeness>,
  "completeness_score": <integer 0-100, overall profile completeness>,
  "strengths": [<array of 2-4 specific strengths as strings>],
  "missing_sections": [<array of missing or weak sections, e.g. "No About/Summary section", "No profile photo mentioned", "Missing certifications">],
  "improvements": [<array of exactly 5 specific, actionable improvement tips as strings>],
  "keyword_gaps": [<array of 4-6 industry keywords or skills that appear missing from the profile based on their experience>],
  "summary": "<2-3 sentence professional assessment of this profile>"
}

Be specific and actionable. Base scores on real LinkedIn best practices.`,
      'You are a professional LinkedIn profile coach returning only valid JSON.',
      { temperature: 0.3, maxTokens: 1500 }
    );

    return NextResponse.json({ success: true, data: analysis });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('LinkedIn analysis error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
