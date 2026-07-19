const fs = require('fs');
const path = require('path');

let content = fs.readFileSync(path.join(__dirname, 'src/lib/db.ts'), 'utf-8');

// 1. Imports
content = content.replace(/import Database from 'better-sqlite3';\nimport path from 'path';\nimport fs from 'fs';/, "import { Pool } from 'pg';");
// We can remove path and fs since pg won't need it.

// 2. getDb implementation
content = content.replace(/let _db: Database\.Database \| null = null;[\s\S]+?\/\/ ── Schema Initialization ───────────────────────────────────/m, 
`let pool: Pool | null = null;

export function getDb(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function initializeDatabase() {
  const db = getDb();
  await db.query(\`
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
  \`);
}

// ── User Operations ─────────────────────────────────────────
`);

// The above regex replaced up to "// ── User Operations". We need to handle the rest.
// We'll write the rest of the script to do regex replacements on the functions.

fs.writeFileSync('scratch/refactor.js', content, 'utf-8');
