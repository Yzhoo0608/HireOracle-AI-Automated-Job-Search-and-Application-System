import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { parseCV } from '@/lib/agents/cv-agent';
import { createCVProfile } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Save file
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, `${user.userId}-${Date.now()}.${fileType}`);
    await fs.writeFile(filePath, buffer);

    // Parse CV
    const parsed = await parseCV(buffer, fileType);
    
    // Save profile
    const profile = createCVProfile(user.userId, parsed.rawText, parsed.structured, filePath);

    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('[CV Upload Error]:', error.message, error.stack);
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
