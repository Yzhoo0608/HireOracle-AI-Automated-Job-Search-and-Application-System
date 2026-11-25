# Experiment 02: LLM-Based Semantic Scoring Pipeline
"""
Uses Groq (openai/gpt-oss-120b) to automatically score candidate-job fit
across six standardized dimensions (0-100) for all 120 benchmark pairs:
  1. score_title      : Job Title Compatibility
  2. score_location   : Location Compatibility
  3. score_education  : Qualification Level Alignment
  4. score_type       : Employment Type Alignment
  5. score_salary     : Salary Compatibility
  6. score_experience : Years & Depth of Experience

Outputs:
  - experiments/methods/results/semantic_scores_120.csv
"""

import os
import sys
import json
import time
import pandas as pd
from pathlib import Path
from groq import Groq
from dotenv import load_dotenv


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ------------------------------------------------------------
# Paths & Configuration
# ------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env.local")

sys.path.append(str(BASE_DIR / "experiments" / "methods"))
from data_loader import (
    FACTORS,
    FACTOR_TO_GT_SCORE_COLUMN,
    RESULTS_DIR,
    load_and_verify_datasets,
)

OUTPUT_FILE = RESULTS_DIR / "semantic_scores_120.csv"
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
API_KEY = os.getenv("GROQ_API_KEY")

if not API_KEY:
    raise ValueError("GROQ_API_KEY environment variable not found in .env.local")

client = Groq(api_key=API_KEY)

MAX_RETRIES = 10
INITIAL_BACKOFF = 2.0  # seconds
REQUEST_INTERVAL = 0.8  # seconds between calls to respect rate limits

OUTPUT_COLUMNS = [
    "pair_id",
    "candidate_id",
    "job_id_code",
    "pair_type",
    # 6 Predicted Semantic Scores
    "score_title_pred",
    "score_location_pred",
    "score_education_pred",
    "score_type_pred",
    "score_salary_pred",
    "score_experience_pred",
    # 6 Human Ground-Truth Scores (for reference)
    "score_title_gt",
    "score_location_gt",
    "score_education_gt",
    "score_type_gt",
    "score_salary_gt",
    "score_experience_gt",
    "ground_truth_score",
    "relevance_grade",
    # LLM Reasoning per factor
    "reason_title",
    "reason_location",
    "reason_education",
    "reason_type",
    "reason_salary",
    "reason_experience",
    # Operational metadata
    "latency_seconds",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "retry_count",
    "status",
]

# ------------------------------------------------------------
# Prompt 
# ------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert human recruitment evaluator and candidate-job matching benchmark annotator.
Your task is to evaluate a candidate's CV against a job advertisement and assign compatibility scores from 0 to 100 for each of the following six matching factors:

1. score_title (Job Title & Skills): Alignment between candidate's title, domain, and skills vs. job title and core responsibilities. (100 = exact match / strong overlap; 70-85 = relevant adjacent role; 30-60 = distant role in same domain; 0 = completely unrelated/cross-domain).
2. score_location (Location Compatibility): Geographical commute or location alignment in Malaysia. (100 = same city/district or candidate is open to any; 70-90 = adjacent city in Klang Valley like KL <-> PJ/Shah Alam; 30-50 = inter-state requiring relocation; 0 = incompatible).
3. score_education (Qualification Level): Formal education alignment. (100 = candidate's degree meets or exceeds job requirements; 50-80 = minor degree gap compensated by experience; 0 = job advertisement does not specify an education requirement OR candidate completely lacks required qualification).
4. score_type (Job Type): Employment arrangement match. (100 = exact match e.g. Full time <-> Full time; 50 = contract vs full time or minor discrepancy; 0 = incompatible).
5. score_salary (Salary Compatibility): Alignment between candidate's expected salary and job offered salary. (100 = candidate expectation overlaps offered range; 50-80 = candidate expectation close within 15-20% of bounds; 0 = job advertisement does not disclose salary OR major mismatch).
6. score_experience (Years of Experience): Length and seniority of relevant professional experience. (100 = candidate experience meets or exceeds job requirements; 70-90 = within 1-2 years; 30-60 = noticeable seniority/junior gap; 0 = completely lacking relevant domain experience).

IMPORTANT: Keep reasoning concise (1-2 sentences per factor).

You MUST output ONLY a valid JSON object with the following schema:
{
  "scores": {
    "score_title": <integer between 0 and 100>,
    "score_location": <integer between 0 and 100>,
    "score_education": <integer between 0 and 100>,
    "score_type": <integer between 0 and 100>,
    "score_salary": <integer between 0 and 100>,
    "score_experience": <integer between 0 and 100>
  },
  "reasoning": {
    "title": "Concise justification for title/skills score",
    "location": "Concise justification for location score",
    "education": "Concise justification for education score",
    "job_type": "Concise justification for job type score",
    "salary": "Concise justification for salary score",
    "experience": "Concise justification for experience score"
  }
}
"""


def build_user_prompt(row: pd.Series) -> str:
    resume_text = str(row.get("clean_resume_text", ""))
    if len(resume_text) > 1200:
        resume_text = resume_text[:1200] + "..."

    job_desc = str(row.get("descriptions", ""))
    if len(job_desc) > 1500:
        job_desc = job_desc[:1500] + "..."

    salary_display = (
        row["salary_raw"]
        if row.get("is_salary_disclosed") and pd.notna(row.get("salary_raw"))
        else "Undisclosed"
    )

    return f"""EVALUATE THIS CANDIDATE-JOB PAIR:

CANDIDATE PROFILE:
- Candidate ID: {row['candidate_id']}
- Preferred Job Title: {row['preferred_job_title']}
- Professional Domain: {row['category_candidate']}
- Seniority Tier: {row['experience_tier']} ({row['detected_experience_years']} years verified)
- Highest Education: {row['detected_education']}
- Key Skills: {row['extracted_skills']}
- Preferred Location: {row['preferred_location']}
- Expected Salary: RM {row['expected_salary_min']} - RM {row['expected_salary_max']}
- Preferred Job Type: {row['preferred_job_type']}
- Resume Content:
{resume_text}

JOB VACANCY DETAILS:
- Job Code: {row['job_id_code']}
- Job Title: {row['job_title']}
- Company: {row['company']}
- Domain / Subcategory: {row['category_job']} / {row['subcategory']}
- Location: {row['location']}
- Job Type: {row['job_type']}
- Required Education: {row['required_education']}
- Salary Offered: {salary_display}
- Job Description:
{job_desc}

Carefully evaluate the candidate against the vacancy across all six factors and output the required JSON.
"""


# ------------------------------------------------------------
# LLM INFERENCE WITH RETRIES & VALIDATION
# ------------------------------------------------------------

def call_scoring_with_retry(prompt: str) -> tuple[dict, float, int, int, int, int]:
    retry_count = 0
    backoff = INITIAL_BACKOFF

    while retry_count <= MAX_RETRIES:
        try:
            start_time = time.perf_counter()
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
                response_format={"type": "json_object"},
                max_tokens=2048,
            )
            latency = time.perf_counter() - start_time

            raw_content = response.choices[0].message.content
            parsed = json.loads(raw_content)

            # Validate scores dictionary
            if "scores" not in parsed:
                raise ValueError("JSON output missing 'scores' key")
            scores = parsed["scores"]

            req_scores = [
                "score_title",
                "score_location",
                "score_education",
                "score_type",
                "score_salary",
                "score_experience",
            ]
            for s in req_scores:
                if s not in scores:
                    raise ValueError(f"Missing score field '{s}' in output")
                val = float(scores[s])
                if not (0 <= val <= 100):
                    raise ValueError(f"Score {s}={val} out of bounds [0, 100]")
                scores[s] = int(round(val))

            reasoning = parsed.get("reasoning", {})

            prompt_tokens = response.usage.prompt_tokens if response.usage else 0
            completion_tokens = response.usage.completion_tokens if response.usage else 0
            total_tokens = response.usage.total_tokens if response.usage else 0

            return (
                {"scores": scores, "reasoning": reasoning},
                latency,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                retry_count,
            )

        except Exception as e:
            err_str = str(e)
            retry_count += 1
            if retry_count > MAX_RETRIES:
                raise RuntimeError(
                    f"Failed after {MAX_RETRIES} retries. Last error: {err_str}"
                )

            # Check if Groq specified an exact wait duration in the rate limit message
            sleep_time = backoff
            import re
            m_min_sec = re.search(r"try again in (\d+)m([\d\.]+)s", err_str)
            m_sec = re.search(r"try again in ([\d\.]+)s", err_str)
            if m_min_sec:
                mins = int(m_min_sec.group(1))
                secs = float(m_min_sec.group(2))
                sleep_time = (mins * 60) + secs + 5.0
            elif m_sec:
                sleep_time = float(m_sec.group(1)) + 5.0

            print(f"  [Retry {retry_count}/{MAX_RETRIES}] Rate limit/Error encountered -> sleeping {sleep_time:.1f}s...")
            time.sleep(sleep_time)
            backoff *= 2.0


# ------------------------------------------------------------
# Main Execution
# ------------------------------------------------------------

def run_semantic_scoring(limit: int = None):
    print("=" * 70)
    print("EXPERIMENT 04: AUTOMATED SEMANTIC SCORING PIPELINE")
    print(f"Model: {MODEL} | Temperature: 0")
    print("=" * 70)

    gt_df, jobs_df, resumes_df, merged_df = load_and_verify_datasets(verbose=False)

    # Check for existing checkpoint
    completed_pairs = set()
    records = []
    if OUTPUT_FILE.exists():
        existing_df = pd.read_csv(OUTPUT_FILE)
        completed_pairs = set(existing_df["pair_id"].dropna().unique())
        records = existing_df.to_dict("records")
        print(f"Found existing checkpoint with {len(completed_pairs)} completed pairs.")

    pairs_to_process = merged_df[~merged_df["pair_id"].isin(completed_pairs)]
    if limit is not None:
        pairs_to_process = pairs_to_process.head(limit)

    total_target = len(merged_df) if limit is None else limit
    print(f"Total pairs to process this run: {len(pairs_to_process)} / {total_target}")

    for idx, (_, row) in enumerate(pairs_to_process.iterrows(), 1):
        pair_id = row["pair_id"]
        cid = row["candidate_id"]
        jcode = row["job_id_code"]
        ptype = row["pair_type"]

        print(f"[{len(completed_pairs) + 1}/{total_target}] Scoring {pair_id} ({cid} vs {jcode}) [{ptype}]...", end="", flush=True)

        user_prompt = build_user_prompt(row)
        data, latency, p_tok, c_tok, t_tok, retries = call_scoring_with_retry(user_prompt)

        scores = data["scores"]
        reasons = data.get("reasoning", {})

        record = {
            "pair_id": pair_id,
            "candidate_id": cid,
            "job_id_code": jcode,
            "pair_type": ptype,
            # Predicted scores
            "score_title_pred": scores["score_title"],
            "score_location_pred": scores["score_location"],
            "score_education_pred": scores["score_education"],
            "score_type_pred": scores["score_type"],
            "score_salary_pred": scores["score_salary"],
            "score_experience_pred": scores["score_experience"],
            # Ground truth reference
            "score_title_gt": float(row["score_title"]),
            "score_location_gt": float(row["score_location"]),
            "score_education_gt": float(row["score_education"]),
            "score_type_gt": float(row["score_type"]),
            "score_salary_gt": float(row["score_salary"]),
            "score_experience_gt": float(row["score_experience"]),
            "ground_truth_score": float(row["ground_truth_score"]),
            "relevance_grade": int(row["relevance_grade"]),
            # Reasons
            "reason_title": reasons.get("title", ""),
            "reason_location": reasons.get("location", ""),
            "reason_education": reasons.get("education", ""),
            "reason_type": reasons.get("job_type", ""),
            "reason_salary": reasons.get("salary", ""),
            "reason_experience": reasons.get("experience", ""),
            # Metadata
            "latency_seconds": round(latency, 3),
            "prompt_tokens": p_tok,
            "completion_tokens": c_tok,
            "total_tokens": t_tok,
            "retry_count": retries,
            "status": "success",
        }

        records.append(record)
        completed_pairs.add(pair_id)

        # Write to disk after every pair (checkpointing)
        out_df = pd.DataFrame(records, columns=OUTPUT_COLUMNS)
        out_df.sort_values(by="pair_id", inplace=True)
        out_df.to_csv(OUTPUT_FILE, index=False)

        print(f" DONE in {latency:.2f}s (Tokens: {t_tok})")
        time.sleep(REQUEST_INTERVAL)

    print("=" * 70)
    print(f"SUCCESS: All {len(completed_pairs)} pairs completed and saved to:")
    print(f"  {OUTPUT_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    run_semantic_scoring()
