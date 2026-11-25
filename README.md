# Final Year Project 1 Submission

**Project Title:** Development of a Multi-Agent AI System for Automated Job Search, Matching and Application  
**Student:** Hoo Yen Zhi (`BAI_B2009F-2409014`)  
 

---

## 1. Submission Deliverables

- **Project Report:** Full FYP thesis covering background, literature review, system design, three benchmark experiments (120 candidate-job pairs), functional testing, and conclusion.
- **Presentation Slides (PPT):** Slide deck summarizing the research gap, multi-agent architecture, six-factor dynamic LLM weighting, experimental results, and UI modules.
- **Demonstration Video:** Recorded walkthrough demonstrating live CV parsing, JobStreet Malaysia scraping, six-factor matching, automated email application, IMAP reply tracking, mock interviews, and LinkedIn analysis.
- **Source Code:** Complete full-stack Next.js/TypeScript implementation of the HireOracle system and the Python benchmark evaluation scripts.

---

## 2. Project Folder Structure

```text
Submission_Folder/
├── Report/                           # Final Year Project Report (PDF / DOCX)
├── Presentation_Slides/              # FYP Presentation Slides (PPTX / PDF)
├── Demonstration_Video/              # System Walkthrough & Demo Video (MP4)
└── Source_Code/                      # HireOracle System & Benchmark Repository
    ├── experiments/                  # Dataset preprocessing & Python benchmark scripts
    │   ├── 01_domain_sampling.ipynb
    │   ├── 02_ground_truth_annotation.ipynb
    │   └── methods/                  # Experiments 1, 2, 3 + CSV results
    ├── src/
    │   ├── app/
    │   │   ├── (frontend)/           # Web UI pages (Dashboard, CV, Matches, Applications, Interview, LinkedIn, Settings)
    │   │   └── api/                  # Backend REST API route handlers
    │   ├── backend/
    │   │   ├── agents/               # Orchestrator + 8 specialized AI agents
    │   │   ├── auth.ts               # JWT & password authentication
    │   │   ├── db.ts                 # PostgreSQL connection & schema setup
    │   │   └── groq.ts               # Groq LLM & Whisper STT integration
    │   ├── frontend/components/      # Shared UI components
    │   └── instrumentation.ts        # Background 5-min IMAP reply checker
    ├── uploads/                      # Uploaded CVs (PDF/DOCX) & generated Cover Letters (PDF)
    └── package.json
```

---

## 3. Quick Start (Source Code)

1. Install dependencies and browser scraper:
   ```bash
   pnpm install
   npx playwright install chromium
   ```
2. Add environment variables in `.env.local` (`DATABASE_URL`, `GROQ_API_KEY`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_REDIRECT`).
3. Start PostgreSQL and run the server:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000`.
