// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
import mammoth from 'mammoth';
import { askJSON } from '../groq';
import type { ParsedCV } from '../types';

export async function parseCV(fileBuffer: Buffer, fileType: 'pdf' | 'docx'): Promise<{ rawText: string; structured: ParsedCV }> {
  let rawText = '';
  
  if (fileType === 'pdf') {
    try {
      const data = await pdfParse(fileBuffer);
      rawText = data.text;
    } catch (pdfErr: any) {
      console.error('PDF parse error:', pdfErr.message);
      rawText = fileBuffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  } else if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    rawText = result.value;
  } else {
    throw new Error('Unsupported file type');
  }

  const prompt = `
    Extract the following information from the provided CV text.
    Format the output as a JSON object matching this TypeScript interface:
    {
      "name": "string",
      "email": "string",
      "phone": "string",
      "summary": "string",
      "skills": ["string"],
      "experience": [
        {
          "company": "string",
          "role": "string",
          "duration": "string",
          "description": "string"
        }
      ],
      "education": [
        {
          "institution": "string",
          "degree": "string",
          "field": "string",
          "year": "string"
        }
      ],
      "certifications": ["string"]
    }

    CV Text:
    ${rawText.substring(0, 15000)} // Truncate to avoid context limit
  `;

  const structured = await askJSON<ParsedCV>(prompt, "You are a professional HR assistant. Extract CV details accurately and return ONLY valid JSON.");

  return { rawText, structured };
}
