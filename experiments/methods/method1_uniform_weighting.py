# method1_uniform_weighting.py

import time
import pandas as pd
from pathlib import Path

from data_loader import (
    FACTORS,
    FACTOR_TO_GT_SCORE_COLUMN,
    RESULTS_DIR,
    load_and_verify_datasets,
)

METHOD_NAME = "uniform_weighting"

# Assigns equal importance to all six evaluation factors (16.6667%)
EXACT_UNIFORM_WEIGHT = 100.0 / 6.0  
DISPLAY_UNIFORM_WEIGHT = round(EXACT_UNIFORM_WEIGHT, 4)  

UNIFORM_WEIGHTS = {
    "job_title": EXACT_UNIFORM_WEIGHT,
    "location": EXACT_UNIFORM_WEIGHT,
    "qualification_level": EXACT_UNIFORM_WEIGHT,
    "job_type": EXACT_UNIFORM_WEIGHT,
    "salary": EXACT_UNIFORM_WEIGHT,
    "years_of_experience": EXACT_UNIFORM_WEIGHT,
}

OUTPUT_FILE = RESULTS_DIR / "method1_uniform_results.csv"

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
def calculate_uniform_weighted_score(row: pd.Series) -> tuple[float, float]:
    """
    Calculate the uniform-weighted matching score using exact 100/6 weights internally.
    Returns (rounded_score_2dp, exact_float_score).
    """
    weight_sum = sum(UNIFORM_WEIGHTS[f] for f in FACTORS)
    if abs(weight_sum - 100.0) > 1e-9:
        raise ValueError(f"Uniform weights do not sum to 100: {weight_sum}")

    exact_score = 0.0
    for factor in FACTORS:
        gt_col = FACTOR_TO_GT_SCORE_COLUMN[factor]
        factor_score = float(row[gt_col])
        exact_score += (UNIFORM_WEIGHTS[factor] / 100.0) * factor_score

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
        rounded_score, exact_score = calculate_uniform_weighted_score(row)
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
            "job_title_weight": DISPLAY_UNIFORM_WEIGHT,
            "location_weight": DISPLAY_UNIFORM_WEIGHT,
            "qualification_level_weight": DISPLAY_UNIFORM_WEIGHT,
            "job_type_weight": DISPLAY_UNIFORM_WEIGHT,
            "salary_weight": DISPLAY_UNIFORM_WEIGHT,
            "years_of_experience_weight": DISPLAY_UNIFORM_WEIGHT,
            "weight_sum": round(sum(UNIFORM_WEIGHTS.values()), 4),
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
    print("METHOD 1: UNIFORM WEIGHTING COMPLETED")
    print("=" * 70)
    print(f"Output file          : {OUTPUT_FILE}")
    print(f"Total pairs scored   : {len(out_df)}")
    print(f"Internal weight each : 100/6 = {EXACT_UNIFORM_WEIGHT:.10f}% (display: {DISPLAY_UNIFORM_WEIGHT}%)")
    print(f"Mean predicted score : {out_df['overall_score'].mean():.2f}")
    print(f"Mean human GT score  : {out_df['ground_truth_score'].mean():.2f}")
    print("=" * 70)


if __name__ == "__main__":
    main()
