import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/backend/auth';
import { getInterviewSession, updateInterviewSession } from '@/backend/db';
import { evaluateAnswer, generateFinalReport } from '@/backend/agents/interview-agent';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { session_id, answer, conclude_early } = await request.json();

    const session = await getInterviewSession(session_id);

    if (!session || session.user_id !== user.userId) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const sessionLanguage = session.language || 'en';

    // Handle early conclusion of the interview
    if (conclude_early) {
      if (answer && typeof answer === 'string' && answer.trim().length > 0) {
        const lastQuestion = session.messages.slice().reverse().find(m => m.role === 'interviewer')?.content || '';
        session.messages.push({ role: 'candidate', content: answer.trim() });
        
        let evaluation;
        if (session.job) {
          evaluation = await evaluateAnswer(session.job, lastQuestion, answer.trim(), session.type, sessionLanguage);
        } else {
          evaluation = { score: 5, feedback: 'Feedback generated', nextQuestion: '' };
        }
        session.messages[session.messages.length - 1].score = evaluation.score;
        session.messages[session.messages.length - 1].feedback = evaluation.feedback;
      }

      let overallScore: number | null = null;
      let finalFeedback = session.feedback || '';

      if (session.job && !finalFeedback) {
        const report = await generateFinalReport(session.job, session.messages, session.type, sessionLanguage);
        finalFeedback = JSON.stringify({
          summary: report.overallSummary,
          recommendations: report.recommendations,
        });
      }

      const hasSystemEnd = session.messages.some(m => m.role === 'system' && m.content.toLowerCase().includes('concluded'));
      if (!hasSystemEnd) {
        session.messages.push({
          role: 'system',
          content: 'Interview completed.',
        });
      }

      const scores = session.messages.filter(m => m.score !== undefined).map(m => m.score as number);
      overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      session.feedback = finalFeedback;
      session.overall_score = overallScore;

      await updateInterviewSession(session.id, session.messages, overallScore, finalFeedback);
      return NextResponse.json({ success: true, data: session });
    }

    // Normal interview response flow
    const lastQuestion = session.messages.slice().reverse().find(m => m.role === 'interviewer')?.content || '';
    
    // Add user answer
    session.messages.push({ role: 'candidate', content: answer });

    let evaluation;
    if (session.job) {
       evaluation = await evaluateAnswer(session.job, lastQuestion, answer, session.type, sessionLanguage);
    } else {
       evaluation = { score: 5, feedback: 'Job not found, generic feedback', nextQuestion: 'Next question?' };
    }

    // Update last message with score and feedback
    session.messages[session.messages.length - 1].score = evaluation.score;
    session.messages[session.messages.length - 1].feedback = evaluation.feedback;

    // Count candidate answers
    const answersCount = session.messages.filter(m => m.role === 'candidate').length;
    let overallScore = null;
    let finalFeedback = '';

    if (answersCount < 5) {
      // Add next question
      session.messages.push({ role: 'interviewer', content: evaluation.nextQuestion });
    } else {
      // Generate final report
      if (session.job) {
        const report = await generateFinalReport(session.job, session.messages, session.type, sessionLanguage);
        finalFeedback = JSON.stringify({
          summary: report.overallSummary,
          recommendations: report.recommendations
        });
      }
      
      // Add system message
      session.messages.push({
        role: 'system',
        content: 'Interview completed.'
      });
    }

    // Recalculate overall score
    const scores = session.messages.filter(m => m.score !== undefined).map(m => m.score as number);
    overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    session.feedback = finalFeedback;
    session.overall_score = overallScore;

    await updateInterviewSession(session.id, session.messages, overallScore, finalFeedback);

    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
