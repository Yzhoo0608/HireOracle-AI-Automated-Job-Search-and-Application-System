// ============================================================
// PostgreSQL Database Layer — All CRUD Operations
// ============================================================

import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import type {
  User,
  UserPreferences,
  CVProfile,
  ParsedCV,
  Job,
  JobRequirements,
  JobMatch,
  Application,
  ApplicationStatus,
  EmailLog,
  InterviewSession,
  InterviewMessage,
  DashboardStats,
} from './types';

// ── Database Singleton ──────────────────────────────────────

let _pool: Pool | null = null;

export function getDb(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    _pool = new Pool({ connectionString });
  }
  return _pool;
}

// ── Schema Initialization ───────────────────────────────────

export async function initializeDatabase() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      preferences TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cv_profiles (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      raw_text TEXT DEFAULT '',
      structured_data TEXT DEFAULT '{}',
      file_path TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id VARCHAR(255) PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT DEFAULT '',
      location TEXT DEFAULT '',
      description TEXT DEFAULT '',
      requirements TEXT DEFAULT '{}',
      salary_range TEXT DEFAULT '',
      url TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      posted_date TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_matches (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      job_id VARCHAR(255) NOT NULL,
      overall_score DOUBLE PRECISION DEFAULT 0,
      skill_score DOUBLE PRECISION DEFAULT 0,
      experience_score DOUBLE PRECISION DEFAULT 0,
      location_score DOUBLE PRECISION DEFAULT 0,
      preference_score DOUBLE PRECISION DEFAULT 0,
      skill_gaps TEXT DEFAULT '[]',
      recommendations TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      job_id VARCHAR(255) NOT NULL,
      company_name TEXT DEFAULT '',
      job_title TEXT DEFAULT '',
      status TEXT DEFAULT 'applied',
      cover_letter TEXT DEFAULT '',
      email_sent_to TEXT DEFAULT '',
      date_applied TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      follow_up_date TIMESTAMP DEFAULT NULL,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      application_id VARCHAR(255) DEFAULT NULL,
      to_email TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      body TEXT DEFAULT '',
      status TEXT DEFAULT 'sent',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      job_id VARCHAR(255) DEFAULT NULL,
      type TEXT DEFAULT 'hr',
      messages TEXT DEFAULT '[]',
      overall_score DOUBLE PRECISION DEFAULT NULL,
      feedback TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cv_user ON cv_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_matches_user ON job_matches(user_id);
    CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_email_user ON email_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_sessions(user_id);
  `);
}

// ── User Operations ─────────────────────────────────────────

export async function createUser(email: string, passwordHash: string, name: string): Promise<User> {
  const db = getDb();
  const id = uuid();
  await db.query(
    'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
    [id, email, passwordHash, name]
  );
  const user = await getUserById(id);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows.length ? deserializeUser(result.rows[0]) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows.length ? deserializeUser(result.rows[0]) : null;
}

export async function updateUserPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  const db = getDb();
  await db.query('UPDATE users SET preferences = $1 WHERE id = $2', [
    JSON.stringify(prefs),
    userId
  ]);
}

function deserializeUser(row: Record<string, any>): User {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    name: row.name,
    preferences: row.preferences ? (typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences) : null,
    created_at: row.created_at,
    is_active: row.is_active === 1 || row.is_active === true,
  };
}

// ── CV Profile Operations ───────────────────────────────────

export async function createCVProfile(
  userId: string,
  rawText: string,
  structuredData: ParsedCV,
  filePath: string
): Promise<CVProfile> {
  const db = getDb();
  const id = uuid();
  await db.query('DELETE FROM cv_profiles WHERE user_id = $1', [userId]);
  await db.query(
    'INSERT INTO cv_profiles (id, user_id, raw_text, structured_data, file_path) VALUES ($1, $2, $3, $4, $5)',
    [id, userId, rawText, JSON.stringify(structuredData), filePath]
  );
  const profile = await getCVProfile(userId);
  if (!profile) throw new Error("Failed to create CV profile");
  return profile;
}

export async function getCVProfile(userId: string): Promise<CVProfile | null> {
  const db = getDb();
  const result = await db.query(
    'SELECT * FROM cv_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    raw_text: row.raw_text,
    structured_data: (typeof row.structured_data === 'string') ? JSON.parse(row.structured_data || '{}') : (row.structured_data || {}),
    file_path: row.file_path,
    created_at: row.created_at,
  };
}

// ── Job Operations ──────────────────────────────────────────

export function extractJobStreetId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(new RegExp('/job/(\\\\d+)', 'i'));
  return match ? match[1] : null;
}

export async function getJobByJobStreetId(jobStreetId: string): Promise<Job | null> {
  const db = getDb();
  const result = await db.query("SELECT * FROM jobs WHERE url LIKE $1", [`%/job/${jobStreetId}%`]);
  for (const row of result.rows) {
    const url = row.url;
    if (url) {
      const id = extractJobStreetId(url);
      if (id === jobStreetId) {
        return deserializeJob(row);
      }
    }
  }
  return null;
}

export async function createJob(job: Omit<Job, 'id' | 'created_at'>): Promise<Job> {
  const db = getDb();
  if (job.url) {
    const jobStreetId = extractJobStreetId(job.url);
    if (jobStreetId) {
      const existing = await getJobByJobStreetId(jobStreetId);
      if (existing) {
        return existing;
      }
    } else {
      const existing = await getJobByUrl(job.url);
      if (existing) {
        return existing;
      }
    }
  }
  const id = uuid();
  await db.query(
    `INSERT INTO jobs (id, title, company, location, description, requirements, salary_range, url, source, posted_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      job.title,
      job.company,
      job.location,
      job.description,
      JSON.stringify(job.requirements),
      job.salary_range,
      job.url,
      job.source,
      job.posted_date
    ]
  );
  const newJob = await getJobById(id);
  if (!newJob) throw new Error("Failed to create job");
  return newJob;
}

export async function getJobById(id: string): Promise<Job | null> {
  const db = getDb();
  const result = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
  return result.rows.length ? deserializeJob(result.rows[0]) : null;
}

export async function getJobByUrl(url: string): Promise<Job | null> {
  const db = getDb();
  const result = await db.query('SELECT * FROM jobs WHERE url = $1', [url]);
  return result.rows.length ? deserializeJob(result.rows[0]) : null;
}

export async function getAllJobs(limit = 100, offset = 0): Promise<Job[]> {
  const db = getDb();
  const result = await db.query(
    'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows.map(deserializeJob);
}

export async function searchJobs(query: string): Promise<Job[]> {
  const db = getDb();
  const pattern = `%${query}%`;
  const result = await db.query(
    `SELECT * FROM jobs WHERE title ILIKE $1 OR company ILIKE $2 OR description ILIKE $3 OR location ILIKE $4
     ORDER BY created_at DESC LIMIT 50`,
    [pattern, pattern, pattern, pattern]
  );
  return result.rows.map(deserializeJob);
}

export async function getJobsCreatedToday(userId: string): Promise<number> {
  const db = getDb();
  const result = await db.query(
    "SELECT COUNT(*) as count FROM job_matches WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE",
    [userId]
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

function deserializeJob(row: Record<string, any>): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    description: row.description,
    requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements || '{}') : (row.requirements || {}),
    salary_range: row.salary_range,
    url: row.url,
    source: row.source,
    posted_date: row.posted_date,
    created_at: row.created_at,
  };
}

// ── Job Match Operations ────────────────────────────────────

export async function createJobMatch(match: Omit<JobMatch, 'id' | 'created_at'>): Promise<JobMatch> {
  const db = getDb();
  const id = uuid();
  await db.query(
    `INSERT INTO job_matches 
     (id, user_id, job_id, overall_score, skill_score, experience_score, location_score, preference_score, skill_gaps, recommendations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, job_id) DO UPDATE SET
       overall_score = EXCLUDED.overall_score,
       skill_score = EXCLUDED.skill_score,
       experience_score = EXCLUDED.experience_score,
       location_score = EXCLUDED.location_score,
       preference_score = EXCLUDED.preference_score,
       skill_gaps = EXCLUDED.skill_gaps,
       recommendations = EXCLUDED.recommendations`,
    [
      id,
      match.user_id,
      match.job_id,
      match.overall_score,
      match.skill_score,
      match.experience_score,
      match.location_score,
      match.preference_score,
      JSON.stringify(match.skill_gaps),
      JSON.stringify(match.recommendations)
    ]
  );
  
  const result = await db.query('SELECT * FROM job_matches WHERE user_id = $1 AND job_id = $2', [match.user_id, match.job_id]);
  return deserializeMatch(result.rows[0]);
}

export async function getJobMatchById(id: string): Promise<JobMatch | null> {
  const db = getDb();
  const result = await db.query('SELECT * FROM job_matches WHERE id = $1', [id]);
  return result.rows.length ? deserializeMatch(result.rows[0]) : null;
}

export async function getJobMatchesByUser(userId: string, minScore = 0): Promise<JobMatch[]> {
  const db = getDb();
  const result = await db.query(
    `SELECT jm.*, j.title, j.company, j.location, j.description, j.requirements,
            j.salary_range, j.url, j.source, j.posted_date, j.created_at as job_created_at
     FROM job_matches jm
     JOIN jobs j ON jm.job_id = j.id
     WHERE jm.user_id = $1 AND jm.overall_score >= $2
     ORDER BY jm.overall_score DESC`,
    [userId, minScore]
  );
  return result.rows.map((row) => {
    const match = deserializeMatch(row);
    match.job = {
      id: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      description: row.description,
      requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements || '{}') : (row.requirements || {}),
      salary_range: row.salary_range,
      url: row.url,
      source: row.source,
      posted_date: row.posted_date,
      created_at: row.job_created_at,
    };
    return match;
  });
}

function deserializeMatch(row: Record<string, any>): JobMatch {
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    overall_score: row.overall_score,
    skill_score: row.skill_score,
    experience_score: row.experience_score,
    location_score: row.location_score,
    preference_score: row.preference_score,
    skill_gaps: typeof row.skill_gaps === 'string' ? JSON.parse(row.skill_gaps || '[]') : (row.skill_gaps || []),
    recommendations: typeof row.recommendations === 'string' ? JSON.parse(row.recommendations || '[]') : (row.recommendations || []),
    created_at: row.created_at,
  };
}

// ── Application Operations ──────────────────────────────────

export async function createApplication(app: Omit<Application, 'id' | 'created_at'>): Promise<Application> {
  const db = getDb();
  const id = uuid();
  await db.query(
    `INSERT INTO applications 
     (id, user_id, job_id, company_name, job_title, status, cover_letter, email_sent_to, date_applied, follow_up_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      app.user_id,
      app.job_id,
      app.company_name,
      app.job_title,
      app.status || 'applied',
      app.cover_letter,
      app.email_sent_to,
      app.date_applied || new Date().toISOString(),
      app.follow_up_date || null,
      app.notes || ''
    ]
  );
  const application = await getApplicationById(id);
  if (!application) throw new Error("Failed to create application");
  return application;
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const db = getDb();
  const result = await db.query(
    `SELECT a.*, j.title as j_title, j.company as j_company, j.location as j_location,
            j.description as j_description, j.url as j_url
     FROM applications a
     LEFT JOIN jobs j ON a.job_id = j.id
     WHERE a.id = $1`,
    [id]
  );
  
  if (!result.rows.length) return null;
  const row = result.rows[0];
  
  const app = deserializeApplication(row);
  if (row.j_title) {
    app.job = {
      id: row.job_id,
      title: row.j_title,
      company: row.j_company,
      location: row.j_location,
      description: row.j_description,
      requirements: { skills: [], experience_years: 0, education: '', other: [] },
      salary_range: '',
      url: row.j_url,
      source: '',
      posted_date: '',
      created_at: '',
    };
  }
  return app;
}

export async function getApplicationsByUser(userId: string): Promise<Application[]> {
  const db = getDb();
  const result = await db.query(
    `SELECT a.*, j.title as j_title, j.company as j_company, j.location as j_location,
            j.description as j_description, j.url as j_url
     FROM applications a
     LEFT JOIN jobs j ON a.job_id = j.id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC`,
    [userId]
  );
  return result.rows.map((row) => {
    const app = deserializeApplication(row);
    if (row.j_title) {
      app.job = {
        id: row.job_id,
        title: row.j_title,
        company: row.j_company,
        location: row.j_location,
        description: row.j_description,
        requirements: { skills: [], experience_years: 0, education: '', other: [] },
        salary_range: '',
        url: row.j_url,
        source: '',
        posted_date: '',
        created_at: '',
      };
    }
    return app;
  });
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
  const db = getDb();
  await db.query('UPDATE applications SET status = $1 WHERE id = $2', [status, id]);
}

export async function updateApplicationStatusAndNotes(id: string, status: ApplicationStatus, notes: string): Promise<void> {
  const db = getDb();
  await db.query('UPDATE applications SET status = $1, notes = $2 WHERE id = $3', [status, notes, id]);
}

export async function updateApplicationNotes(id: string, notes: string): Promise<void> {
  const db = getDb();
  await db.query('UPDATE applications SET notes = $1 WHERE id = $2', [notes, id]);
}

export async function checkDuplicateApplication(userId: string, jobId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.query(
    'SELECT COUNT(*) as count FROM applications WHERE user_id = $1 AND job_id = $2',
    [userId, jobId]
  );
  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

function deserializeApplication(row: Record<string, any>): Application {
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    company_name: row.company_name,
    job_title: row.job_title,
    status: row.status,
    cover_letter: row.cover_letter,
    email_sent_to: row.email_sent_to,
    date_applied: row.date_applied,
    follow_up_date: row.follow_up_date,
    notes: row.notes,
    created_at: row.created_at,
  };
}

// ── Email Log Operations ────────────────────────────────────

export async function createEmailLog(log: Omit<EmailLog, 'id' | 'sent_at'>): Promise<EmailLog> {
  const db = getDb();
  const id = uuid();
  await db.query(
    'INSERT INTO email_log (id, user_id, application_id, to_email, subject, body, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, log.user_id, log.application_id, log.to_email, log.subject, log.body, log.status]
  );
  return { ...log, id, sent_at: new Date().toISOString() };
}

export async function checkDuplicateEmail(userId: string, toEmail: string, subject: string): Promise<boolean> {
  const db = getDb();
  const result = await db.query(
    'SELECT COUNT(*) as count FROM email_log WHERE user_id = $1 AND to_email = $2 AND subject = $3',
    [userId, toEmail, subject]
  );
  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

export async function getEmailLogByApplication(applicationId: string): Promise<EmailLog[]> {
  const db = getDb();
  const result = await db.query(
    'SELECT * FROM email_log WHERE application_id = $1 ORDER BY sent_at DESC',
    [applicationId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    application_id: row.application_id,
    to_email: row.to_email,
    subject: row.subject,
    body: row.body,
    status: row.status as 'sent' | 'delivered' | 'failed',
    sent_at: row.sent_at,
  }));
}

// ── Interview Session Operations ────────────────────────────

export async function createInterviewSession(
  userId: string,
  jobId: string,
  type: 'hr' | 'technical',
  initialMessages: InterviewMessage[] = []
): Promise<InterviewSession> {
  const db = getDb();
  const id = uuid();
  await db.query(
    'INSERT INTO interview_sessions (id, user_id, job_id, type, messages) VALUES ($1, $2, $3, $4, $5)',
    [id, userId, jobId, type, JSON.stringify(initialMessages)]
  );
  const session = await getInterviewSession(id);
  if (!session) throw new Error("Failed to create interview session");
  return session;
}

export async function getInterviewSession(id: string): Promise<InterviewSession | null> {
  const db = getDb();
  const result = await db.query(
    `SELECT s.*, j.title, j.company, j.description
     FROM interview_sessions s
     LEFT JOIN jobs j ON s.job_id = j.id
     WHERE s.id = $1`,
    [id]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  const session = deserializeSession(row);
  if (row.title) {
    session.job = {
      id: row.job_id,
      title: row.title,
      company: row.company,
      location: '',
      description: row.description,
      requirements: { skills: [], experience_years: 0, education: '', other: [] },
      salary_range: '',
      url: '',
      source: '',
      posted_date: '',
      created_at: '',
    };
  }
  return session;
}

export async function updateInterviewSession(
  id: string,
  messages: InterviewMessage[],
  overallScore: number | null,
  feedback: string
): Promise<void> {
  const db = getDb();
  await db.query(
    'UPDATE interview_sessions SET messages = $1, overall_score = $2, feedback = $3 WHERE id = $4',
    [JSON.stringify(messages), overallScore, feedback, id]
  );
}

export async function getInterviewSessionsByUser(userId: string): Promise<InterviewSession[]> {
  const db = getDb();
  const result = await db.query(
    `SELECT s.*, j.title, j.company
     FROM interview_sessions s
     LEFT JOIN jobs j ON s.job_id = j.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId]
  );
  return result.rows.map((row) => {
    const session = deserializeSession(row);
    if (row.title) {
      session.job = {
        id: row.job_id,
        title: row.title,
        company: row.company,
        location: '',
        description: '',
        requirements: { skills: [], experience_years: 0, education: '', other: [] },
        salary_range: '',
        url: '',
        source: '',
        posted_date: '',
        created_at: '',
      };
    }
    return session;
  });
}

function deserializeSession(row: Record<string, any>): InterviewSession {
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    type: row.type as 'hr' | 'technical',
    messages: typeof row.messages === 'string' ? JSON.parse(row.messages || '[]') : (row.messages || []),
    overall_score: row.overall_score,
    feedback: row.feedback,
    created_at: row.created_at,
  };
}

// ── Dashboard Statistics ────────────────────────────────────

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const db = getDb();

  const total = await db.query(
    'SELECT COUNT(*) as count FROM applications WHERE user_id = $1',
    [userId]
  );

  const statusResult = await db.query(
    'SELECT status, COUNT(*) as count FROM applications WHERE user_id = $1 GROUP BY status',
    [userId]
  );

  const statusCounts: Record<string, number> = {
    applied: 0,
    under_review: 0,
    interview_scheduled: 0,
    rejected: 0,
    offer_received: 0,
  };
  for (const row of statusResult.rows) {
    statusCounts[row.status] = parseInt(row.count, 10);
  }

  const avgScoreRes = await db.query(
    'SELECT AVG(overall_score) as avg FROM job_matches WHERE user_id = $1',
    [userId]
  );

  const jobsToday = await getJobsCreatedToday(userId);

  const recent = (await getApplicationsByUser(userId)).slice(0, 50);

  const topMatches = (await getJobMatchesByUser(userId, 50)).slice(0, 5);

  return {
    total_applications: parseInt(total.rows[0]?.count || '0', 10),
    status_counts: statusCounts as Record<ApplicationStatus, number>,
    jobs_found_today: jobsToday,
    avg_match_score: Math.round((parseFloat(avgScoreRes.rows[0]?.avg || '0')) * 10) / 10,
    interviews_scheduled: statusCounts.interview_scheduled || 0,
    offers_received: statusCounts.offer_received || 0,
    recent_applications: recent,
    top_matches: topMatches,
  };
}

export async function getAcceptedJobMatches(userId: string): Promise<JobMatch[]> {
  const db = getDb();
  const result = await db.query(
    `SELECT jm.*, j.title, j.company, j.location, j.description, j.requirements,
            j.salary_range, j.url, j.source, j.posted_date, j.created_at as job_created_at
     FROM job_matches jm
     JOIN jobs j ON jm.job_id = j.id
     JOIN applications a ON a.job_id = j.id AND a.user_id = jm.user_id
     WHERE jm.user_id = $1 AND a.status = 'interview_scheduled'
     ORDER BY jm.overall_score DESC`,
    [userId]
  );
  
  return result.rows.map((row) => {
    const match = deserializeMatch(row);
    match.job = {
      id: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      description: row.description,
      requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements || '{}') : (row.requirements || {}),
      salary_range: row.salary_range,
      url: row.url,
      source: row.source,
      posted_date: row.posted_date,
      created_at: row.job_created_at,
    };
    return match;
  });
}

export async function updateUserActiveStatus(userId: string, isActive: boolean): Promise<void> {
  const db = getDb();
  await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [
    isActive ? 1 : 0,
    userId
  ]);
}

export async function getUnmatchedJobsForUser(userId: string): Promise<Job[]> {
  const db = getDb();
  const result = await db.query(`
    SELECT * FROM jobs 
    WHERE id NOT IN (SELECT job_id FROM job_matches WHERE user_id = $1)
    ORDER BY created_at DESC
  `, [userId]);
  return result.rows.map(deserializeJob);
}

export async function hasAppliedToJob(userId: string, jobId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.query(
    'SELECT COUNT(*) as count FROM applications WHERE user_id = $1 AND job_id = $2',
    [userId, jobId]
  );
  return parseInt(result.rows[0]?.count || '0', 10) > 0;
}

export async function hasAppliedToCompanyAndTitle(userId: string, company: string, title: string): Promise<boolean> {
  const db = getDb();
  const result = await db.query('SELECT company_name, job_title FROM applications WHERE user_id = $1', [userId]);
  
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normCompany = norm(company);
  const normTitle = norm(title);
  
  for (const row of result.rows) {
    if (norm(row.company_name) === normCompany && norm(row.job_title) === normTitle) {
      return true;
    }
  }
  return false;
}

export async function hasAppliedToJobStreetId(userId: string, url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  const targetId = extractJobStreetId(url);
  if (!targetId) return false;

  const db = getDb();
  const result = await db.query(`
    SELECT j.url 
    FROM applications a 
    JOIN jobs j ON a.job_id = j.id 
    WHERE a.user_id = $1
  `, [userId]);

  for (const row of result.rows) {
    if (row.url) {
      const appJobStreetId = extractJobStreetId(row.url);
      if (appJobStreetId && appJobStreetId === targetId) {
        return true;
      }
    }
  }
  return false;
}
