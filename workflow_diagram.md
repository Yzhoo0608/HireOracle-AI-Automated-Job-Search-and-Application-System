# AI Job Agent System Workflow Diagram

Below is the complete architectural and operational workflow diagram of the AI Job Agent system, mapping user actions, automated background pipelines, database models, and LLM processing layers.

---

## 📊 System Workflow Diagram

```mermaid
flowchart TD
  %% User / Interface Layer
  subgraph User_Action ["👤 User Activity & Settings"]
    U_CV["Upload CV (PDF/DOCX)"]
    U_Pref["Configure Search Preferences & SMTP/IMAP Credentials"]
    U_Inter["Start Mock Interview Practice"]
  end

  %% Storage / Database Layer
  subgraph Database ["🗄️ PostgreSQL Database"]
    DB_Users[("users table")]
    DB_CV[("cv_profiles table")]
    DB_Jobs[("jobs & job_matches table")]
    DB_Apps[("applications table")]
    DB_Sess[("interview_sessions table")]
  end

  %% LLM / Groq Processing Layer
  subgraph AI_Engine ["🤖 AI Engine (Groq Llama 3.1)"]
    AI_Parse["CV Text Parsing & Extracting Structured Skills"]
    AI_Match["Job Matching & Compatibility scoring"]
    AI_Letter["Draft Personalized Cover Letter"]
    AI_Class["Email Reply Classification (interview, under_review, rejected)"]
    AI_Mock["Q&A grading & 5-Question Session evaluation"]
  end

  %% Background Pipeline Loop
  subgraph Autopilot ["⏰ Background Pipeline Loop (Every 10 Mins)"]
    Scraper["JobStreet Scraper (Harvests new job listings)"]
    Applier["Application Dispatcher (Sends cover letter & CV via SMTP)"]
    Inbox["Inbox Reply Checker (Checks recruiter replies via IMAP)"]
  end

  %% Core Workflow Connections
  U_CV --> AI_Parse
  AI_Parse --> DB_CV
  U_Pref --> DB_Users
  
  %% Auto-Pilot loop connections
  Scraper --> AI_Match
  DB_CV -.-> AI_Match
  AI_Match --> DB_Jobs
  
  DB_Jobs -- "Match Score >= Threshold" --> Applier
  Applier --> AI_Letter
  AI_Letter --> DB_Apps
  
  Inbox --> AI_Class
  AI_Class --> DB_Apps
  
  %% Mock Interview Q&A
  U_Inter --> AI_Mock
  DB_Jobs -.-> AI_Mock
  AI_Mock --> DB_Sess
  DB_Sess -- "Completes 5 Questions" --> U_Inter
  
  %% Summary notifications
  Autopilot -- "Cycle Completed" --> Notify["Send Summary Email (Stats & Last 5 Applications)"]

  %% Styling nodes
  classDef user fill:#e0f2fe,stroke:#0369a1,stroke-width:2px;
  classDef db fill:#f0fdf4,stroke:#15803d,stroke-width:2px;
  classDef ai fill:#faf5ff,stroke:#6b21a8,stroke-width:2px;
  classDef loop fill:#fff7ed,stroke:#c2410c,stroke-width:2px;
  
  class U_CV,U_Pref,U_Inter,Notify user;
  class DB_Users,DB_CV,DB_Jobs,DB_Apps,DB_Sess db;
  class AI_Parse,AI_Match,AI_Letter,AI_Class,AI_Mock ai;
  class Scraper,Applier,Inbox loop;
```

---

## 🔍 Key Operational Steps

1. **Profile Building**: The candidate uploads their CV. The **AI Parser** structures it into profile records containing skills, education, and career experience.
2. **Autonomous Scrape & Match**: The **JobStreet Scraper** extracts new listings in the background. The **AI Matcher** scores each job's compatibility against the candidate's parsed profile.
3. **Dispatch & Application**: If the score meets the matching threshold, the agent uses **SMTP** credentials to email a custom-crafted cover letter and CV to the recruiter, creating an **Application** row in PostgreSQL.
4. **Inbox Tracking**: The **Inbox Reply Checker** monitors the inbox using **IMAP**. It feeds recruiter responses to the **AI Classifier**, updating the pipeline state (`Applied` $\rightarrow$ `Under Review` $\rightarrow$ `Interview` $\rightarrow$ `Rejected`).
5. **Interview Preparation**: The user practices interactive mock interviews tailored to a specific job matching their profile. After exactly **5 rounds of Q&A**, the interface locks and outputs a final report outlining strengths and actionable recommendations.
6. **Cycle Summary**: The orchestrator sends a summary email containing all-time stats, the last 5 applications, and incoming interviews.
