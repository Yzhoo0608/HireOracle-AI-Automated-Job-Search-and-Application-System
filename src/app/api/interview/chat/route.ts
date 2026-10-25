import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getInterviewSession, updateInterviewSession } from '@/lib/db';
import { evaluateAnswer, generateFinalReport } from '@/lib/agents/interview-agent';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { session_id, answer } = await request.json();

    const session = await getInterviewSession(session_id);

    if (!session || session.user_id !== user.userId) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const lastQuestion = session.messages[session.messages.length - 1]?.content || '';
    
    // Add user answer
    session.messages.push({ role: 'candidate', content: answer });

    let evaluation;
    if (session.job) {
       evaluation = await evaluateAnswer(session.job, lastQuestion, answer, session.type);
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
        const report = await generateFinalReport(session.job, session.messages, session.type);
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
