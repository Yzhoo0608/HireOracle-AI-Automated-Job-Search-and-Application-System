import { getApplicationsByUser, getDashboardStats } from '../db';
import type { Application, ApplicationStatus, DashboardStats } from '../types';

export async function getApplicationPipeline(userId: string): Promise<Record<ApplicationStatus, Application[]>> {
  const applications = getApplicationsByUser(userId);
  
  const pipeline: Record<ApplicationStatus, Application[]> = {
    applied: [],
    under_review: [],
    interview_scheduled: [],
    rejected: [],
    offer_received: []
  };

  for (const app of applications) {
    if (pipeline[app.status]) {
      pipeline[app.status].push(app);
    }
  }

  return pipeline;
}

export async function generateApplicationStats(userId: string): Promise<DashboardStats> {
  // We can just rely on the existing db.ts function which already aggregates this nicely
  return getDashboardStats(userId);
}
