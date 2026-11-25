# HireOracle — Multi-Agent AI Automated Job Search and Application System

HireOracle is an autonomous, multi-agent AI system that automates the job search and application process end-to-end. Powered by Next.js 16 (React 19), TypeScript, PostgreSQL, Playwright, and Groq Cloud AI (`openai/gpt-oss-120b` and `whisper-large-v3-turbo`), the platform handles live job discovery, CV parsing, six-factor dynamic match scoring, cover letter generation, email delivery, recruiter response tracking, mock interview preparation, and LinkedIn profile analysis.

The system crawls JobStreet Malaysia for active openings matching candidate preferences. It parses PDF and DOCX resumes into structured JSON profiles and evaluates job compatibility on a 0–100 scale across six recruitment factors (Job Title, Location, Qualification Level, Job Type, Salary, and Years of Experience) using Zero-Shot Chain-of-Thought (CoT) dynamic weighting. For strong matches (>= 70%), the agent automatically drafts personalized cover letters, exports them as PDF attachments, and sends application emails via SMTP. An IMAP monitoring agent scans incoming email replies every 5 minutes, classifies recruiter responses (Interview Scheduled, Under Review, Offer Received, or Rejected), updates application statuses, and sends interview alert notifications to the candidate.

Additionally, the platform features a dual-mode AI Mock Interview simulator (Video Call with speech-to-text and Text Chat), a LinkedIn Profile Analyzer for ATS keyword optimization, and a SaaS dashboard displaying pipeline metrics, active application statuses, and Auto-Pilot control toggles.

## Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Next.js App Router API Handlers, Node.js runtime, `node-cron`
- **Database:** PostgreSQL (`pg` connection pool)
- **AI Engine:** Groq Cloud AI SDK (`openai/gpt-oss-120b` & `whisper-large-v3-turbo`)
- **Scraping & Documents:** Playwright (Headless Chromium), `pdf-parse`, `mammoth`, `PDFKit`
- **Protocols & Auth:** Nodemailer (SMTP), ImapFlow (IMAP), JWT, `bcryptjs`, Google OAuth 2.0
- **Benchmark Evaluation:** Python (`numpy`, `pandas`, `scipy`) in `experiments/`

## How to Use

### 1. Setup & Installation
```bash
# Install dependencies
pnpm install

# Install Playwright Chromium browser for JobStreet scraping
npx playwright install chromium
```

Configure environment variables in `.env.local`:
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_google_app_password
EMAIL_REDIRECT=your_test_inbox@gmail.com
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_search_agent
```

### 2. Run the Application
```bash
# Start PostgreSQL database, then run dev server
pnpm dev
```

### 3. Operating the Agent
1. **Login / Register:** Open `http://localhost:3000` and create an account (or sign in via Google OAuth / Magic Link).
2. **Upload CV:** Navigate to **CV Profile** to upload your resume (`PDF` or `DOCX`).
3. **Set Preferences:** Adjust target job titles, locations, job types, and salary in **Settings**.
4. **Start Auto-Pilot:** On the **Dashboard**, click **Start Pipeline** to let the agents discover, match, and apply to eligible jobs (>= 70%) automatically every 10 minutes.
5. **Interview Prep & LinkedIn Analyzer:** Use **Interview Preparation** to practice HR/Technical mock interviews in Video or Text mode, and **LinkedIn Analyzer** for ATS profile feedback.
