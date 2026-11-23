import { askJSON } from '../groq';
import type { Job, ParsedCV, InterviewMessage } from '@/shared/types';

const LANGUAGE_PROMPT_NAMES: Record<string, string> = {
  en: 'English',
  ms: 'Bahasa Melayu (Malay)',
  zh: 'Mandarin Chinese (中文)',
};

function getLanguageInstruction(language: string = 'en'): string {
  const code = (language || 'en').toLowerCase().trim();
  const name = LANGUAGE_PROMPT_NAMES[code] || 'English';
  return `STRICT LANGUAGE REQUIREMENT: You MUST speak, generate all questions, evaluate, and provide all feedback entirely and exclusively in ${name}. Do NOT switch to any other language under any circumstance, even if the job description, company name, or candidate profile contains words in other languages.`;
}

export async function generateInterviewQuestions(
  job: Job,
  cv: ParsedCV,
  type: 'hr' | 'technical',
  language: string = 'en'
): Promise<InterviewMessage[]> {
  const langInstruction = getLanguageInstruction(language);
  const prompt = `
    You are an expert ${type === 'technical' ? 'Technical Lead' : 'HR Senior Recruiter'} preparing to interview a candidate for a ${type} round.
    Generate a list of 5 initial interview questions.
    ${langInstruction}

    Return JSON matching:
    {
      "questions": ["string"]
    }

    Job Title: ${job.title}
    Job Description: ${job.description}
    Candidate Name: ${cv.name}
    Candidate Skills: ${cv.skills.join(', ')}
  `;

  const result = await askJSON<any>(prompt, "You are a professional technical/HR interviewer. Return ONLY JSON.");
  
  const messages: InterviewMessage[] = [];
  messages.push({
    role: 'system',
    content: `Interview started for ${job.title} (${type} round).`
  });
  
  if (result.questions && result.questions.length > 0) {
    messages.push({
      role: 'interviewer',
      content: result.questions[0]
    });
  }

  return messages;
}

export async function evaluateAnswer(
  job: Job,
  question: string,
  answer: string,
  type: 'hr' | 'technical',
  language: string = 'en'
): Promise<{ score: number; feedback: string; nextQuestion: string }> {
  const langInstruction = getLanguageInstruction(language);
  const prompt = `
    Evaluate the candidate's answer to the interview question.
    Provide a score (1-10), constructive recruiter feedback, and the next interview question to ask.
    ${langInstruction}

    Return JSON matching:
    {
      "score": number,
      "feedback": "string",
      "nextQuestion": "string"
    }

    Job Title: ${job.title}
    Interview Type: ${type}
    Question Asked: ${question}
    Candidate Answer: ${answer}
  `;

  const result = await askJSON<any>(prompt, "You are a professional technical/HR interviewer. Return ONLY JSON.");

  return {
    score: result.score || 5,
    feedback: result.feedback || 'Good effort.',
    nextQuestion: result.nextQuestion || 'Could you tell me more about your experience?'
  };
}

export async function generateFinalReport(
  job: Job,
  messages: InterviewMessage[],
  type: 'hr' | 'technical',
  language: string = 'en'
): Promise<{ overallSummary: string; recommendations: string[] }> {
  // Extract questions and answers
  const QAs = [];
  let currentQ = '';
  for (const m of messages) {
    if (m.role === 'interviewer') {
      currentQ = m.content;
    } else if (m.role === 'candidate' && currentQ) {
      QAs.push({
        question: currentQ,
        answer: m.content,
        score: m.score,
        feedback: m.feedback
      });
      currentQ = '';
    }
  }

  const langInstruction = getLanguageInstruction(language);
  const prompt = `
    You are an expert hiring manager debriefing after a job interview.
    Review the full transcript of this interview (questions, answers, scores, and feedback for each answer) and generate:
    1. A detailed overall summary of the candidate's performance.
    2. A list of 3-4 specific, actionable recommendations for improvement.
    ${langInstruction}

    Job Title: ${job.title}
    Job Description: ${job.description}
    Interview Type: ${type}
    
    Transcript:
    ${JSON.stringify(QAs, null, 2)}

    Return ONLY a valid JSON object matching this structure:
    {
      "overallSummary": "string",
      "recommendations": ["string"]
    }
  `;

  try {
    const result = await askJSON<any>(prompt, "You are a professional hiring manager. Return ONLY JSON.");
    return {
      overallSummary: result.overallSummary || 'Interview completed successfully.',
      recommendations: result.recommendations || ['Continue practicing with different job profiles.']
    };
  } catch (err: any) {
    console.error('Failed to generate final report:', err.message);
    return {
      overallSummary: 'Interview completed. Great job practicing your skills!',
      recommendations: ['Review your answers and keep practicing.']
    };
  }
}
