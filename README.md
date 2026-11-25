# Final Year Project Submission — HireOracle

**Project Title:** Development of a Multi-Agent AI System for Automated Job Search, Matching and Application (HireOracle)  
**Student Name:** Hoo Yen Zhi  
**Student ID:** BAI_B2009F-2409014  
**Supervisor:** Dr. Sasa Arsovski  
**Faculty:** Faculty of AI & Robotics, Raffles University  
**Semester:** September 2026  

---

## Submission Contents

This submission contains the complete deliverables for the Final Year Project:

1. **Project Report:**  
   Contains the full academic documentation covering the Introduction, Literature Review, System Analysis and Design, Implementation and Testing (including the three empirical benchmark experiments across 120 human-annotated candidate-job pairs), and Conclusion and Future Work.

2. **Presentation Slides (PPT):**  
   Contains the presentation slide deck summarizing the project background, problem statement, research gaps, proposed multi-agent solution, system architecture, experimental evaluation results, user interface walkthrough, limitations, and future work.

3. **Demonstration Video:**  
   Provides a recorded walkthrough and live demonstration of the HireOracle prototype, showcasing resume upload and parsing, JobStreet Malaysia live job scraping, six-factor dynamic LLM matching, automated cover letter generation and SMTP email application, IMAP recruiter reply tracking, AI mock interview preparation, and LinkedIn profile analysis.

4. **Source Code (HireOracle System & Benchmark Experiments):**  
   Contains the complete full-stack source code of the HireOracle web application and the offline Python experimental evaluation scripts:
   - `src/` — Next.js 16 (React 19, TypeScript, Tailwind CSS) frontend interfaces, REST API routes, PostgreSQL database layer, Groq Cloud AI integration (`openai/gpt-oss-120b` & `whisper-large-v3-turbo`), background `node-cron` IMAP daemon, and the 9 specialized backend AI agents (`src/backend/agents/`).
   - `experiments/` — Dataset preprocessing notebooks, the 120-pair human ground-truth benchmark evaluation scripts (Uniform, Fixed Expert, and Dynamic LLM Weighting), semantic scoring scripts, paired *t*-test significance scripts, and generated CSV/Markdown results.

---

## System Overview (Source Code)

HireOracle is an autonomous, explainable multi-agent AI system that automates end-to-end job searching, candidate-job matching, application submission, and status tracking:
- **CV Parsing & Live Scraping:** Extracts structured JSON profiles from `PDF` and `DOCX` resumes and scrapes active openings from JobStreet Malaysia via headless Playwright.
- **Six-Factor Dynamic LLM Matching:** Evaluates compatibility (`0–100`) across *Job Title, Location, Qualification Level, Job Type, Salary, and Years of Experience* using Zero-Shot Chain-of-Thought (CoT) dynamic weights summing to `100%`.
- **Automated Application & Tracking:** Generates tailored PDF cover letters (`PDFKit`), dispatches applications (`>= 70%` match) with CV attachments via `SMTP` (`Nodemailer`), and monitors incoming recruiter replies every 5 minutes via `IMAP` (`ImapFlow`).
- **Career Preparation:** Includes a dual-mode AI Mock Interview simulator (Video Call with speech-to-text and Text Chat) and a LinkedIn Profile Analyzer for ATS optimization.

---

## Running the Source Code Locally

### 1. Install Dependencies
```bash
pnpm install
npx playwright install chromium
```

### 2. Configure Environment Variables (`.env.local`)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_search_agent
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_google_app_password
EMAIL_REDIRECT=your_test_inbox@gmail.com
```

### 3. Start the Development Server
```bash
pnpm dev
```
Open `http://localhost:3000` in your browser.
