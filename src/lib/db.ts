// ============================================================
// SQLite Database Layer — All CRUD Operations
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
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

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = process.env.DATABASE_PATH || './data/database.sqlite';
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initializeDatabase(_db);
  }
  return _db;
}

// ── Schema Initialization ───────────────────────────────────

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      preferences TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cv_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      raw_text TEXT DEFAULT '',
      structured_data TEXT DEFAULT '{}',
      file_path TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT DEFAULT '',
      location TEXT DEFAULT '',
      description TEXT DEFAULT '',
      requirements TEXT DEFAULT '{}',
      salary_range TEXT DEFAULT '',
      url TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      posted_date TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_matches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      overall_score REAL DEFAULT 0,
      skill_score REAL DEFAULT 0,
      experience_score REAL DEFAULT 0,
      location_score REAL DEFAULT 0,
      preference_score REAL DEFAULT 0,
      skill_gaps TEXT DEFAULT '[]',
      recommendations TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      job_title TEXT DEFAULT '',
      status TEXT DEFAULT 'applied',
      cover_letter TEXT DEFAULT '',
      email_sent_to TEXT DEFAULT '',
      date_applied DATETIME DEFAULT CURRENT_TIMESTAMP,
      follow_up_date DATETIME DEFAULT NULL,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      application_id TEXT DEFAULT NULL,
      to_email TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      body TEXT DEFAULT '',
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT DEFAULT NULL,
      type TEXT DEFAULT 'hr',
      messages TEXT DEFAULT '[]',
      overall_score REAL DEFAULT NULL,
      feedback TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

export function createUser(email: string, passwordHash: string, name: string): User {
  const db = getDb();
  const id = uuid();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
  ).run(id, email, passwordHash, name);
  return getUserById(id)!;
}

export function getUserByEmail(email: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
  return row ? deserializeUser(row) : null;
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? deserializeUser(row) : null;
}

export function updateUserPreferences(userId: string, prefs: UserPreferences): void {
  const db = getDb();
  db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(
    JSON.stringify(prefs),
    userId
  );
}

function deserializeUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    password_hash: row.password_hash as string,
    name: row.name as string,
    preferences: row.preferences ? JSON.parse(row.preferences as string) : null,
    created_at: row.created_at as string,
  };
}

// ── CV Profile Operations ───────────────────────────────────

export function createCVProfile(
  userId: string,
  rawText: string,
  structuredData: ParsedCV,
  filePath: string
): CVProfile {
  const db = getDb();
  const id = uuid();
  // Delete any existing CV for this user (one CV per user)
  db.prepare('DELETE FROM cv_profiles WHERE user_id = ?').run(userId);
  db.prepare(
    'INSERT INTO cv_profiles (id, user_id, raw_text, structured_data, file_path) VALUES (?, ?, ?, ?, ?)'
  ).run(id, userId, rawText, JSON.stringify(structuredData), filePath);
  return getCVProfile(userId)!;
}

export function getCVProfile(userId: string): CVProfile | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM cv_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    raw_text: row.raw_text as string,
    structured_data: JSON.parse((row.structured_data as string) || '{}'),
    file_path: row.file_path as string,
    created_at: row.created_at as string,
  };
}

// ── Job Operations ──────────────────────────────────────────

export function createJob(job: Omit<Job, 'id' | 'created_at'>): Job {
  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO jobs (id, title, company, location, description, requirements, salary_range, url, source, posted_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
  );
  return getJobById(id)!;
}

export function getJobById(id: string): Job | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? deserializeJob(row) : null;
}

export function getAllJobs(limit = 100, offset = 0): Job[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM jobs ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as Record<string, unknown>[];
  return rows.map(deserializeJob);
}

export function searchJobs(query: string): Job[] {
  const db = getDb();
  const pattern = `%${query}%`;
  const rows = db.prepare(
    `SELECT * FROM jobs WHERE title LIKE ? OR company LIKE ? OR description LIKE ? OR location LIKE ?
     ORDER BY created_at DESC LIMIT 50`
  ).all(pattern, pattern, pattern, pattern) as Record<string, unknown>[];
  return rows.map(deserializeJob);
}

export function getJobsCreatedToday(): number {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM jobs WHERE date(created_at) = date('now')"
  ).get() as Record<string, unknown>;
  return (row?.count as number) || 0;
}

function deserializeJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    location: row.location as string,
    description: row.description as string,
    requirements: JSON.parse((row.requirements as string) || '{}'),
    salary_range: row.salary_range as string,
    url: row.url as string,
    source: row.source as string,
    posted_date: row.posted_date as string,
    created_at: row.created_at as string,
  };
}

// ── Job Match Operations ────────────────────────────────────

export function createJobMatch(match: Omit<JobMatch, 'id' | 'created_at'>): JobMatch {
  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT OR REPLACE INTO job_matches 
     (id, user_id, job_id, overall_score, skill_score, experience_score, location_score, preference_score, skill_gaps, recommendations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
  );
  return getJobMatchById(id)!;
}

export function getJobMatchById(id: string): JobMatch | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM job_matches WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? deserializeMatch(row) : null;
}

export function getJobMatchesByUser(userId: string, minScore = 0): JobMatch[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT jm.*, j.title, j.company, j.location, j.description, j.requirements,
            j.salary_range, j.url, j.source, j.posted_date, j.created_at as job_created_at
     FROM job_matches jm
     JOIN jobs j ON jm.job_id = j.id
     WHERE jm.user_id = ? AND jm.overall_score >= ?
     ORDER BY jm.overall_score DESC`
  ).all(userId, minScore) as Record<string, unknown>[];
  return rows.map((row) => {
    const match = deserializeMatch(row);
    match.job = {
      id: row.job_id as string,
      title: row.title as string,
      company: row.company as string,
      location: row.location as string,
      description: row.description as string,
      requirements: JSON.parse((row.requirements as string) || '{}'),
      salary_range: row.salary_range as string,
      url: row.url as string,
      source: row.source as string,
      posted_date: row.posted_date as string,
      created_at: row.job_created_at as string,
    };
    return match;
  });
}

function deserializeMatch(row: Record<string, unknown>): JobMatch {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    job_id: row.job_id as string,
    overall_score: row.overall_score as number,
    skill_score: row.skill_score as number,
    experience_score: row.experience_score as number,
    location_score: row.location_score as number,
    preference_score: row.preference_score as number,
    skill_gaps: JSON.parse((row.skill_gaps as string) || '[]'),
    recommendations: JSON.parse((row.recommendations as string) || '[]'),
    created_at: row.created_at as string,
  };
}

// ── Application Operations ──────────────────────────────────

export function createApplication(app: Omit<Application, 'id' | 'created_at'>): Application {
  const db = getDb();
  const id = uuid();
  db.prepare(
    `INSERT INTO applications 
     (id, user_id, job_id, company_name, job_title, status, cover_letter, email_sent_to, date_applied, follow_up_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
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
  );
  return getApplicationById(id)!;
}

export function getApplicationById(id: string): Application | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? deserializeApplication(row) : null;
}

export function getApplicationsByUser(userId: string): Application[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT a.*, j.title as j_title, j.company as j_company, j.location as j_location,
            j.description as j_description, j.url as j_url
     FROM applications a
     LEFT JOIN jobs j ON a.job_id = j.id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`
  ).all(userId) as Record<string, unknown>[];
  return rows.map((row) => {
    const app = deserializeApplication(row);
    if (row.j_title) {
      app.job = {
        id: row.job_id as string,
        title: row.j_title as string,
        company: row.j_company as string,
        location: row.j_location as string,
        description: row.j_description as string,
        requirements: { skills: [], experience_years: 0, education: '', other: [] },
        salary_range: '',
        url: row.j_url as string,
        source: '',
        posted_date: '',
        created_at: '',
      };
    }
    return app;
  });
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): void {
  const db = getDb();
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id);
}

export function checkDuplicateApplication(userId: string, jobId: string): boolean {
  const db = getDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND job_id = ?'
  ).get(userId, jobId) as Record<string, unknown>;
  return ((row?.count as number) || 0) > 0;
}

function deserializeApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    job_id: row.job_id as string,
    company_name: row.company_name as string,
    job_title: row.job_title as string,
    status: row.status as ApplicationStatus,
    cover_letter: row.cover_letter as string,
    email_sent_to: row.email_sent_to as string,
    date_applied: row.date_applied as string,
    follow_up_date: row.follow_up_date as string,
    notes: row.notes as string,
    created_at: row.created_at as string,
  };
}

// ── Email Log Operations ────────────────────────────────────

export function createEmailLog(log: Omit<EmailLog, 'id' | 'sent_at'>): EmailLog {
  const db = getDb();
  const id = uuid();
  db.prepare(
    'INSERT INTO email_log (id, user_id, application_id, to_email, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, log.user_id, log.application_id, log.to_email, log.subject, log.body, log.status);
  return { ...log, id, sent_at: new Date().toISOString() };
}

export function checkDuplicateEmail(userId: string, toEmail: string, subject: string): boolean {
  const db = getDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM email_log WHERE user_id = ? AND to_email = ? AND subject = ?'
  ).get(userId, toEmail, subject) as Record<string, unknown>;
  return ((row?.count as number) || 0) > 0;
}

export function getEmailLogByApplication(applicationId: string): EmailLog[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM email_log WHERE application_id = ? ORDER BY sent_at DESC'
  ).all(applicationId) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    application_id: row.application_id as string,
    to_email: row.to_email as string,
    subject: row.subject as string,
    body: row.body as string,
    status: row.status as 'sent' | 'delivered' | 'failed',
    sent_at: row.sent_at as string,
  }));
}

// ── Interview Session Operations ────────────────────────────

export function createInterviewSession(
  userId: string,
  jobId: string,
  type: 'hr' | 'technical',
  initialMessages: InterviewMessage[] = []
): InterviewSession {
  const db = getDb();
  const id = uuid();
  db.prepare(
    'INSERT INTO interview_sessions (id, user_id, job_id, type, messages) VALUES (?, ?, ?, ?, ?)'
  ).run(id, userId, jobId, type, JSON.stringify(initialMessages));
  return getInterviewSession(id)!;
}

export function getInterviewSession(id: string): InterviewSession | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT s.*, j.title, j.company, j.description
     FROM interview_sessions s
     LEFT JOIN jobs j ON s.job_id = j.id
     WHERE s.id = ?`
  ).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const session = deserializeSession(row);
  if (row.title) {
    session.job = {
      id: row.job_id as string,
      title: row.title as string,
      company: row.company as string,
      location: '',
      description: row.description as string,
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

export function updateInterviewSession(
  id: string,
  messages: InterviewMessage[],
  overallScore: number | null,
  feedback: string
): void {
  const db = getDb();
  db.prepare(
    'UPDATE interview_sessions SET messages = ?, overall_score = ?, feedback = ? WHERE id = ?'
  ).run(JSON.stringify(messages), overallScore, feedback, id);
}

export function getInterviewSessionsByUser(userId: string): InterviewSession[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT s.*, j.title, j.company
     FROM interview_sessions s
     LEFT JOIN jobs j ON s.job_id = j.id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC`
  ).all(userId) as Record<string, unknown>[];
  return rows.map((row) => {
    const session = deserializeSession(row);
    if (row.title) {
      session.job = {
        id: row.job_id as string,
        title: row.title as string,
        company: row.company as string,
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

function deserializeSession(row: Record<string, unknown>): InterviewSession {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    job_id: row.job_id as string,
    type: row.type as 'hr' | 'technical',
    messages: JSON.parse((row.messages as string) || '[]'),
    overall_score: row.overall_score as number | null,
    feedback: row.feedback as string,
    created_at: row.created_at as string,
  };
}

// ── Dashboard Statistics ────────────────────────────────────

export function getDashboardStats(userId: string): DashboardStats {
  const db = getDb();

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM applications WHERE user_id = ?'
  ).get(userId) as Record<string, unknown>;

  const statusRows = db.prepare(
    'SELECT status, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY status'
  ).all(userId) as Record<string, unknown>[];

  const statusCounts: Record<string, number> = {
    applied: 0,
    under_review: 0,
    interview_scheduled: 0,
    rejected: 0,
    offer_received: 0,
  };
  for (const row of statusRows) {
    statusCounts[row.status as string] = row.count as number;
  }

  const avgScore = db.prepare(
    'SELECT AVG(overall_score) as avg FROM job_matches WHERE user_id = ?'
  ).get(userId) as Record<string, unknown>;

  const jobsToday = getJobsCreatedToday();

  const recent = getApplicationsByUser(userId).slice(0, 5);

  const topMatches = getJobMatchesByUser(userId, 50).slice(0, 5);

  return {
    total_applications: (total?.count as number) || 0,
    status_counts: statusCounts as Record<ApplicationStatus, number>,
    jobs_found_today: jobsToday,
    avg_match_score: Math.round(((avgScore?.avg as number) || 0) * 10) / 10,
    interviews_scheduled: statusCounts.interview_scheduled || 0,
    offers_received: statusCounts.offer_received || 0,
    recent_applications: recent,
    top_matches: topMatches,
  };
}
