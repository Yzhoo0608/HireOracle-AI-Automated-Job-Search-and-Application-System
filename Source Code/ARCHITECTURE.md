# AI Job Agent — Comprehensive Architecture, Codebase & Replication Document

This document provides a highly detailed guide mapping the directory structure, file purposes, component responsibilities, database schema, multi-agent pipelines, API routes, and replication instructions for the **AI Job Agent** application.

---

## 1. Directory Tree & Codebase Layout

```
AI-job-agent/
├── data/                       # Contains SQLite database files
├── public/                     # Static assets (images, icons)
├── uploads/                    # User uploaded files (resumes in PDF format)
├── scratch/                    # Temporary developer utility scripts
├── src/
│   ├── app/                    # Next.js App Router (Pages, CSS, Layouts, API Routes)
│   │   ├── api/                # Next.js Serverless API Route Handlers
│   │   ├── applications/       # Applications management page
│   │   ├── cv/                 # CV Profile upload and analysis page
│   │   ├── interview/          # AI Interview Trainer interactive simulator
│   │   ├── jobs/               # Scraped jobs list and search discover page
│   │   ├── login/              # User login authentication page
│   │   ├── register/           # User sign-up registration page
│   │   ├── settings/           # User search preferences configuration page
│   │   ├── LayoutWrapper.tsx   # Client session gate and layout shell
│   │   ├── favicon.ico         # Application favicon
│   │   ├── globals.css         # Custom global styles and theme variables
│   │   ├── layout.tsx          # Main html document layout configuration
│   │   └── page.tsx            # Main Dashboard Overview page
│   ├── components/             # React visual components
│   │   ├── layout/             # Structure layout blocks (Sidebar, Header)
│   │   └── ui/                 # Reusable UI component blocks (Buttons, Cards, Toast)
│   ├── lib/                    # Shared library layer (DB context, Auth, LLM configurations)
│   │   ├── agents/             # Autonomous Multi-Agent pipelines
│   │   ├── auth.ts             # JWT token helpers and middleware checks
│   │   ├── db.ts               # Core database SQLite operations
│   │   ├── groq.ts             # Groq LLM API interaction helpers
│   │   └── types.ts            # Shared TypeScript type definitions
│   └── instrumentation.ts      # Next.js environment hooks
├── .env.local                  # Environment variables file
├── next.config.ts              # Next.js compilation settings
├── package.json                # Project configurations & dependency versions
└── tsconfig.json               # TypeScript compiler config
```

---

## 2. File-by-File Directory & Purposes

### 2.1 Core Library Layer (`src/lib/`)

* **[db.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/db.ts)**:
  * **Purpose**: Initializes the SQLite database via `better-sqlite3`, builds indexes, handles connection pools, and runs migrations (such as adding the `is_active` column).
  * **Key Functions**:
    * `getDb()`: Singleton connection provider.
    * `initializeDatabase(db)`: Creates database tables and setups constraints.
    * `createJob(job)`: Entry-level scraping deduplication. Checks if the incoming JobStreet ID already exists before inserting.
    * `hasAppliedToJobStreetId(userId, url)`: Scans application histories to identify matching JobStreet IDs, preventing double applications.
    * `hasAppliedToCompanyAndTitle(userId, company, title)`: Enforces name-normalized company/role checks.

* **[auth.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/auth.ts)**:
  * **Purpose**: Handles authentication operations. Encrypts user passwords using `bcryptjs` and signs/decrypts session tokens using JSON Web Tokens (JWT).
  * **Key Functions**:
    * `hashPassword(password)`: Hashes passwords.
    * `comparePassword(password, hash)`: Matches credentials.
    * `signToken(payload)`: Signs JWT cookies.
    * `requireAuth()`: Endpoint middleware verifying the user session.

* **[groq.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/groq.ts)**:
  * **Purpose**: Handles LLM requests using the Groq SDK.
  * **Key Functions**:
    * `askLLM(prompt, systemInstruction)`: General prompt runner.
    * `askJSON(prompt, systemInstruction)`: Enforces strict structured JSON schemas from LLM completions.

* **[types.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/types.ts)**:
  * **Purpose**: Contains shared TypeScript type definitions, interfaces, and schemas (e.g. `User`, `Job`, `CVProfile`, `Application`).

---

### 2.2 Autonomous Multi-Agent Layer (`src/lib/agents/`)

* **[orchestrator.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/orchestrator.ts)**:
  * **Purpose**: Coordinates background active loops. Coordinates web-scrapes, match checks, batch applications, and summary deliveries.
  * **Key Functions**:
    * `startActivePipelineTimer()`: Runs a background interval loop every 10 minutes for active users.
    * `runActivePipelineCycle(userId)`: Orchestrates steps A to E. Isolates steps in local try-catch blocks to prevent errors from blocking the cycle summary email.

* **[job-search-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/job-search-agent.ts)**:
  * **Purpose**: Automatically queries and parses job listings. Uses query parameter builders to scrape listings matching search criteria.

* **[matching-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/matching-agent.ts)**:
  * **Purpose**: Conducts semantic fits using the LLM, scoring candidates against job descriptions and generating pros/cons.

* **[cover-letter-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/cover-letter-agent.ts)**:
  * **Purpose**: Uses Groq LLM prompts to write tailored cover letters and application emails.

* **[email-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/email-agent.ts)**:
  * **Purpose**: Sends emails via SMTP using Nodemailer. Supports an `EMAIL_REDIRECT` parameter to redirect outgoing recruiter mail during testing, alongside an `isSystemNotification: true` override to ensure system notifications deliver directly to the user.

* **[reply-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/reply-agent.ts)**:
  * **Purpose**: Uses `imapflow` to scan the user's inbox for recruiter responses. Uses the LLM to classify replies (`interview_scheduled`, `rejected`, etc.) and automatically updates database statuses.

* **[cv-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/cv-agent.ts)**:
  * **Purpose**: Parses uploaded raw CV PDF text into structured JSON models (education, skills, contact).

* **[interview-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/interview-agent.ts)**:
  * **Purpose**: Powers the interactive Interview Trainer, generating responses based on the CV profile and job context.

* **[tracking-agent.ts](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/lib/agents/tracking-agent.ts)**:
  * **Purpose**: Computes progress metrics and analytics for dashboard charts.

---

### 2.3 Frontend Layout & UI Components (`src/components/`)

* **[Header.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/layout/Header.tsx)**:
  * **Purpose**: Renders the top navigation header containing search inputs, notification badges, dynamic page titles, and user profile indicators. Forced with an explicit `#0f172a` backdrop to avoid system theme conflicts.

* **[Sidebar.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/layout/Sidebar.tsx)**:
  * **Purpose**: Left-hand navigation panel listing links (Dashboard, CV Profile, Interview Prep, Settings) and the Logout action.

* **[Card.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/ui/Card.tsx)**:
  * **Purpose**: Glassmorphism container styled via `.glass` in globals.css. Updated to use explicit `rgba(30, 41, 59, 0.7)` and `rgba(148, 163, 184, 0.2)` properties with `!important` to prevent light mode browser overrides.

* **[StatCard.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/ui/StatCard.tsx)**:
  * **Purpose**: Formats dashboard stat panels (Total Applications, Jobs Found Today, Interviews, Avg Match Score).

* **[FileUpload.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/ui/FileUpload.tsx)**:
  * **Purpose**: Drag-and-drop zone handling resume uploads and API communications.

* **[MatchScore.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/ui/MatchScore.tsx)**:
  * **Purpose**: Formats color-coded circular match badges (green for $\ge 80\%$, yellow for $70-79\%$).

* **[ChatBubble.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/ui/ChatBubble.tsx)**:
  * **Purpose**: Message bubbles for the AI Interview Trainer simulator.

* **[Toast.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/components/ui/Toast.tsx)**:
  * **Purpose**: Toast notification provider.

---

### 2.4 Next.js Pages & Client Layouts (`src/app/`)

* **[layout.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/app/layout.tsx)**:
  * **Purpose**: Next.js root layout. Injects font families, global stylesheets, and the layout wrapping container.

* **[LayoutWrapper.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/app/LayoutWrapper.tsx)**:
  * **Purpose**: Handles authentication checks and serves as the dashboard wrapper. Forced with explicit `bg-[#0f172a]` classes to prevent light-theme browser overrides.

* **[globals.css](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/app/globals.css)**:
  * **Purpose**: Global style rules. Defines animations (`fadeIn`, `pulseGlow`) and the glassmorphism theme utility classes.

* **[page.tsx](file:///c:/Users/User/Downloads/AI%20Job%20Agent/AI-job-agent/src/app/page.tsx)**:
  * **Purpose**: Dashboard home page.
  * **Key Features**:
    * Displays application statistics and top matches.
    * Toggles active Auto-Pilot status.
    * Polls backend stats every 5 seconds when active so the UI updates in real-time as applications are processed.
    * Displays a pulse-animated active status banner.

---

## 3. Serverless API Routing Layer (`src/app/api/`)

The application exposes endpoints to handle asynchronous background tasks and UI requests:

* **/api/auth/**:
  * `login/route.ts`: Sets the JWT session cookie.
  * `register/route.ts`: Hashes user passwords and creates new database accounts.
  * `logout/route.ts`: Clears auth cookies.
  * `me/route.ts`: Returns current user session details. Defer-starts the orchestrator loop.

* **/api/cv/**:
  * `upload/route.ts`: Saves the CV PDF file locally and calls the CV parser agent.
  * `profile/route.ts`: Returns the parsed structural resume JSON models.

* **/api/jobs/**:
  * `route.ts`: Returns cached job listings.
  * `search/route.ts`: Direct trigger endpoint for scraper sweeps.

* **/api/applications/**:
  * `route.ts` & `[id]/route.ts`: CRUD endpoints for applications.
  * `[id]/apply/route.ts`: Manually triggers cover letter drafts and email actions for a job.
  * `check-replies/route.ts`: Manually triggers reply-agent IMAP sweeps.
  * `stats/route.ts`: Returns user metrics and dashboard stats.

* **/api/orchestrator/active/**:
  * `route.ts`: GETs/POSTs user active states (`is_active = 0` / `is_active = 1`). Toggling active status triggers the first cycle in the background immediately.

---

## 4. Replication & Environment Configuration

To replicate this environment on another computer:

### Step 1: Clone and Configure Environment
Copy `.env.local` to the root workspace and customize the variables:
```env
GROQ_API_KEY=gsk_your_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

EMAIL_USER=your_gmail_sender@gmail.com
EMAIL_APP_PASSWORD=your_16_character_app_password

JWT_SECRET=your_jwt_signing_secret_here
DATABASE_PATH=./data/database.sqlite
EMAIL_REDIRECT=your_testing_recipient@gmail.com

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

### Step 2: Install Packages & Run dev
Run the following commands in the workspace root:
```bash
# Install dependencies
pnpm install

# Run next.js development server
pnpm dev
```
Open **http://localhost:3000** in your browser. The SQLite database is created and initialized automatically at startup.
