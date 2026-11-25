# method3_llm_dynamic_weighting.py

import os
import json
import time
import pandas as pd
from pathlib import Path
from groq import Groq
from dotenv import load_dotenv

from data_loader import (
    BASE_DIR,
    FACTORS,
    FACTOR_TO_GT_SCORE_COLUMN,
    RESULTS_DIR,
    load_and_verify_datasets,
)


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

load_dotenv(BASE_DIR / ".env.local")

METHOD_NAME = "llm_dynamic_weighting"

VACANCY_WEIGHTS_FILE = RESULTS_DIR / "method3_vacancy_weights_60.csv"
OUTPUT_FILE = RESULTS_DIR / "method3_llm_dynamic_results.csv"

MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Set to None for all 60 vacancies
TEST_LIMIT = None

MAX_RETRIES = 3
SLEEP_BETWEEN_RETRIES = 1

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ------------------------------------------------------------
# Six factors 
# ------------------------------------------------------------

FACTOR_WEIGHT_FIELDS = [
    "job_title_weight",
    "location_weight",
    "qualification_level_weight",
    "job_type_weight",
    "salary_weight",
    "years_of_experience_weight",
]

FACTOR_REASON_FIELDS = [
    "job_title_reason",
    "location_reason",
    "qualification_level_reason",
    "job_type_reason",
    "salary_reason",
    "years_of_experience_reason",
]

VACANCY_OUTPUT_FIELDS = [
    "job_id_code",
    "job_id",
    "job_title",
    "company",
    "category",
    "subcategory",
    "method",
    *FACTOR_WEIGHT_FIELDS,
    "weight_sum",
    *FACTOR_REASON_FIELDS,
    "overall_reason",
    "latency_seconds",
    "last_attempt_latency_seconds",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "retry_count",
    "status",
    "error",
    "raw_response",
]

PAIR_OUTPUT_FIELDS = [
    "pair_id",
    "candidate_id",
    "job_id_code",
    "pair_type",
    "method",
    # Six factor scores
    "job_title_score",
    "location_score",
    "qualification_level_score",
    "job_type_score",
    "salary_score",
    "years_of_experience_score",
    # Six LLM-inferred weights 
    "job_title_weight",
    "location_weight",
    "qualification_level_weight",
    "job_type_weight",
    "salary_weight",
    "years_of_experience_weight",
    "weight_sum",
    # Predicted & Ground-Truth matching scores
    "overall_score",
    "overall_score_exact",
    "ground_truth_score",
    "relevance_grade",
    # Concise reasons from LLM
    *FACTOR_REASON_FIELDS,
    "overall_reason",
    "latency_seconds",
    "last_attempt_latency_seconds",
    "prompt_tokens",
    "completion_tokens",
    "total_tokens",
    "retry_count",
    "status",
    "error",
    "raw_response",
]


# ------------------------------------------------------------
# Zero-Shot CoT Prompt 
# -----------------------------------------------------------

WEIGHTING_INSTRUCTIONS = """
You are evaluating a job vacancy to determine the relative importance (percentage weights) of six candidate-job matching factors for this specific role.

Evaluate ONLY these six factors, in this exact order:

1. Job title
2. Location
3. Qualification level
4. Job type
5. Salary
6. Years of experience

Do not use any other factor or add skills as a seventh factor.

For each factor, carefully examine the vacancy's stated requirements, role specialization, seniority expectations, and which details are explicitly specified versus not specified or undisclosed in the job posting.

Think through the relative importance of the six factors step by step internally before giving the final answer.

IMPORTANT:
- Do NOT reveal your chain-of-thought or hidden reasoning.
- Only provide the final numerical weights and concise reasons.
- Base your evaluation only on the vacancy information provided.
- Do not invent missing information.
- Each weight must be a number between 0 and 100 representing a percentage (%).
- The six weights MUST sum to exactly 100.
- Weights should reflect this specific vacancy's requirements and priorities.
- Do NOT simply assign equal uniform weights (16.67% each).
- Do NOT simply copy fixed predefined weights (such as 21, 21, 16, 16, 15, 11).

FACTOR DEFINITIONS:

1. Job title:
How critical it is that the candidate's professional role/title and functional specialization align with the vacancy's job title and core duties.

2. Location:
How critical geographical proximity or location compatibility is for this specific vacancy.

3. Qualification level:
How critical formal academic education or professional certification is for this vacancy (consider whether a specific degree/diploma/certification is required or if education is "Not Specified").

4. Job type:
How critical employment type alignment (e.g., Full time vs. Contract/Temp) is for this vacancy.

5. Salary:
How critical salary alignment is for evaluating fit on this vacancy (consider whether an explicit salary range is offered or if salary is "Undisclosed").

6. Years of experience:
How critical the candidate's length and seniority of work experience are based on the vacancy's required experience level and responsibilities.
"""


# ------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------

def safe_str(value) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def clean_weight(value) -> float:
    try:
        weight = float(value)
        if weight < 0.0 or weight > 100.0:
            raise ValueError(f"Weight out of range [0, 100]: {weight}")
        return round(weight, 2)
    except Exception as e:
        raise ValueError(f"Invalid weight value '{value}': {e}")


# ------------------------------------------------------------
# Build Prompt for LLM
# ------------------------------------------------------------

def build_prompt(job_row: pd.Series) -> str:
    job_id_code = safe_str(job_row["job_id_code"])
    job_title = safe_str(job_row["job_title"])
    company = safe_str(job_row["company"])
    category = safe_str(job_row["category"])
    subcategory = safe_str(job_row["subcategory"])
    location = safe_str(job_row["location"])
    required_education = safe_str(job_row.get("required_education", "Not Specified"))
    job_type = safe_str(job_row["job_type"])
    is_salary_disclosed = bool(job_row.get("is_salary_disclosed", False))
    salary_raw = safe_str(job_row["salary_raw"]) if is_salary_disclosed else "Undisclosed"
    if not salary_raw:
        salary_raw = "Undisclosed"
    descriptions = safe_str(job_row["descriptions"])

    prompt = f"""
{WEIGHTING_INSTRUCTIONS}


========================
JOB VACANCY INFORMATION
========================

Vacancy Code:
{job_id_code}

Job Title:
{job_title}

Company:
{company}

Domain / Category:
{category} ({subcategory})

Job Location:
{location}

Qualification Level Required:
{required_education}

Job Type (Employment Type):
{job_type}

Offered Salary:
{salary_raw}

Job Description and Requirements:
{descriptions}


========================
TASK
========================

Determine the relative importance (percentage weights) of the six factors for this specific job vacancy.

First, carefully reason through each of the six factors internally based on the vacancy information above.

Then provide ONLY the final numerical weights and concise explanations.

Do not output your chain-of-thought or hidden reasoning.

Return valid JSON using exactly this structure:

{{
    "job_title_weight": 0,
    "location_weight": 0,
    "qualification_level_weight": 0,
    "job_type_weight": 0,
    "salary_weight": 0,
    "years_of_experience_weight": 0,

    "job_title_reason": "",
    "location_reason": "",
    "qualification_level_reason": "",
    "job_type_reason": "",
    "salary_reason": "",
    "years_of_experience_reason": "",

    "overall_reason": ""
}}

Rules:

- All six weights must be numbers between 0 and 100.
- The six weights MUST sum to exactly 100.
- Do not include additional fields.
- Keep each reason concise.
- Do not provide chain-of-thought.
- Do not use uniform weights (16.67 each) or fixed predefined weights (21, 21, 16, 16, 15, 11).
"""
    return prompt


# ------------------------------------------------------------
# Validate Result
# ------------------------------------------------------------

def validate_result(result: dict) -> dict:
    required_fields = (
        FACTOR_WEIGHT_FIELDS
        + FACTOR_REASON_FIELDS
        + ["overall_reason"]
    )

    if not isinstance(result, dict):
        raise ValueError("Response is not a JSON object.")

    for field in required_fields:
        if field not in result:
            raise ValueError(f"Missing required field: {field}")

    weights = []
    for field in FACTOR_WEIGHT_FIELDS:
        w = clean_weight(result[field])
        result[field] = w
        weights.append(w)

    weight_sum = round(sum(weights), 2)
    if abs(weight_sum - 100.0) > 0.01:
        raise ValueError(
            f"Weights must sum to 100.0, but got {weight_sum} ({weights})."
        )

    for field in FACTOR_REASON_FIELDS + ["overall_reason"]:
        result[field] = safe_str(result[field])

    result["weight_sum"] = weight_sum
    return result


# ------------------------------------------------------------
# Call LLM
# ------------------------------------------------------------

def call_llm(prompt: str):
    start = time.perf_counter()

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0,
        response_format={"type": "json_object"},
        max_tokens=1000,
    )

    latency = time.perf_counter() - start
    raw_response = response.choices[0].message.content

    if not raw_response:
        raise ValueError("Empty response from model.")

    result = json.loads(raw_response)
    result = validate_result(result)

    usage = response.usage
    prompt_tokens = usage.prompt_tokens if usage else None
    completion_tokens = usage.completion_tokens if usage else None
    total_tokens = usage.total_tokens if usage else None

    return (
        result,
        latency,
        raw_response,
        prompt_tokens,
        completion_tokens,
        total_tokens,
    )


# ------------------------------------------------------------
# Load Previous Vacancy Results
# ------------------------------------------------------------

def load_previous_vacancy_results() -> pd.DataFrame:
    if not VACANCY_WEIGHTS_FILE.exists():
        return pd.DataFrame(columns=VACANCY_OUTPUT_FIELDS)

    try:
        df = pd.read_csv(VACANCY_WEIGHTS_FILE)
        if not set(VACANCY_OUTPUT_FIELDS).issubset(df.columns):
            print("Old vacancy weights format detected. Starting fresh.")
            return pd.DataFrame(columns=VACANCY_OUTPUT_FIELDS)
        return df
    except Exception as e:
        print(f"Could not load previous vacancy weights: {e}")
        return pd.DataFrame(columns=VACANCY_OUTPUT_FIELDS)


# ------------------------------------------------------------
# Main function
# ------------------------------------------------------------

def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    gt_df, jobs_df, _, _ = load_and_verify_datasets(verbose=True)

    if TEST_LIMIT is not None:
        jobs_to_process = jobs_df.head(TEST_LIMIT).copy()
    else:
        jobs_to_process = jobs_df.copy()

    previous = load_previous_vacancy_results()
    completed = set(
        previous.loc[
            previous["status"] == "success",
            "job_id_code",
        ].astype(str)
    )
    vacancy_records = previous[previous["status"] == "success"].to_dict("records")

    print(f"Model                 : {MODEL}")
    print(f"Total vacancies       : {len(jobs_to_process)}")
    print(f"Vacancies completed   : {len(completed)}")

    # --------------------------------------------------------
    # Step 1: Infer weights for each vacancy (J01..J60)
    # --------------------------------------------------------
    for _, job_row in jobs_to_process.iterrows():
        job_id_code = str(job_row["job_id_code"])

        if job_id_code in completed:
            print(f"{job_id_code}: already completed")
            continue

        print(f"\nProcessing vacancy {job_id_code} ({job_row['job_title']})...")
        base_prompt = build_prompt(job_row)

        success = False
        final_result = None
        raw_response = ""
        last_error = ""
        last_latency = 0.0
        prompt_tokens = None
        completion_tokens = None
        total_tokens = None
        retry_count = 0

        vacancy_start = time.perf_counter()

        for attempt in range(MAX_RETRIES):
            retry_count = attempt
            prompt = base_prompt
            if attempt > 0 and last_error:
                prompt = (
                    base_prompt
                    + f"\n\nNOTE: Your previous response failed validation with error: {last_error}. "
                    + "Please ensure all six weights are numbers between 0 and 100 and sum to exactly 100."
                )

            try:
                (
                    final_result,
                    last_latency,
                    raw_response,
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                ) = call_llm(prompt)
                success = True
                break
            except Exception as e:
                last_error = str(e)
                print(f"  Attempt {attempt + 1}/{MAX_RETRIES} failed: {last_error}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(SLEEP_BETWEEN_RETRIES)

        total_latency = time.perf_counter() - vacancy_start

        if success:
            rec = {
                "job_id_code": job_id_code,
                "job_id": job_row["job_id"],
                "job_title": job_row["job_title"],
                "company": job_row["company"],
                "category": job_row["category"],
                "subcategory": job_row["subcategory"],
                "method": METHOD_NAME,
                "job_title_weight": final_result["job_title_weight"],
                "location_weight": final_result["location_weight"],
                "qualification_level_weight": final_result["qualification_level_weight"],
                "job_type_weight": final_result["job_type_weight"],
                "salary_weight": final_result["salary_weight"],
                "years_of_experience_weight": final_result["years_of_experience_weight"],
                "weight_sum": final_result["weight_sum"],
                "job_title_reason": final_result["job_title_reason"],
                "location_reason": final_result["location_reason"],
                "qualification_level_reason": final_result["qualification_level_reason"],
                "job_type_reason": final_result["job_type_reason"],
                "salary_reason": final_result["salary_reason"],
                "years_of_experience_reason": final_result["years_of_experience_reason"],
                "overall_reason": final_result["overall_reason"],
                "latency_seconds": round(total_latency, 3),
                "last_attempt_latency_seconds": round(last_latency, 3),
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "retry_count": retry_count,
                "status": "success",
                "error": "",
                "raw_response": raw_response,
            }
        else:
            rec = {
                "job_id_code": job_id_code,
                "job_id": job_row["job_id"],
                "job_title": job_row["job_title"],
                "company": job_row["company"],
                "category": job_row["category"],
                "subcategory": job_row["subcategory"],
                "method": METHOD_NAME,
                "job_title_weight": None,
                "location_weight": None,
                "qualification_level_weight": None,
                "job_type_weight": None,
                "salary_weight": None,
                "years_of_experience_weight": None,
                "weight_sum": None,
                "job_title_reason": "",
                "location_reason": "",
                "qualification_level_reason": "",
                "job_type_reason": "",
                "salary_reason": "",
                "years_of_experience_reason": "",
                "overall_reason": "",
                "latency_seconds": round(total_latency, 3),
                "last_attempt_latency_seconds": round(last_latency, 3),
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "retry_count": retry_count,
                "status": "error",
                "error": last_error,
                "raw_response": raw_response,
            }

        vacancy_records.append(rec)
        pd.DataFrame(vacancy_records, columns=VACANCY_OUTPUT_FIELDS).to_csv(
            VACANCY_WEIGHTS_FILE, index=False
        )

        print(f"{job_id_code}: {'SUCCESS' if success else 'ERROR'}")
        if success:
            w_str = (
                f"title={final_result['job_title_weight']}, "
                f"loc={final_result['location_weight']}, "
                f"edu={final_result['qualification_level_weight']}, "
                f"type={final_result['job_type_weight']}, "
                f"sal={final_result['salary_weight']}, "
                f"exp={final_result['years_of_experience_weight']}"
            )
            print(f"  Weights (%) : {w_str} (sum={final_result['weight_sum']})")
            print(f"  Latency     : {total_latency:.3f}s | Tokens: {total_tokens} | Retries: {retry_count}")

    # --------------------------------------------------------
    # Step 2: Apply inferred vacancy weights to all 120 pairs
    # --------------------------------------------------------
    vacancy_df = pd.DataFrame(vacancy_records, columns=VACANCY_OUTPUT_FIELDS)
    vacancy_map = {
        str(r["job_id_code"]): r
        for _, r in vacancy_df.iterrows()
        if r["status"] == "success"
    }

    pair_records = []
    for _, row in gt_df.iterrows():
        jcode = str(row["job_id_code"])
        if jcode not in vacancy_map:
            if TEST_LIMIT is not None:
                continue
            raise RuntimeError(f"Missing successful LLM weight inference for vacancy {jcode}!")

        vrec = vacancy_map[jcode]

        weights = {
            "job_title": float(vrec["job_title_weight"]),
            "location": float(vrec["location_weight"]),
            "qualification_level": float(vrec["qualification_level_weight"]),
            "job_type": float(vrec["job_type_weight"]),
            "salary": float(vrec["salary_weight"]),
            "years_of_experience": float(vrec["years_of_experience_weight"]),
        }

        exact_score = 0.0
        for factor in FACTORS:
            gt_col = FACTOR_TO_GT_SCORE_COLUMN[factor]
            factor_score = float(row[gt_col])
            exact_score += (weights[factor] / 100.0) * factor_score

        rounded_score = round(exact_score, 2)

        pair_record = {
            "pair_id": row["pair_id"],
            "candidate_id": row["candidate_id"],
            "job_id_code": jcode,
            "pair_type": row["pair_type"],
            "method": METHOD_NAME,
            "job_title_score": float(row["score_title"]),
            "location_score": float(row["score_location"]),
            "qualification_level_score": float(row["score_education"]),
            "job_type_score": float(row["score_type"]),
            "salary_score": float(row["score_salary"]),
            "years_of_experience_score": float(row["score_experience"]),
            "job_title_weight": weights["job_title"],
            "location_weight": weights["location"],
            "qualification_level_weight": weights["qualification_level"],
            "job_type_weight": weights["job_type"],
            "salary_weight": weights["salary"],
            "years_of_experience_weight": weights["years_of_experience"],
            "weight_sum": float(vrec["weight_sum"]),
            "overall_score": rounded_score,
            "overall_score_exact": exact_score,
            "ground_truth_score": float(row["ground_truth_score"]),
            "relevance_grade": int(row["relevance_grade"]),
            "job_title_reason": vrec["job_title_reason"],
            "location_reason": vrec["location_reason"],
            "qualification_level_reason": vrec["qualification_level_reason"],
            "job_type_reason": vrec["job_type_reason"],
            "salary_reason": vrec["salary_reason"],
            "years_of_experience_reason": vrec["years_of_experience_reason"],
            "overall_reason": vrec["overall_reason"],
            "latency_seconds": vrec["latency_seconds"],
            "last_attempt_latency_seconds": vrec["last_attempt_latency_seconds"],
            "prompt_tokens": vrec["prompt_tokens"],
            "completion_tokens": vrec["completion_tokens"],
            "total_tokens": vrec["total_tokens"],
            "retry_count": vrec["retry_count"],
            "status": "success",
            "error": "",
            "raw_response": vrec["raw_response"],
        }
        pair_records.append(pair_record)

    pair_out_df = pd.DataFrame(pair_records, columns=PAIR_OUTPUT_FIELDS)
    pair_out_df.to_csv(OUTPUT_FILE, index=False)

    # ------------------------------------------------------------
    # Print Summary
    # ------------------------------------------------------------
    succ_v = vacancy_df[vacancy_df["status"] == "success"]
    print("\n" + "-" * 70)
    print("METHOD 3: LLM-INFERRED DYNAMIC WEIGHTING COMPLETED")
    print("-" * 70)
    print(f"Model                  : {MODEL}")
    print(f"Vacancies processed    : {len(succ_v)} / {len(jobs_to_process)}")
    print(f"Pairs scored           : {len(pair_out_df)}")
    print(f"Vacancy weights file   : {VACANCY_WEIGHTS_FILE}")
    print(f"Pair results file      : {OUTPUT_FILE}")
    if len(succ_v) > 0:
        print("\nMean Inferred Weights Across Vacancies (%):")
        for wf in FACTOR_WEIGHT_FIELDS:
            print(f"  {wf:28s}: {succ_v[wf].astype(float).mean():.2f}% (std={succ_v[wf].astype(float).std():.2f}%)")
        print(f"\nMean Latency / Vacancy : {succ_v['latency_seconds'].astype(float).mean():.3f}s")
        print(f"Mean Tokens / Vacancy  : {succ_v['total_tokens'].dropna().astype(float).mean():.1f}")
    if len(pair_out_df) > 0:
        print(f"Mean Predicted Score   : {pair_out_df['overall_score'].mean():.2f}")
        print(f"Mean Human GT Score    : {pair_out_df['ground_truth_score'].mean():.2f}")
    print("-" * 70)


if __name__ == "__main__":
    main()
