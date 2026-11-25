# data_loader.py

import re
import pandas as pd
from pathlib import Path


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------


BASE_DIR = Path(__file__).resolve().parents[2]
PROCESSED_DIR = BASE_DIR / "experiments" / "dataset" / "processed"

GROUND_TRUTH_FILE = PROCESSED_DIR / "benchmark_ground_truth_completed.csv"
JOBS_FILE = PROCESSED_DIR / "benchmark_jobs.csv"
RESUMES_FILE = PROCESSED_DIR / "benchmark_resumes.csv"

RESULTS_DIR = BASE_DIR / "experiments" / "methods" / "results"


# ------------------------------------------------------------
# Six factors
# ------------------------------------------------------------

FACTORS = [
    "job_title",
    "location",
    "qualification_level",
    "job_type",
    "salary",
    "years_of_experience",
]

FACTOR_LABELS = {
    "job_title": "Job title",
    "location": "Location",
    "qualification_level": "Qualification level",
    "job_type": "Job type",
    "salary": "Salary",
    "years_of_experience": "Years of experience",
}

# Mapping from canonical factor names to ground-truth CSV score columns
FACTOR_TO_GT_SCORE_COLUMN = {
    "job_title": "score_title",
    "location": "score_location",
    "qualification_level": "score_education",
    "job_type": "score_type",
    "salary": "score_salary",
    "years_of_experience": "score_experience",
}

GT_SCORE_COLUMNS = [
    "score_title",
    "score_location",
    "score_education",
    "score_type",
    "score_salary",
    "score_experience",
]

WEIGHT_COLUMNS = [
    "job_title_weight",
    "location_weight",
    "qualification_level_weight",
    "job_type_weight",
    "salary_weight",
    "years_of_experience_weight",
]


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def extract_edu_from_job_summary(job_summary: str) -> str:
    if pd.isna(job_summary):
        return "Not Specified"
    match = re.search(r"\|\s*Edu:\s*([^|]+?)\s*\|", str(job_summary))
    if match:
        return match.group(1).strip()
    return "Not Specified"


def load_and_verify_datasets(verbose: bool = True):
    for path in (GROUND_TRUTH_FILE, JOBS_FILE, RESUMES_FILE):
        if not path.exists():
            raise FileNotFoundError(f"Required dataset file not found: {path}")

    gt_df = pd.read_csv(GROUND_TRUTH_FILE)
    jobs_df = pd.read_csv(JOBS_FILE)
    resumes_df = pd.read_csv(RESUMES_FILE)

    # Verify row counts
    if len(gt_df) != 120:
        raise ValueError(f"Expected 120 rows in ground truth, found {len(gt_df)}")
    if len(jobs_df) != 60:
        raise ValueError(f"Expected 60 rows in benchmark_jobs.csv, found {len(jobs_df)}")
    if len(resumes_df) != 30:
        raise ValueError(f"Expected 30 rows in benchmark_resumes.csv, found {len(resumes_df)}")

    # Verify required columns in ground truth
    required_gt_cols = [
        "pair_id",
        "candidate_id",
        "job_id_code",
        "pair_type",
        "candidate_summary",
        "job_summary",
        *GT_SCORE_COLUMNS,
        "ground_truth_score",
        "relevance_grade",
        "annotation_rationale",
    ]
    missing_gt = [c for c in required_gt_cols if c not in gt_df.columns]
    if missing_gt:
        raise ValueError(f"Missing columns in ground truth: {missing_gt}")

    # Verify pair_id (P001..P120), candidate_id (C01..C30), job_id_code (J01..J60)
    expected_pairs = [f"P{i:03d}" for i in range(1, 121)]
    if gt_df["pair_id"].tolist() != expected_pairs:
        raise ValueError("pair_id column does not strictly match P001..P120 in order.")

    expected_candidates = {f"C{i:02d}" for i in range(1, 31)}
    actual_candidates = set(gt_df["candidate_id"].unique())
    if actual_candidates != expected_candidates:
        raise ValueError(f"Candidate IDs mismatch: {actual_candidates ^ expected_candidates}")

    pairs_per_candidate = gt_df.groupby("candidate_id")["pair_id"].count()
    if not (pairs_per_candidate == 4).all():
        raise ValueError("Not every candidate has exactly 4 pairs.")

    expected_jobs = {f"J{i:02d}" for i in range(1, 61)}
    actual_jobs_in_jobs_df = set(jobs_df["job_id_code"].unique())
    if actual_jobs_in_jobs_df != expected_jobs:
        raise ValueError(f"Jobs file IDs mismatch: {actual_jobs_in_jobs_df ^ expected_jobs}")

    actual_jobs_in_gt = set(gt_df["job_id_code"].unique())
    if actual_jobs_in_gt != expected_jobs:
        missing_in_gt = sorted(expected_jobs - actual_jobs_in_gt)
        raise ValueError(
            f"Ground truth job_id_code does not cover all 60 jobs! Missing: {missing_in_gt}"
        )

    # Verify numeric scores & grades have no NaNs and are within valid ranges
    for col in GT_SCORE_COLUMNS + ["ground_truth_score"]:
        if gt_df[col].isna().any():
            raise ValueError(f"Column {col} contains NaN values.")
        vals = gt_df[col].astype(float)
        if (vals < 0.0).any() or (vals > 100.0).any():
            raise ValueError(f"Column {col} has values outside [0, 100].")

    if gt_df["relevance_grade"].isna().any():
        raise ValueError("Column relevance_grade contains NaN values.")
    valid_grades = {0, 1, 2}
    actual_grades = set(gt_df["relevance_grade"].astype(int).unique())
    if not actual_grades.issubset(valid_grades):
        raise ValueError(f"Invalid relevance_grade values found: {actual_grades}")

    # Enrich jobs_df with required_education extracted from job_summary in gt_df
    edu_map = {}
    for _, row in gt_df.iterrows():
        jcode = row["job_id_code"]
        edu_str = extract_edu_from_job_summary(row["job_summary"])
        if jcode not in edu_map:
            edu_map[jcode] = edu_str

    jobs_df = jobs_df.copy()
    jobs_df["required_education"] = jobs_df["job_id_code"].map(edu_map).fillna("Not Specified")

    # Merge full candidate and job metadata onto gt_df for reference
    merged_df = gt_df.merge(
        resumes_df,
        on="candidate_id",
        how="left",
        suffixes=("", "_candidate"),
    ).merge(
        jobs_df,
        on="job_id_code",
        how="left",
        suffixes=("_candidate", "_job"),
    )

    if verbose:
        print("-" * 70)
        print("DATASET SCHEMA & INTEGRITY VERIFICATION PASSED")
        print("-" * 70)
        print(f"Ground truth pairs : {len(gt_df)} (P001-P120)")
        print(f"Unique candidates  : {gt_df['candidate_id'].nunique()} (C01-C30, 4 pairs each)")
        print(f"Unique vacancies   : {gt_df['job_id_code'].nunique()} (J01-J60)")
        print(f"Pair types         : {gt_df['pair_type'].value_counts().to_dict()}")
        print(f"Relevance grades   : {gt_df['relevance_grade'].value_counts().sort_index().to_dict()}")
        print("-" * 70)

    return gt_df, jobs_df, resumes_df, merged_df


if __name__ == "__main__":
    load_and_verify_datasets(verbose=True)
