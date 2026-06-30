import { askJSON } from '../groq';
import type { Job, ParsedCV, InterviewMessage } from '../types';

export async function generateInterviewQuestions(job: Job, cv: ParsedCV, type: 'hr' | 'technical'): Promise<InterviewMessage[]> {
  const prompt = `
    You are an expert interviewer preparing to interview a candidate for a ${type} round.
    Generate a list of 5 initial interview questions.
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

export async function evaluateAnswer(job: Job, question: string, answer: string, type: 'hr' | 'technical'): Promise<{ score: number; feedback: string; nextQuestion: string }> {
  const prompt = `
    Evaluate the candidate's answer to the interview question.
    Provide a score (1-10), constructive feedback, and the next question to ask.
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
