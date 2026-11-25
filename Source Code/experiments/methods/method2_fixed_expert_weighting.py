# method2_fixed_expert_weighting.py

import time
import pandas as pd

from data_loader import (
    FACTORS,
    FACTOR_TO_GT_SCORE_COLUMN,
    RESULTS_DIR,
    load_and_verify_datasets,
)

# ------------------------------------------------------------
# FIXED LITERATURE WEIGHTS
# ------------------------------------------------------------
METHOD_NAME = "fixed_expert_weighting"
#  Fixed literature-based weights across every candidate-job pair:
# 1. Job title            : 21%
# 2. Location             : 21%
# 3. Qualification level  : 16%
# 4. Job type             : 16%
# 5. Salary               : 15%
# 6. Years of experience  : 11%
# Total                   : 100%

FIXED_EXPERT_WEIGHTS = {
    "job_title": 21.0,
    "location": 21.0,
    "qualification_level": 16.0,
    "job_type": 16.0,
    "salary": 15.0,
    "years_of_experience": 11.0,
}

OUTPUT_FILE = RESULTS_DIR / "method2_fixed_expert_results.csv"

OUTPUT_FIELDS = [
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
    # Six weights 
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
    "latency_seconds",
    "status",
]


# ------------------------------------------------------------
# Scoring function
# ------------------------------------------------------------

def calculate_fixed_expert_weighted_score(row: pd.Series) -> tuple[float, float]:
    weight_sum = sum(FIXED_EXPERT_WEIGHTS[f] for f in FACTORS)
    if abs(weight_sum - 100.0) > 1e-9:
        raise ValueError(f"Fixed expert weights do not sum to 100: {weight_sum}")

    exact_score = 0.0
    for factor in FACTORS:
        gt_col = FACTOR_TO_GT_SCORE_COLUMN[factor]
        factor_score = float(row[gt_col])
        exact_score += (FIXED_EXPERT_WEIGHTS[factor] / 100.0) * factor_score

    return round(exact_score, 2), exact_score


# ------------------------------------------------------------
# Main function
# ------------------------------------------------------------
def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    gt_df, _, _, _ = load_and_verify_datasets(verbose=True)

    records = []
    for _, row in gt_df.iterrows():
        t0 = time.perf_counter()
        rounded_score, exact_score = calculate_fixed_expert_weighted_score(row)
        latency = time.perf_counter() - t0

        record = {
            "pair_id": row["pair_id"],
            "candidate_id": row["candidate_id"],
            "job_id_code": row["job_id_code"],
            "pair_type": row["pair_type"],
            "method": METHOD_NAME,
            "job_title_score": float(row["score_title"]),
            "location_score": float(row["score_location"]),
            "qualification_level_score": float(row["score_education"]),
            "job_type_score": float(row["score_type"]),
            "salary_score": float(row["score_salary"]),
            "years_of_experience_score": float(row["score_experience"]),
            "job_title_weight": FIXED_EXPERT_WEIGHTS["job_title"],
            "location_weight": FIXED_EXPERT_WEIGHTS["location"],
            "qualification_level_weight": FIXED_EXPERT_WEIGHTS["qualification_level"],
            "job_type_weight": FIXED_EXPERT_WEIGHTS["job_type"],
            "salary_weight": FIXED_EXPERT_WEIGHTS["salary"],
            "years_of_experience_weight": FIXED_EXPERT_WEIGHTS["years_of_experience"],
            "weight_sum": round(sum(FIXED_EXPERT_WEIGHTS.values()), 4),
            "overall_score": rounded_score,
            "overall_score_exact": exact_score,
            "ground_truth_score": float(row["ground_truth_score"]),
            "relevance_grade": int(row["relevance_grade"]),
            "latency_seconds": round(latency, 6),
            "status": "success",
        }
        records.append(record)

    out_df = pd.DataFrame(records, columns=OUTPUT_FIELDS)
    out_df.to_csv(OUTPUT_FILE, index=False)

    print("\n" + "=" * 70)
    print("METHOD 2: FIXED EXPERT-DEFINED WEIGHTING COMPLETED")
    print("=" * 70)
    print(f"Output file          : {OUTPUT_FILE}")
    print(f"Total pairs scored   : {len(out_df)}")
    print(f"Fixed weights (%)    : {FIXED_EXPERT_WEIGHTS}")
    print(f"Mean predicted score : {out_df['overall_score'].mean():.2f}")
    print(f"Mean human GT score  : {out_df['ground_truth_score'].mean():.2f}")
    print("=" * 70)


if __name__ == "__main__":
    main()
