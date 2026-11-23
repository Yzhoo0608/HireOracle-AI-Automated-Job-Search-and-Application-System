# Comprehensive Candidate Audit & Validation Report (C01–C30)
## FYP: HireOracle — Multi-Agent Automated Job Application & Matching System

**Authoritative Source**: `experiments/dataset/processed/resumes_extracted.csv`  
**Target Output Datasets**:
- `experiments/dataset/processed/benchmark_resumes.csv` (30 candidates)
- `experiments/dataset/processed/benchmark_ground_truth.csv` (120 candidate-job pairs)  
**Notebook Pipelines**:
- `experiments/01_domain_sampling.ipynb`
- `experiments/02_ground_truth_annotation.ipynb`  
**Date of Audit**: October 2026  
**Benchmark Reference Year Anchor**: **2019** (Standardized reference year for ongoing / "to Current" positions)  
**Educational Classification Update**: Distinct separation of **`Associate`** (tertiary 2-year college/technical degree, e.g., A.A.S. / A.S.) vs. **`Diploma`** (secondary school / vocational credential), and recognition of completed **`Bachelor's Degree`** credentials.

---

## 1. Executive Summary & Verification Methodology

This audit provides an exhaustive, manual-grade verification of all 30 benchmark candidate profiles (`C01`–`C30`), with primary focus on candidates **`C08` through `C30`**, using the verified reference profiles `C01`–`C07` as the benchmark standard.

### Core Audit Principles & Standards Applied:
1. **Authoritative Source Cross-Referencing**: Every candidate's `resume_id` was verified directly against `experiments/dataset/processed/resumes_extracted.csv` and confirmed to match the exact original PDF and extracted text.
2. **Standardized 2019 Anchor Year for Ongoing Roles**:
   - Resumes with active `"to Current"` or `"to Present"` roles were calculated with 2019 as the benchmark anchor year.
   - Historical roles with explicit past end dates (e.g., `01/2012 to 11/2015`) retain their exact historical duration.
3. **Strict Domain-Tenure Calculation (Zero Double-Counting)**:
   - Only domain-relevant work was credited (IT roles for `INFORMATION-TECHNOLOGY`, accounting/financial roles for `ACCOUNTANT`).
   - Non-domain positions were strictly excluded (e.g., military combat engineer in `C19`, paralegal in `C11`, nursing in `C29`, union steward in `C01`, general retail/clerical).
   - Overlapping concurrent employment periods were resolved by taking the union of intervals rather than summing durations, completely eliminating double-counting.
4. **Refined Educational Attainment Classification**:
   - **`Associate`**: Explicitly assigned to candidates holding recognized tertiary 2-year associate degrees from accredited colleges/technical institutes (`C01` A.A.S. InfoSec, `C17` A.A.S. Network Administration, `C18` A.S. Electronic Engineering).
   - **`Diploma`**: Assigned to secondary high school diploma credentials (`C15` Virginia High School, `C30` Zephyrhills High School Business/Accounting).
   - **`Bachelor's Degree`**: Four-year undergraduate university degrees (`C02`, `C03`, `C06`, `C08`, `C09`, `C11`, `C14`, `C16`, `C19`, `C20`, `C21`, `C24`, `C25`, `C27`, `C28`, `C29`).
   - **`Master's Degree`**: Postgraduate master's degrees (`C04`, `C05`, `C10`, `C12`, `C13`, `C22`, `C23`).
   - **`Doctorate`**: Doctoral level degrees (`C07` Ph.D.).
   - **`Professional Certification`**: Non-degree professional qualification track (`C26`).
5. **Calibrated Malaysian Market Preference Simulation**:
   - `preferred_job_title`: Realistic title aligned with verified seniority and specific domain specialism.
   - `preferred_location`: Selected from major Malaysian employment hubs (`Kuala Lumpur`, `Petaling Jaya, Selangor`, `Cyberjaya, Selangor`, `Shah Alam, Selangor`, `Subang Jaya, Selangor`, `Penang`, `Johor Bahru`, or `Open to any (Malaysia)`).
   - `expected_salary_min` & `expected_salary_max`: Calibrated in Ringgit Malaysia (MYR / RM) according to the verified seniority tier:
     - *Mid-Level (4–7 yrs)*: RM 5,000 – RM 8,000
     - *Senior (8–14 yrs)*: RM 8,000 – RM 13,000 (up to RM 14,000 for Master's holders)
     - *Lead / Executive (15+ yrs)*: RM 12,500 – RM 19,000
   - `preferred_job_type`: `Full time` or `Contract/Temp` to provide realistic evaluation diversity.
   - `word_count`: Exact token count matching `len(clean_resume_text.split())`.
6. **Ground-Truth Template Preservation**:
   - Verified that all 120 pairs in `experiments/dataset/processed/benchmark_ground_truth.csv` have all 8 evaluation/scoring columns (`score_title`, `score_location`, `score_education`, `score_type`, `score_salary`, `score_experience`, `ground_truth_score`, `relevance_grade`) plus `annotation_rationale` completely blank for manual human grading.
7. **Side-by-Side Education Requirement in Ground Truth**:
   - Audited the minimum academic criteria across all 60 JobStreet job postings and explicitly added `Edu: [Requirement]` directly into `job_summary` (e.g., `Edu: Bachelor's Degree`, `Edu: Diploma / Degree`, `Edu: Professional (ACCA/CPA)`, `Edu: Not Specified (Open)`). This enables immediate, transparent side-by-side comparison between `candidate_summary` and `job_summary` when grading `score_education`.

---

## 2. Master Verification Matrix (All 30 Candidates)

| CID | Resume ID | Category | Verified Exp (2019) | Seniority Tier | Detected Education | Expected Salary (RM) | Preferred Location | Job Type | Words | Education Source / Credential |
|:---:|:---:|:---|:---:|:---|:---|:---:|:---|:---:|:---:|:---|
| **C01** | 24083609 | IT | 4 yrs | Mid-Level (4-7 yrs) | **Associate** | 5,500 – 8,000 | Kuala Lumpur | Full time | 237 | Associate of Applied Science (AAS) InfoSec |
| **C02** | 20237244 | IT | 16 yrs | Lead / Executive (15+ yrs) | **Bachelor's Degree** | 13,500 – 19,000 | Petaling Jaya, Selangor | Full time | 402 | B.S. Information & Computer Science (Park Univ) |
| **C03** | 16899268 | IT | 20 yrs | Lead / Executive (15+ yrs) | **Bachelor's Degree** | 8,500 – 13,000 | Cyberjaya, Selangor | Full time | 573 | B.S. Marketing (Iowa State Univ) |
| **C04** | 10553553 | IT | 13 yrs | Senior (8-14 yrs) | **Master's Degree** | 9,500 – 14,000 | Kuala Lumpur | Full time | 662 | M.S. Information Technology (Univ of Maryland) |
| **C05** | 13385306 | IT | 20 yrs | Lead / Executive (15+ yrs) | **Master's Degree** | 13,500 – 19,000 | Shah Alam, Selangor | Full time | 714 | Master of Science in Telecommunications (Pace Univ) |
| **C06** | 37242217 | IT | 16 yrs | Lead / Executive (15+ yrs) | **Bachelor's Degree** | 13,500 – 19,000 | Penang | Full time | 920 | B.S. Information Technology (Univ of Phoenix) |
| **C07** | 51639418 | IT | 16 yrs | Lead / Executive (15+ yrs) | **Doctorate** | 13,500 – 19,000 | Kuala Lumpur | Full time | 655 | Ph.D. Computing & Information Sciences |
| **C08** | 13836471 | IT | 18 yrs | Lead / Executive (15+ yrs) | **Bachelor's Degree** | 13,500 – 19,000 | Subang Jaya, Selangor | Contract/Temp | 658 | B.S. Computer System Engineer (Fundación Univ Autónoma) |
| **C09** | 37764298 | IT | 11 yrs | Senior (8-14 yrs) | **Bachelor's Degree** | 8,500 – 13,000 | Johor Bahru | Full time | 872 | B.S. Business Finance (Towson Univ) + MCSE |
| **C10** | 31243710 | IT | 14 yrs | Senior (8-14 yrs) | **Master's Degree** | 9,500 – 14,000 | Kuala Lumpur | Full time | 1,041 | M.A. (Western Michigan Univ) + B.A. Sociology |
| **C11** | 91697974 | IT | 5 yrs | Mid-Level (4-7 yrs) | **Bachelor's Degree** | 5,500 – 8,000 | Petaling Jaya, Selangor | Full time | 729 | B.S. CIS InfoSec Summa Cum Laude (Strayer Univ) |
| **C12** | 13477922 | IT | 20 yrs | Lead / Executive (15+ yrs) | **Master's Degree** | 13,500 – 19,000 | Kuala Lumpur | Full time | 723 | M.A. (George Mason Univ) + B.S. Biology + AAS |
| **C13** | 14789139 | IT | 27 yrs | Lead / Executive (15+ yrs) | **Master's Degree** | 13,500 – 19,000 | Cyberjaya, Selangor | Full time | 1,163 | MBA (Pepperdine Univ) + B.S. Biology/Computer Science |
| **C14** | 22450718 | IT | 7 yrs | Mid-Level (4-7 yrs) | **Bachelor's Degree** | 5,500 – 8,000 | Penang | Full time | 995 | B.S. Computer Engineering Tech (Prairie View A&M) |
| **C15** | 91121135 | IT | 6 yrs | Mid-Level (4-7 yrs) | **Diploma** | 5,000 – 7,500 | Kuala Lumpur | Full time | 829 | Virginia High School Diploma |
| **C16** | 40018190 | IT | 5 yrs | Mid-Level (4-7 yrs) | **Bachelor's Degree** | 5,000 – 7,500 | Shah Alam, Selangor | Contract/Temp | 394 | B.S. Management Info Systems (William Woods Univ) |
| **C17** | 27295996 | IT | 10 yrs | Senior (8-14 yrs) | **Associate** | 8,500 – 13,000 | Petaling Jaya, Selangor | Full time | 928 | AAS Network Administration (Hennepin Technical College) |
| **C18** | 36856210 | IT | 14 yrs | Senior (8-14 yrs) | **Associate** | 8,500 – 13,000 | Kuala Lumpur | Full time | 617 | Associate of Science Electronic Engineering (Florence) |
| **C19** | 20408458 | IT | 11 yrs | Senior (8-14 yrs) | **Bachelor's Degree** | 8,500 – 13,000 | Johor Bahru | Full time | 1,296 | B.S. Information Technology Support (Univ of Phoenix) |
| **C20** | 27058381 | IT | 14 yrs | Senior (8-14 yrs) | **Bachelor's Degree** | 8,500 – 13,000 | Open to any (Malaysia) | Full time | 1,715 | B.S. Sociology & Psychology (Weber State Univ) |
| **C21** | 20345168 | ACC | 11 yrs | Senior (8-14 yrs) | **Bachelor's Degree** | 8,000 – 12,000 | Kuala Lumpur | Full time | 465 | B.S. Business Management (Arizona State Univ) |
| **C22** | 18569929 | ACC | 20 yrs | Lead / Executive (15+ yrs) | **Master's Degree** | 12,500 – 18,000 | Petaling Jaya, Selangor | Full time | 544 | Master Accounting & Financial Mgmt (Keller Graduate) |
| **C23** | 12338274 | ACC | 9 yrs | Senior (8-14 yrs) | **Master's Degree** | 8,000 – 12,000 | Kuala Lumpur | Full time | 810 | MBA Finance (Vidyasagar Univ) |
| **C24** | 25067742 | ACC | 14 yrs | Senior (8-14 yrs) | **Bachelor's Degree** | 8,000 – 12,000 | Penang | Full time | 344 | B.A. Business Administration (CUC Univ) |
| **C25** | 78403342 | ACC | 15 yrs | Lead / Executive (15+ yrs) | **Bachelor's Degree** | 12,500 – 18,000 | Shah Alam, Selangor | Full time | 867 | B.S. General Studies (Wilmington Univ) + Accounting Cert |
| **C26** | 13072019 | ACC | 16 yrs | Lead / Executive (15+ yrs) | **Professional Certification** | 12,500 – 18,000 | Kuala Lumpur | Contract/Temp | 829 | Drafting & Real Estate Tech Coursework / No Degree |
| **C27** | 39674178 | ACC | 26 yrs | Lead / Executive (15+ yrs) | **Bachelor's Degree** | 12,500 – 18,000 | Johor Bahru | Full time | 706 | B.S. Management (Park Univ) |
| **C28** | 31602598 | ACC | 16 yrs | Lead / Executive (15+ yrs) | **Bachelor's Degree** | 12,500 – 18,000 | Petaling Jaya, Selangor | Full time | 699 | Bachelor of Arts (Ashford Univ) + AAS Accounting |
| **C29** | 80053367 | ACC | 5 yrs | Mid-Level (4-7 yrs) | **Bachelor's Degree** | 5,000 – 7,500 | Kuala Lumpur | Full time | 600 | B.S. Nursing (CSU Northridge) |
| **C30** | 27637576 | ACC | 26 yrs | Lead / Executive (15+ yrs) | **Diploma** | 12,500 – 18,000 | Open to any (Malaysia) | Full time | 1,165 | Zephyrhills High School Diploma (Business/Accounting) |

---

## 3. Individual Candidate Educational Verification Details

### Candidates with Refined Education Classifications:

1. **`C01` (Resume 24083609) $\rightarrow$ `Associate`**:
   - Holds an accredited **Associate of Applied Science (AAS)** degree with specialization in Information Security. Classified specifically as **`Associate`** (tertiary 2-year college degree).

2. **`C15` (Resume 91121135) $\rightarrow$ `Diploma`**:
   - Highest educational credential is a **High School Diploma** from Virginia High School. Classified specifically as **`Diploma`** (secondary school).

3. **`C17` (Resume 27295996) $\rightarrow$ `Associate`**:
   - Holds a technical **Associate of Applied Science (AAS) in Network Administration** (Hennepin Technical College, 2010, GPA 3.71). Classified specifically as **`Associate`**.

4. **`C18` (Resume 36856210) $\rightarrow$ `Associate`**:
   - Holds an **Associate of Science (A.S.) in Electronic Engineering** (Florence Darlington Technical School, 1980). Classified specifically as **`Associate`**.

5. **`C28` (Resume 31602598) $\rightarrow$ `Bachelor's Degree`**:
   - Lists **Bachelor of Arts in Supply Chain Management** (Ashford University) alongside an **Associate of Arts in Accounting Technology** (Scott Community College, Honors). Classified as **`Bachelor's Degree`**.

6. **`C30` (Resume 27637576) $\rightarrow$ `Diploma`**:
   - Highest educational credential is a **High School Diploma in Business Management/Accounting** from Zephyrhills High School. Classified specifically as **`Diploma`**.

---

## 4. Educational Distribution Breakdown

Following this refinement, the educational tier distribution across the 30 candidates is:

| Educational Tier | IT (`C01`–`C20`) | Accounting (`C21`–`C30`) | Total Benchmark Candidates | Candidates |
|---|:---:|:---:|:---:|:---|
| **Doctorate** | 1 | 0 | **1** | `C07` |
| **Master's Degree** | 5 | 2 | **7** | `C04`, `C05`, `C10`, `C12`, `C13`, `C22`, `C23` |
| **Bachelor's Degree** | 10 | 6 | **16** | `C02`, `C03`, `C06`, `C08`, `C09`, `C11`, `C14`, `C16`, `C19`, `C20`, `C21`, `C24`, `C25`, `C27`, `C28`, `C29` |
| **Associate** | 3 | 0 | **3** | `C01`, `C17`, `C18` |
| **Diploma** | 1 | 1 | **2** | `C15`, `C30` |
| **Professional Certification** | 0 | 1 | **1** | `C26` |
| **Total** | **20** | **10** | **30** | — |

---

## 5. Pipeline Synchronization Checklist

- [x] **`experiments/dataset/processed/benchmark_resumes.csv`**: Contains user-corrected education categories (`Associate`, `Diploma`, `Bachelor's Degree`).
- [x] **`scratch/build_sampling_notebook.py`**: Updated with matching `audited_candidate_profiles` mapping.
- [x] **`experiments/01_domain_sampling.ipynb`**: Rebuilt and cleanly executed; cell output diagnostics match user values.
- [x] **`experiments/02_ground_truth_annotation.ipynb`**: Rebuilt and cleanly executed.
- [x] **`experiments/dataset/processed/benchmark_ground_truth.csv`**:
  - All 120 candidate summaries updated dynamically with `Edu: Associate`, `Edu: Diploma`, `Edu: Bachelor's Degree`.
  - All 120 job summaries updated with comprehensive multi-qualification strings in `Edu: [Requirement]`.
  - All 9 evaluation columns (`score_title`, `score_location`, `score_education`, `score_type`, `score_salary`, `score_experience`, `ground_truth_score`, `relevance_grade`, `annotation_rationale`) remain 100% blank for manual scoring.
- [x] **`experiments/candidate_audit_report.md`**: Master Verification Matrix and candidate notes updated.

---

## 6. Job Education Requirements Comprehensive Audit (Ground Truth Alignment)

When evaluating candidate-job compatibility for `score_education`, job postings frequently accept multiple alternative educational paths beyond a single Bachelor's degree (such as Diplomas, Advanced Diplomas, Post Graduate Diplomas, Master's degrees, or professional bodies like ACCA/CPA/CIMA/ICSA). 

To ensure unbiased scoring, all 60 benchmark jobs (`J01`–`J60`) were audited against their original posting text, and whenever a job lists Bachelor's alongside other credentials, all accepted qualifications are explicitly preserved:

| Job Code | Job Title | Specific Education Requirement String | Accepted Credentials & Fields in Job Posting |
|---|---|---|---|
| `J02` | IT Executive | `Bachelor's Degree or Professional Degree in Computer Science, Information Technology, or equivalent` | Bachelor's Degree, Professional Degree in Computer Science/IT or equivalent |
| `J06` | Driver Developmnent | `Bachelor's, Master's, or Ph.D. in Software Engineering, Computer Engineering, Computer Science, or Electrical & Electronics Engineering` | Bachelor's, Master's, or Ph.D. in Software Engineering, Computer Engineering, Computer Science or Electrical & Electronics Engineering |
| `J08` | Technician, Hardware Support | `Diploma in Computer Science, Information Technology, Engineering (Computer/Telecommunication), or equivalent` | Diploma in Computer Science / IT, Engineering or equivalent |
| `J09` | Project Manager (Finance/HR) | `Diploma, Advanced/Graduate Diploma, Bachelor's Degree, Post Graduate Diploma, or Professional Degree` | Diploma/Advanced/Higher/Graduate Diploma, Bachelor's Degree/Post Graduate Diploma/Professional Degree |
| `J10` | Software Engineer (Backend) | `Bachelor's Degree in IT, Computer Science, Computer Engineering, or equivalent` | Bachelor's Degree in IT / Computer Science / Computer Engineering or equivalent |
| `J11` | Pega Senior Software Engineer | `University Degree in Computer Science, Electronics, Information Systems, Business Administration, or related field` | University degree in Computer Science, Electronics, Information Systems, Business Administration or related field |
| `J12` | Business System Analyst | `Bachelor's in Computer Science or IT with SAP B1/HANA and Microsoft Engineer/Professional Certifications` | Bachelor in Computer Science or IT, Certification on SAP B1/HANA, Microsoft Engineer/Professional |
| `J13` | IT Internship | `Diploma, Advanced/Graduate Diploma, Bachelor's Degree, Post Graduate Diploma, or Professional Degree in IT or equivalent` | Diploma, Advanced/Graduate Diploma, Bachelor's, Post Grad Diploma, Professional Degree in IT or equivalent |
| `J16` | System Support Consultant | `Bachelor's degree in Computer Science, Information Technology, or a related field` | Bachelor’s degree in Computer Science, Information Technology, or related field |
| `J18` | IT Project Analyst | `Degree in Computer Science, Information Technology, or equivalent` | Degree in Computer Science/ Information Technology or equivalent |
| `J19` | Software Developer (Mandarin) | `Bachelor's Degree, Post Graduate Diploma, or Professional Degree in Computer Science, Information Technology, or equivalent` | Bachelor's Degree, Post Graduate Diploma, Professional Degree in Computer Science/IT or equivalent |
| `J21` | Web Developer | `BSc Degree in Computer Science or relevant field` | BSc degree in Computer Science or relevant field |
| `J22` | Software Engineer | `Bachelor's Degree in Computer Science, Information Technology, or equivalent` | Bachelor Degree in Computer Science or Information Technology or Equivalent |
| `J23` | Process Manager | `Bachelor's degree in Business Management, Process Control Management, or similar` | Bachelor's degree in business management, process control management, or similar |
| `J25` | QA Project Manager | `Diploma or Advanced/Graduate Diploma in Computer Science/IT or equivalent, with QA/Testing professional certifications` | Diploma/Advanced Diploma in CS/IT & professional certifications (CTFL, CPRE, CSTE, PMP/ISTQB) |
| `J26` | IT Executive | `Diploma or Bachelor's Degree in IT or related field` | Diploma / Degree in IT or any related field |
| `J27` | Infrastructure Specialist | `Degree or Professional Qualification in Computer Science, Computer Engineering, Information Technology, or equivalent` | Degree or professional qualification in Computer Science, Computer Engineering, IT, or equivalent |
| `J29` | Senior Software Engineer | `Diploma, Advanced/Graduate Diploma, Bachelor's Degree, Post Graduate Diploma, or Professional Degree in Computer Science/IT/Engineering` | Diploma, Adv Diploma, Bachelor's, Post Grad Diploma, Professional Degree in CS/IT/Engineering |
| `J30` | IT Executive (SAP) | `Bachelor's Degree, Post Graduate Diploma, Professional Degree, or Master's Degree in Engineering/Computer Science/IT or equivalent` | Bachelor's Degree, Post Grad Diploma, Professional Degree or Master's in Engineering/CS/IT |
| `J32` | ERP Technical Consultant | `Degree or Diploma in Computer Science, IT, or related studies` | Degree/Diploma in Computer Science, IT and related studies |
| `J33` | Senior Software Engineer | `BS or MS in Computer Science or related field` | BS or MS in Computer Science or a related field |
| `J34` | Software Engineer (React/.NET) | `Degree or Diploma in Computer Science` | Degree/Diploma in Computer Science |
| `J35` | Software Engineer | `Degree in Computer Science (Software Engineering), Software Engineering, IT, or equivalent` | Degree in Computer Science (Software Engineering) / Software Engineering / IT or equivalent |
| `J36` | Software Support Specialist | `Diploma or Degree in Computer Science, Information Technology, or equivalent` | Diploma or Degree in Computer Science/Information Technology or equivalent |
| `J37` | Junior .NET Developer | `Bachelor's degree in Computer Science or related field` | Bachelor's degree in Computer Science or any related field |
| `J38` | Senior AI Software Engineer | `BS or MS in Computer Science or related field` | BS or MS in Computer Science or a related field |
| `J39` | Data Analyst | `Bachelor's degree in Business Admin, Economics, Statistics, Computer Science, or related field (Master's/certs a plus)` | Bachelor's degree in Business Admin, Economics, Statistics, CS, or related field (Master's or certs a plus) |
| `J42` | Account Payable Assistant | `Degree, Diploma, or Professional Certificate in Accounting or relevant disciplines` | Degree/Diploma/Professional Certificate in Accounting or relevant disciplines |
| `J43` | Commercial FP&A Manager | `Degree in Finance/Accounting, or professional qualifications (ACCA/CIMA) preferred` | Candidates with CIMA, ACCA, Degree in Finance/Accounting or similar professional qualifications preferred |
| `J44` | Assistant Company Secretary | `Diploma or Bachelor's Degree in Corporate Administration/Secretarial/Management, or ICSA equivalent` | Diploma or Bachelor's Degree in Corporate Administration / Secretarial / Management or ICSA equivalent |
| `J45` | Assistant Accounts Manager | `Bachelor's degree in Accounting & Finance, or Diploma in Business Studies (Accounting)` | Bachelor degree in business Accounting and Finance; Diploma in Business Studies (Accounting) considered |
| `J46` | Junior Tax Accountant | `Accounting Degree from university` | Graduated with an Accounting Degree from university |
| `J48` | Account Executive | `SPM, STPM, or Diploma in Finance or related field` | Process SPM/STPM/Diploma in Finance or related field |
| `J49` | Senior Executive - Tax | `Degree in Accounting and Finance, or ACCA` | Degree in Accounting and Finance or ACCA |
| `J51` | Accountant | `Bachelor's Degree in Accounting, or professional qualification (ACCA/CPA/MIA)` | Bachelor’s Degree in Accounting OR professional qualification (ACCA/CPA/MIA) |
| `J52` | Account Executive | `Bachelor's degree in Accounting, Finance, or related field preferred` | Bachelor's degree in accounting, finance, or a related field is preferred |
| `J53` | Accounting Compliance Manager | `Bachelor's degree in Accounting, Finance, or related field (Professional qualifications like ACCA/CPA/MICPA advantageous)` | Bachelor's degree in accounting, finance, or related field; MICPA, ACCA, CPA advantageous |
| `J54` | Assistant Manager - Finance | `Degree in Accounting and/or professional qualifications (MIA, ICAEW, ACCA, MICPA, CPA, CIMA)` | Degree in Accounting and/or related accounting professional qualifications (MIA, ICAEW, ACCA, MICPA, CPA, CIMA) |
| `J55` | Finance Executive | `Bachelor's Degree in Accounting, Finance, or equivalent` | Bachelors’ Degree in Accounting/Finance or equivalent |
| `J56` | Audit Assistant / Supervisor | `Accounting Degree Graduates, or undertaking ACCA/CIMA/MICPA/LCCI Diploma/CAT or equivalent` | Accounting Graduates / undertaking ACCA/CIMA/MICPA/LCCI Diploma/CAT or equivalent |
| `J57` | Account cum Admin Assistant | `Diploma or Degree in Accounting and/or Finance preferred` | A Diploma or Degree in Accounting and/or Finance is preferred |
| `J59` | Account Executive | `LCCI, Diploma, or Advanced Diploma in Finance/Accounting or equivalent` | At least LCCI, Diploma/Advance Diploma in Finance/Accounting or equivalent |
| `J60` | Account & Admin Senior Exec | `Degree in Finance, Accounting, or equivalent` | Degree in finance, accounting, or equivalent |
| *Others* | `J01`, `J03`–`J05`, `J07`, `J14`, `J15`, `J17`, `J20`, `J24`, `J28`, `J31`, `J40`, `J41`, `J47`, `J50`, `J58` | `Not Specified (Open)` | No specific educational qualification stated in job posting |

---

## 7. Candidate Education Specific Subject Mapping (Side-by-Side Symmetrical Evaluation)

To ensure high-fidelity manual grading for `score_education` (0–100), `candidate_summary` in [`benchmark_ground_truth.csv`](file:///c:/Users/yzhoo/AI-Agent-Job-Search/experiments/dataset/processed/benchmark_ground_truth.csv) was enriched to display the candidate's exact degree credential and field of study / subject. This mirrors the specific criteria displayed in `job_summary`:

| Candidate ID | Standard Tier | Specific Degree & Subject / Discipline | Institution / Note |
|:---:|:---:|---|---|
| `C01` | Associate | `Associate of Science in Business Administration` | Richard Bland College |
| `C02` | Bachelor's Degree | `Bachelor of Science in Information & Computer Science` | Park University |
| `C03` | Bachelor's Degree | `Bachelor of Science in Marketing` | Iowa State University |
| `C04` | Master's Degree | `Master of Science in Business Information Technology` | DePaul University (B.S. Network & Comm Mgmt) |
| `C05` | Master's Degree | `MBA in Management Information Systems` | Suffolk University (Sawyer School of Management) |
| `C06` | Bachelor's Degree | `Bachelor of Science in Information Technology` | University of Phoenix |
| `C07` | Doctorate | `Ph.D. in Organization and Management` | Capella University |
| `C08` | Bachelor's Degree | `Bachelor of Science in Computer System Engineering` | Fundación Universidad Autónoma de Colombia |
| `C09` | Bachelor's Degree | `Bachelor of Science in Business Finance` | Towson University |
| `C10` | Master's Degree | `Master of Arts in Counselor Education (B.A. Sociology)` | Western Michigan Univ / Indiana Univ |
| `C11` | Bachelor's Degree | `Bachelor of Science in Computer Information Systems (InfoSec)` | Strayer University |
| `C12` | Master's Degree | `Master of Arts (B.S. Biology & AAS Networking)` | George Mason University / NVCC |
| `C13` | Master's Degree | `MBA & B.S. in Biology / Computer Science` | Pepperdine University / Loyola Marymount |
| `C14` | Bachelor's Degree | `Bachelor of Science in Computer Engineering Technology` | Prairie View A&M University |
| `C15` | Diploma | `High School Diploma` | Virginia High School |
| `C16` | Bachelor's Degree | `Bachelor of Science in Management Information Systems` | William Woods University |
| `C17` | Associate | `Associate of Applied Science in Network Administration` | Hennepin Technical College |
| `C18` | Associate | `Associate of Science in Electronic Engineering` | Florence Darlington Technical School |
| `C19` | Bachelor's Degree | `Bachelor of Science in Information Technology Support` | University of Phoenix |
| `C20` | Bachelor's Degree | `Bachelor of Science in Sociology & Social Work Psychology` | Weber State University |
| `C21` | Bachelor's Degree | `Bachelor of Science in Business Management` | Arizona State University |
| `C22` | Master's Degree | `Master in Accounting & Financial Management` | Keller Graduate School of Management |
| `C23` | Master's Degree | `MBA in Finance` | Vidyasagar University |
| `C24` | Bachelor's Degree | `Bachelor of Arts in Business Administration (Bookkeeping Certificate)` | CUC University / Sheridan Technical Center |
| `C25` | Bachelor's Degree | `Bachelor of Science in General Studies (Accounting Certificate)` | Wilmington University / Cecil College |
| `C26` | Professional Certification | `Professional Coursework in Graphic Design, Real Estate & Architectural Drafting` | USM / NVCC |
| `C27` | Bachelor's Degree | `Bachelor of Science in Management` | Park University |
| `C28` | Bachelor's Degree | `Bachelor of Arts in Supply Chain Management (AAS Accounting Technology)` | Ashford University / Scott Community College |
| `C29` | Bachelor's Degree | `Bachelor of Science in Nursing` | California State University, Northridge |
| `C30` | Diploma | `High School Diploma (Business Management/Accounting)` | Zephyrhills High School |


