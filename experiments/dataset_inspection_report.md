# Comprehensive Dataset Inspection Report: Kaggle Resume & JobStreet Datasets

**Inspection Date**: October 18, 2026  
**Investigator**: AI Pair Programmer (Antigravity) & Student Researcher  
**Scope**: Verification of Kaggle Resume Dataset & JobStreet Job Dataset for FYP CV-Job Matching Experiments  
**Target Architecture**: Six-factor matching (Skills, Work Experience, Education, Expected Salary, Preferred Location, Job Type)

---

## Executive Summary & Verdict

| Dataset | File Verified | Record Count | Quality Assessment | Usability for 6 Factors |
|---|---|---|---|---|
| **Kaggle Resume Dataset** | `Resume/Resume.csv` + `data/*.pdf` | 2,484 resumes | **High Quality Qualifications**, but **Lacks Search Preferences** | Suitable for Skills, Experience, Education; **Requires Synthetic User Preferences** for Salary, Location, Job Type. |
| **JobStreet Dataset** | `jobstreet_all_job_dataset.csv` | 59,306 job postings | **Matches HF `azrai99/job-dataset` 100%**, but has 55.1% missing salaries and encoding artifacts | Suitable for Malaysian market; **Requires text extraction & salary cleaning**. |
| **Ground-Truth Labels** | None (Datasets are unpaired) | 0 paired labels | **Missing Ground Truth** | **Cannot calculate true NDCG/Precision/Recall without a labeled benchmark test set.** |

---

## 1. Kaggle Resume Dataset Inspection

### 1.1 File Structure & Integrity
* **Primary CSV Path**: `experiments/dataset/resume dataset/Resume/Resume.csv`
* **File Size**: `53.67 MB`
* **PDF Folder Path**: `experiments/dataset/resume dataset/data/`
  * Contains **24 category subfolders** with exactly **2484 individual PDF resumes**.
  * The PDF files directly correspond 1-to-1 with the rows in `Resume.csv`.
* **Processed Extraction**: `experiments/dataset/processed/resumes_extracted.csv` (contains 2484 records parsed via PyMuPDF).

### 1.2 Schema & Column Verification
The dataset contains **4 columns**:
1. `ID` (`int64`): Unique candidate identifier (no duplicates).
2. `Resume_str` (`object`): Cleaned plain-text resume content.
3. `Resume_html` (`object`): Rich-text HTML resume markup.
4. `Category` (`object`): Professional job domain (24 classes).

### 1.3 Record Count & Category Breakdown
Total verified rows: **2484**.
* Missing values: **0** across all 4 columns in the CSV.
* Duplicate IDs: **0** (0.0%).
* Duplicate Text: **2** resumes (0.08%) share identical text bodies.
* Empty/Trivial Resumes: **1 empty resume** (ID `12632728`, Category `BUSINESS-DEVELOPMENT` has 0 words).

#### Category Distribution (24 Categories)
```text
Category
INFORMATION-TECHNOLOGY    120
BUSINESS-DEVELOPMENT      120
ADVOCATE                  118
CHEF                      118
FINANCE                   118
ENGINEERING               118
ACCOUNTANT                118
FITNESS                   117
AVIATION                  117
SALES                     116
HEALTHCARE                115
CONSULTANT                115
BANKING                   115
CONSTRUCTION              112
PUBLIC-RELATIONS          111
HR                        110
DESIGNER                  107
ARTS                      103
TEACHER                   102
APPAREL                    97
DIGITAL-MEDIA              96
AGRICULTURE                63
AUTOMOBILE                 36
BPO                        22
```

### 1.4 Text Content & Structure Analysis
* **Average Word Count**: 811.3 words (Std: 371.0, Median: 757, Min: 0, Max: 5190).
* **Document Structure**: Resumes follow standard US/international professional formatting, typically divided into:
  * *Executive Summary / Professional Summary*
  * *Core Qualifications / Skills / Highlights*
  * *Professional Experience / Work History*
  * *Education & Academic Background*
  * *Certifications / Accomplishments*

---

## 2. JobStreet Job Dataset Inspection

### 2.1 Verification Against Hugging Face `azrai99/job-dataset`
* **Local File Path**: `experiments/dataset/job_dataset/jobstreet_all_job_dataset.csv`
* **File Size**: `117.69 MB`
* **README & Documentation**: Accompanied by official Hugging Face `README.md` and `.gitattributes` confirming repository source `https://huggingface.co/datasets/azrai99/job-dataset` (curated by Azrai Mahadan).
* **Column Schema Check**:
  * **Matches official HF schema exactly**: **`True`** (11/11 columns match name and ordering).

### 2.2 Schema & Missing Values Audit
Total verified rows: **59,306**.

| Column | Data Type | Missing Count | Missing % | Status / Description |
|---|---|---|---|---|
| `job_id` | `int64` | 0 | 0.00% | Unique JobStreet identifier (0 duplicates) |
| `job_title` | `object` | 0 | 0.00% | Job posting title (34,686 unique titles) |
| `company` | `object` | 0 | 0.00% | Hiring organization name |
| `descriptions` | `object` | 0 | 0.00% | Full job description text (mean 262 words) |
| `location` | `object` | 0 | 0.00% | Malaysian city/state (204 unique locations) |
| `category` | `object` | 0 | 0.00% | Primary industry category (30 categories) |
| `subcategory` | `object` | 0 | 0.00% | Detailed sub-discipline |
| `role` | `object` | 1,936 | 3.26% | Specific standardized role classification |
| `type` | `object` | 0 | 0.00% | Employment type (Full time, Contract, etc.) |
| `salary` | `object` | 32,665 | **55.08%** | Disclosed in only **44.92%** of postings |
| `listingDate` | `object` | 0 | 0.00% | ISO/JobStreet listing timestamp |

### 2.3 Detailed Field Inspection

#### A. Salary (`salary`)
* **Critical Finding**: **55.08% of job ads do NOT disclose salary** (32,665 missing).
* **Data Quality Issue (Encoding Artifacts)**: When salary is present, non-ASCII encoding corruption exists:
  * Raw sample: `'RM\xa02,800  RM\xa03,200 per month'`
  * The range separator was corrupted into the Unicode replacement character `` (`\ufffd`), and contains non-breaking spaces `\xa0`.
  * Regex normalization is required before numeric parsing: `r'RM\s*([\d,]+)\s*[^\d]+\s*RM\s*([\d,]+)'`.

#### B. Location (`location`)
* **100% Malaysian Geography**:
  * Top locations: Kuala Lumpur (13,712), Petaling (9,746), Johor Bahru District (4,480), Shah Alam/Subang (2,574), Selangor (2,548).

#### C. Employment Type (`type`)
* Highly skewed toward permanent full-time employment:
  * `Full time`: 53,790 (90.7%)
  * `Contract/Temp`: 4,976 (8.4%)
  * `Part time`: 289 (0.5%)
  * `Casual/Vacation`: 251 (0.4%)

#### D. Descriptions (`descriptions`)
* Contains raw, unstructured text merging company overview, duties, requirements, minimum qualifications, and benefits.
* 35 jobs have < 5 words; 159 jobs (0.27%) have < 20 words.
* Duplicates: **4,755 duplicate job postings** (8.02%) have identical (job_title, company, location).

---

## 3. Suitability Assessment for the Six Matching Factors

Your proposed matching system evaluates candidates across **six core factors**:
1. Skills
2. Work Experience
3. Education
4. Expected Salary
5. Preferred Location
6. Job Type

Here is the exact suitability evaluation for each factor across both datasets:

| Matching Factor | Kaggle Resume Dataset | JobStreet Dataset (`azrai99`) | Alignment & Suitability Verdict |
|---|---|---|---|
| **1. Skills** | **Rich**: Contained in Summary, Highlights, Experience. | **Rich**: Contained in `descriptions`. | **SUITABLE**: Both contain rich skill keywords. Requires text extraction or LLM structuring into skill sets. |
| **2. Work Experience** | **Rich**: Explicit roles, companies, dates, and duties. | **Moderate**: Stated inside `descriptions` (e.g. "Min 3 years"). | **SUITABLE**: Both support experience extraction (years and role seniority). |
| **3. Education** | **Rich**: Specific degrees (BS, MS, Diploma), universities, majors. | **Moderate**: Stated inside `descriptions` (e.g. "Degree in CS or equivalent"). | **SUITABLE**: Both support education level and field extraction. |
| **4. Expected Salary** | **ABSENT (0%)**: Resumes do not contain candidate's expected salary. | **SPARSE (44.9%)**: 55.1% missing; contains encoding errors (`RM...  RM...`). | **UNSUITABLE AS-IS**: Requires preprocessing. Resumes must be augmented with simulated candidate salary expectations (e.g., RM 4,000–6,000) or salary must be treated as neutral when absent. |
| **5. Preferred Location** | **MISMATCHED**: Candidate locations are US/international (Chicago, NY, Texas). | **100% Malaysian**: Locations are KL, Selangor, Johor, Penang, etc. | **UNSUITABLE AS-IS**: Direct matching between US resume addresses and Malaysian job locations will result in 0% location scores across all pairs. Requires assigning target Malaysian location preferences to candidate profiles. |
| **6. Job Type** | **IMPLICIT ONLY**: Resumes list past job types, but not candidate's target preference. | **Present**: `type` column exists, but is 90.7% Full time. | **MODERATELY SUITABLE**: Can be matched if candidate preference is explicitly designated (e.g., "Full time"). |

---

## 4. The Ground-Truth Relevance Label Dilemma

### Is There an Existing Ground Truth?
**No.** The Kaggle Resume Dataset and the Hugging Face JobStreet Dataset are **two completely separate, unpaired collections**:
* The Kaggle dataset was scraped from US LiveCareer profiles.
* The JobStreet dataset was scraped from Malaysian job boards.
* There is **no pre-existing ground truth table** that specifies:
  $$\text{Resume }_i \longleftrightarrow \text{Job }_j = \text{Relevance Score (0, 1, 2, or 3)}$$

### Why Ground Truth is Mandatory for FYP Research
If you want to scientifically compare your 4 matching methods:
1. *Traditional Prompt*
2. *Zero-Shot CoT*
3. *Literature Fixed Weighting*
4. *Dynamic LLM Weighting*

You **cannot calculate IR/ranking metrics** (such as **NDCG@K, MAP, Precision@K, Recall@K, Spearman's $\rho$**) without ground-truth relevance labels to compare against. Without ground truth, you can only observe score correlations between models, but cannot claim which model is objectively more accurate.

### Recommended Strategy for Establishing Ground Truth

You have **three viable options**:

#### Option A: Curated Benchmark Test Set with Expert/LLM Annotation (Recommended)
1. Select a focused domain subset (e.g., **Information Technology** or **Finance/Accounting**).
   * 20 representative resumes from the domain.
   * 50 representative jobs from the domain.
   * Matrix of $20 \times 50 = 1,000$ candidate-job pairs (or top-5 retrieved pairs per candidate = 100 pairs).
2. Establish standardized grading guidelines (0 = Irrelevant, 1 = Partially Relevant, 2 = Highly Relevant).
3. Annotate the pairs using human judgment (you and peer reviewers) or an ensemble LLM-as-a-judge protocol.
4. Use this curated benchmark as the **Gold Standard** to evaluate NDCG@K and Precision@K across all 4 experimental methods.

#### Option B: Category Alignment Coarse Ground Truth (Weak Supervision)
* Define relevance based on taxonomy overlap:
  * High match: Resume Category matches Job Category (e.g., `INFORMATION-TECHNOLOGY` == `Information & Communication Technology`).
  * Non-match: Resume Category differs completely from Job Category (e.g., `CHEF` vs. `Information & Communication Technology`).
* **Pros**: No manual annotation needed.
* **Cons**: Too coarse — does not evaluate whether a Junior Python Developer matches a Senior Java Architect within the same category.

#### Option C: Synthetic Paired Benchmark Dataset
* Synthesize realistic candidate preferences (target salary in RM, target Malaysian state, target job title) attached to each Kaggle resume.

---

## 5. Required Preprocessing Pipeline

To prepare both datasets for the experiments, the following preprocessing steps are required:

### For the JobStreet Dataset:
1. **Deduplication**: Remove the 4,755 duplicate job postings sharing identical `(job_title, company, location)`.
2. **Short Description Filtering**: Filter out the 159 jobs with `< 20 words`.
3. **Salary Cleaning & Normalization**:
   * Replace `\xa0` and corrupted separator `` with a standard hyphen `-`.
   * Parse `RM X,XXX - RM Y,YYY per month` into numeric `salary_min` and `salary_max`.
   * Flag undisclosed salaries as `is_salary_disclosed = False`.
4. **Information Extraction**: Run an LLM or keyword extractor over `descriptions` to extract explicit lists for:
   * `required_skills` (list of strings)
   * `required_experience_years` (number)
   * `required_education` (minimum degree level)

### For the Kaggle Resume Dataset:
1. **Remove Empty Records**: Drop row 656 (ID `12632728`, 0 words) and duplicate text entries.
2. **Qualification Extraction**: Extract structured attributes from `Resume_str`:
   * `candidate_skills`
   * `total_experience_years`
   * `highest_education_level`
3. **Search Preference Augmentation (Crucial Step)**:
   * Because Kaggle resumes are candidate qualification documents and lack job search preferences, you must synthesize realistic **User Search Profiles**:
     * `preferred_location`: (e.g., Kuala Lumpur, Selangor, Penang, Johor)
     * `expected_salary_min` & `expected_salary_max`: (e.g., RM 3,500 – RM 5,500)
     * `target_job_titles`: (e.g., "Software Engineer", "Full Stack Developer")
     * `preferred_job_type`: (e.g., "Full time")

---

## 6. Summary Checklist

- [x] Kaggle Resume Dataset verified: 2,484 resumes, 24 categories, 1 empty record identified.
- [x] Job dataset verified against Hugging Face `azrai99/job-dataset`: 59,306 rows, 11/11 columns match official schema.
- [x] Missing values identified: JobStreet salary missing 55.08%; role missing 3.26%.
- [x] Encoding issues detected: JobStreet salary contains `\xa0` and `` character corruption.
- [x] Factor suitability assessed: Skills, Experience, Education are rich; Salary and Location require candidate preference synthesis.
- [x] Ground-truth status confirmed: Datasets are unpaired; a benchmark ground-truth test set must be established.
