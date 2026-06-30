// ============================================================
// AI Job Agent — Shared Type Definitions
// ============================================================

// ── User Types ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  preferences: UserPreferences | null;
  created_at: string;
}

export interface UserPreferences {
  location: string;
  salary_min: number;
  salary_max: number;
  industries: string[];
  remote_preference: 'remote' | 'onsite' | 'hybrid' | 'any';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead';
}

// ── CV Types ────────────────────────────────────────────────

export interface CVProfile {
  id: string;
  user_id: string;
  raw_text: string;
  structured_data: ParsedCV;
  file_path: string;
  created_at: string;
}

export interface ParsedCV {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications: string[];
}

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

// ── Job Types ───────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: JobRequirements;
  salary_range: string;
  url: string;
  salary?: string;
  source: string;
  posted_date: string;
  created_at: string;
}

export interface JobRequirements {
  skills: string[];
  experience_years: number;
  education: string;
  other: string[];
}

// ── Match Types ─────────────────────────────────────────────

export interface JobMatch {
  id: string;
  user_id: string;
  job_id: string;
  job?: Job;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  location_score: number;
  preference_score: number;
  skill_gaps: string[];
  recommendations: string[];
  created_at: string;
}

// ── Application Types ───────────────────────────────────────

export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'interview_scheduled'
  | 'rejected'
  | 'offer_received';

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  job?: Job;
  company_name: string;
  job_title: string;
  status: ApplicationStatus;
  match_score?: number;
  cover_letter: string;
  email_sent_to: string;
  date_applied: string;
  follow_up_date: string;
  notes: string;
  created_at: string;
}

// ── Email Types ─────────────────────────────────────────────

export interface EmailLog {
  id: string;
  user_id: string;
  application_id: string;
  to_email: string;
  subject: string;
  body: string;
  status: 'sent' | 'delivered' | 'failed';
  sent_at: string;
}

// ── Interview Types ─────────────────────────────────────────

export interface InterviewSession {
  id: string;
  user_id: string;
  job_id: string;
  job?: Job;
  type: 'hr' | 'technical';
  messages: InterviewMessage[];
  overall_score: number | null;
  feedback: string;
  created_at: string;
}

export interface InterviewMessage {
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  score?: number;
  feedback?: string;
}

// ── Dashboard Types ─────────────────────────────────────────

export interface DashboardStats {
  total_applications: number;
  status_counts: Record<ApplicationStatus, number>;
  jobs_found_today: number;
  avg_match_score: number;
  interviews_scheduled: number;
  offers_received: number;
  recent_applications: Application[];
  top_matches: JobMatch[];
}

// ── API Types ───────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface JobSearchRequest {
  keywords?: string[];
  location?: string;
  remote?: boolean;
  salary_min?: number;
  salary_max?: number;
  experience_level?: string;
  industry?: string;
}

export interface CoverLetterRequest {
  job_id: string;
  custom_notes?: string;
}

export interface InterviewStartRequest {
  job_id: string;
  type: 'hr' | 'technical';
}

export interface InterviewChatRequest {
  session_id: string;
  answer: string;
}

export interface SendEmailRequest {
  application_id: string;
  to_email: string;
  subject?: string;
  body?: string;
}

// ── Search Result Types ─────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}
