# Final Year Project 1 Submission
**Project Title:** Development of a Multi-Agent AI System for Automated Job Search, Matching and Application  
**Student:** Hoo Yen Zhi (`BAI_B2009F-2409014`) 

---
This repository is organized into two main directories: **`Submission/`** (project deliverables) and **`Source Code/`** (system implementation and benchmark experiments).

---
## Repository Structure

```text
HireOracle-AI-Automated-Job-Search-and-Application-System/
├── Submission/                       # Complete FYP I submission deliverables
│   ├── Report                        # Final Year Project Report
│   ├── Presentation (PPT)            # Presentation slide deck
│   └── Video                         # System demonstration & walkthrough video
│
├── Source Code/                      # HireOracle web prototype & benchmark scripts
│   ├── experiments/                  # Dataset preprocessing & Python evaluation (120 pairs)
│   │   ├── 01_domain_sampling.ipynb
│   │   ├── 02_ground_truth_annotation.ipynb
│   │   └── methods/                  # Experiments 1–3, paired t-test & CSV results
│   ├── src/
│   │   ├── app/(frontend)/           # UI pages (Dashboard, CV, Matches, Applications, Interview, LinkedIn, Settings)
│   │   ├── app/api/                  # REST API route handlers
│   │   ├── backend/agents/           # Orchestrator + 8 specialized AI agents
│   │   ├── backend/                  # PostgreSQL (db.ts), Auth (auth.ts) & Groq AI (groq.ts)
│   │   ├── frontend/components/      # Shared UI components
│   │   └── instrumentation.ts        # Background 5-minute IMAP reply daemon
│   ├── uploads/                      # Uploaded CVs (PDF/DOCX) & generated Cover Letters (PDF)
│   └── package.json
│
└── README.md
```

---

## Directory Summary

- **`Submission/`:** Contains the Final Year Project Report, Presentation Slides (PPT), and Demonstration Video.
- **`Source Code/`:** Contains the full-stack Next.js 16 (React 19, TypeScript, Tailwind CSS), PostgreSQL, Playwright, and Groq Cloud AI (`openai/gpt-oss-120b` & `whisper-large-v3-turbo`) web application alongside the Python experimental evaluation scripts.

---

## Running the System (`Source Code/`)

### 1. Navigate & Install Dependencies
```bash
cd "Source Code"
pnpm install
npx playwright install chromium
```

### 2. Configure `.env.local` inside `Source Code/`
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_search_agent
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_google_app_password
EMAIL_REDIRECT=your_test_inbox@gmail.com
```

### 3. Start the Application
```bash
pnpm dev
```
Open `http://localhost:3000` in your browser.
