# AI Job Agent

**AI Job Agent** is an autonomous, multi-agent system that automates the job search process end-to-end. Powered by **Next.js 16 (React 19)**, **PostgreSQL**, and **Groq (Llama 3.1)**, the platform handles job discovery, CV parsing, semantic match scoring, cover letter generation, email delivery, and recruiter response tracking.

The system continuously crawls job boards for openings matching candidate preferences. It parses PDF resumes into structured JSON profiles and evaluates job compatibility on a 0–100% scale. For strong matches ($\ge 70\%$), the agent automatically drafts personalized cover letters, exports them as PDF attachments, and sends application emails via SMTP. An IMAP monitoring agent scans incoming email replies, classifies recruiter responses (interview invitations, under review status, rejections, or job offers), updates application statuses in real time, and sends summary alerts to the candidate.

Additionally, the platform features an interactive AI Mock Interview trainer for interview preparation and a minimalist SaaS dashboard displaying pipeline metrics, active application statuses, and manual control toggles.

### Tech Stack
* **Frontend**: Next.js 16, React 19, Tailwind CSS, Lucide Icons
* **Backend**: Next.js App Router API Handlers, Node.js runtime
* **Database**: PostgreSQL (`pg` connection pool)
* **AI Engine**: Groq SDK (`llama-3.1-8b-instant`)
* **Protocols & Utilities**: Nodemailer (SMTP), ImapFlow (IMAP), PDFKit

---

### How to Use

#### 1. Setup & Installation
```bash
# Install dependencies
pnpm install

# Configure environment variables in .env.local
GROQ_API_KEY=your_groq_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_google_app_password
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_search_agent
```

#### 2. Run the Application
```bash
# Start PostgreSQL database, then run dev server
pnpm dev
```

#### 3. Operating the Agent
1. **Login / Register**: Open `http://localhost:3000` and create an account.
2. **Upload CV**: Navigate to **CV Profile** to upload your resume (PDF).
3. **Set Preferences**: Adjust target job keywords and locations in **Settings**.
4. **Start Auto-Pilot**: On the **Dashboard**, click **Start Pipeline** to let the agent discover, match, and apply to jobs automatically every 10 minutes.
5. **Interview Prep**: Use the **Interview** page to practice AI mock interviews for scheduled company responses.
