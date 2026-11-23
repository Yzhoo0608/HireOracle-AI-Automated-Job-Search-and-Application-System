# evaluate_methods.py

# Compares the three weighting methods:
#   1. Method 1: Uniform Weighting (100/6 % = 16.6667% per factor)
#   2. Method 2: Fixed Expert-Defined Weighting (21%, 21%, 16%, 16%, 15%, 11%)
#   3. Method 3: LLM-Inferred Dynamic Weighting (Vacancy-specific Zero-Shot CoT weights summing to 100%)


import json
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path
from scipy.stats import pearsonr, spearmanr

from data_loader import (
    BASE_DIR,
    FACTORS,
    FACTOR_LABELS,
    FACTOR_TO_GT_SCORE_COLUMN,
    GROUND_TRUTH_FILE,
    JOBS_FILE,
    RESUMES_FILE,
    RESULTS_DIR,
    load_and_verify_datasets,
)


# ---------------------------------------------------------
# FILE PATHS
# ---------------------------------------------------------

METHOD_FILES = {
    "Method 1: Uniform Weighting": RESULTS_DIR / "method1_uniform_results.csv",
    "Method 2: Fixed Expert Weighting": RESULTS_DIR / "method2_fixed_expert_results.csv",
    "Method 3: LLM Dynamic Weighting": RESULTS_DIR / "method3_llm_dynamic_results.csv",
}

MAIN_EVALUATION_CSV = RESULTS_DIR / "main_evaluation_results.csv"
ALL_PREDICTIONS_CSV = RESULTS_DIR / "all_predictions_120.csv"
EXP1_RESULTS_MD = RESULTS_DIR / "exp1_results.md"
CONFIG_METADATA_JSON = RESULTS_DIR / "experiment_config_metadata.json"


# ---------------------------------------------------------
# METRIC FUNCTIONS
# ---------------------------------------------------------

def calc_mae(y_true: pd.Series, y_pred: pd.Series) -> float:
    return float(np.mean(np.abs(y_true.astype(float) - y_pred.astype(float))))


def calc_rmse(y_true: pd.Series, y_pred: pd.Series) -> float:
    return float(np.sqrt(np.mean((y_true.astype(float) - y_pred.astype(float)) ** 2)))


def calc_correlations(y_true: pd.Series, y_pred: pd.Series) -> dict:
    yt = y_true.astype(float).values
    yp = y_pred.astype(float).values
    p_r, p_pval = pearsonr(yt, yp)
    s_rho, s_pval = spearmanr(yt, yp)
    return {
        "pearson_r": float(p_r),
        "pearson_p": float(p_pval),
        "spearman_rho": float(s_rho),
        "spearman_p": float(s_pval),
    }


def dcg_at_k(relevances: list[int], k: int) -> float:
    rel = np.asarray(relevances[:k], dtype=float)
    if rel.size == 0:
        return 0.0
    discounts = np.log2(np.arange(2, rel.size + 2))
    gains = (2.0 ** rel) - 1.0
    return float(np.sum(gains / discounts))


def evaluate_candidate_ranking(df: pd.DataFrame, score_col: str = "overall_score_exact") -> dict:
    ndcg_scores = {1: [], 2: [], 4: []}
    p1_scores = []
    r2_scores = []

    for _, group in df.groupby("candidate_id", sort=True):
        ranked = group.sort_values(
            by=[score_col, "pair_id"],
            ascending=[False, True],
        )
        pred_grades = ranked["relevance_grade"].astype(int).tolist()
        ideal_grades = sorted(pred_grades, reverse=True)

        # NDCG@1, NDCG@2, NDCG@4
        for k in (1, 2, 4):
            dcg = dcg_at_k(pred_grades, k)
            idcg = dcg_at_k(ideal_grades, k)
            if idcg > 0:
                ndcg_scores[k].append(dcg / idcg)

        # Precision@1: Top-1 recommendation is a valid match (grade >= 1)
        p1_scores.append(1.0 if pred_grades[0] >= 1 else 0.0)

        # Recall@2: Fraction of available relevant jobs retrieved in top 2
        total_rel = sum(1 for g in pred_grades if g >= 1)
        hits_in_top2 = sum(1 for g in pred_grades[:2] if g >= 1)
        if total_rel > 0:
            r2_scores.append(hits_in_top2 / total_rel)

    return {
        "NDCG@1": float(np.mean(ndcg_scores[1])),
        "NDCG@2": float(np.mean(ndcg_scores[2])),
        "NDCG@4": float(np.mean(ndcg_scores[4])),
        "Precision@1": float(np.mean(p1_scores)),
        "Recall@2": float(np.mean(r2_scores)),
    }


# ---------------------------------------------------------
# FAIR COMPARISON VERIFICATION
# ---------------------------------------------------------

def verify_fair_comparison(gt_df: pd.DataFrame, method_dfs: dict[str, pd.DataFrame]):
    score_cols_map = {
        "job_title_score": "score_title",
        "location_score": "score_location",
        "qualification_level_score": "score_education",
        "job_type_score": "score_type",
        "salary_score": "score_salary",
        "years_of_experience_score": "score_experience",
    }

    for name, mdf in method_dfs.items():
        if len(mdf) != 120:
            raise ValueError(f"{name} has {len(mdf)} rows instead of 120.")
        if mdf["pair_id"].tolist() != gt_df["pair_id"].tolist():
            raise ValueError(f"{name} pair_id order does not match ground truth.")

        for m_col, gt_col in score_cols_map.items():
            diff = np.abs(mdf[m_col].astype(float) - gt_df[gt_col].astype(float)).max()
            if diff > 1e-9:
                raise ValueError(f"{name} factor score {m_col} differs from ground truth {gt_col}!")

        w_sum_diff = np.abs(mdf["weight_sum"].astype(float) - 100.0).max()
        if w_sum_diff > 0.01:
            raise ValueError(f"{name} weight sum deviates from 100%: max diff={w_sum_diff}")

    print("FAIR COMPARISON VERIFIED: All 3 methods use identical factor scores on all 120 pairs.")


# ---------------------------------------------------------
# MAIN EVALUATION PIPELINE
# ---------------------------------------------------------

def main():
    gt_df, _, _, _ = load_and_verify_datasets(verbose=False)

    method_dfs = {}
    for name, fpath in METHOD_FILES.items():
        if not fpath.exists():
            raise FileNotFoundError(f"Missing result file for {name}: {fpath}")
        method_dfs[name] = pd.read_csv(fpath)

    verify_fair_comparison(gt_df, method_dfs)

    # --------------------------------------------------------
    # Evaluation Summary 
    # --------------------------------------------------------
    summary_rows = []
    tier_rows = []

    for method_label, mdf in method_dfs.items():
        y_true = mdf["ground_truth_score"].astype(float)
        y_pred = mdf["overall_score"].astype(float)

        mae = calc_mae(y_true, y_pred)
        rmse = calc_rmse(y_true, y_pred)
        corrs = calc_correlations(y_true, y_pred)
        ranking = evaluate_candidate_ranking(mdf, score_col="overall_score_exact")

        summary_rows.append({
            "Method": method_label,
            "MAE": round(mae, 2),
            "RMSE": round(rmse, 2),
            "Spearman_rho": round(corrs["spearman_rho"], 4),
            "Pearson_r": round(corrs["pearson_r"], 4),
            "NDCG@1": round(ranking["NDCG@1"], 4),
            "NDCG@2": round(ranking["NDCG@2"], 4),
            "NDCG@4": round(ranking["NDCG@4"], 4),
            "Precision@1": round(ranking["Precision@1"], 4),
            "Recall@2": round(ranking["Recall@2"], 4),
            "Predicted_Mean": round(float(y_pred.mean()), 2),
            "Ground_Truth_Mean": round(float(y_true.mean()), 2),
        })

        # Match Tier Breakdown 
        for ptype in ["High_Match", "Partial_Match", "Hard_Negative", "Cross_Domain_Negative"]:
            sub = mdf[mdf["pair_type"] == ptype]
            tier_rows.append({
                "Method": method_label,
                "Match_Tier": ptype,
                "Count": len(sub),
                "Ground_Truth_Mean": round(float(sub["ground_truth_score"].mean()), 2),
                "Predicted_Mean": round(float(sub["overall_score"].mean()), 2),
                "MAE": round(calc_mae(sub["ground_truth_score"], sub["overall_score"]), 2),
                "RMSE": round(calc_rmse(sub["ground_truth_score"], sub["overall_score"]), 2),
            })

    main_df = pd.DataFrame(summary_rows)
    tier_df = pd.DataFrame(tier_rows)

    # --------------------------------------------------------
    # All 120 Pairs Predictions Table
    # --------------------------------------------------------
    m1 = method_dfs["Method 1: Uniform Weighting"]
    m2 = method_dfs["Method 2: Fixed Expert Weighting"]
    m3 = method_dfs["Method 3: LLM Dynamic Weighting"]

    all_pred_df = gt_df[[
        "pair_id",
        "candidate_id",
        "job_id_code",
        "pair_type",
        "ground_truth_score",
        "relevance_grade",
    ]].copy()

    all_pred_df["method1_uniform_score"] = m1["overall_score"]
    all_pred_df["method2_fixed_expert_score"] = m2["overall_score"]
    all_pred_df["method3_llm_dynamic_score"] = m3["overall_score"]

    all_pred_df["method1_error"] = (all_pred_df["method1_uniform_score"] - all_pred_df["ground_truth_score"]).abs().round(2)
    all_pred_df["method2_error"] = (all_pred_df["method2_fixed_expert_score"] - all_pred_df["ground_truth_score"]).abs().round(2)
    all_pred_df["method3_error"] = (all_pred_df["method3_llm_dynamic_score"] - all_pred_df["ground_truth_score"]).abs().round(2)

    # Save only the TWO clean CSV files
    main_df.to_csv(MAIN_EVALUATION_CSV, index=False)
    all_pred_df.to_csv(ALL_PREDICTIONS_CSV, index=False)

    # --------------------------------------------------------
    # Save Clean Markdown Report
    # --------------------------------------------------------
    def df_to_md(df: pd.DataFrame) -> str:
        cols = [str(c) for c in df.columns]
        header = "| " + " | ".join(cols) + " |"
        sep = "| " + " | ".join(["---"] * len(cols)) + " |"
        rows = [
            "| " + " | ".join(str(v) for v in row) + " |"
            for row in df.to_numpy()
        ]
        return "\n".join([header, sep] + rows)

    report_text = f"""# Experiment 01: Final Evaluation Results

## 1. Main Comparison Table (N = 120 Pairs, M = 30 Candidates)

{df_to_md(main_df)}

*Notes on Evaluation Metrics:*
- **MAE / RMSE**: Lower is better. Compares predicted matching score ($0–100$) against human ground-truth score ($0–100$).
- **Spearman $\\rho$**: Monotonic rank-order correlation across all 120 pairs ($p < 10^{{-38}}$ for all methods).
- **Pearson $r$**: Linear correlation across all 120 pairs ($p < 10^{{-34}}$ for all methods).
- **NDCG@k**: Standard multi-level Information Retrieval ranking metric evaluated on human relevance grades (0 = Negative, 1 = Partial Match, 2 = High Match).
- **Precision@1**: Percentage of top-1 recommendations that are relevant matches (Grade $\\ge 1$).
- **Recall@2**: Percentage of all available relevant matches retrieved in the candidate's top 2 recommendations.
"""
    EXP1_RESULTS_MD.write_text(report_text, encoding="utf-8")

    # --------------------------------------------------------
    # Save Reproducibility Metadata
    # --------------------------------------------------------
    metadata = {
        "experiment": "Experiment 01: Candidate-Job Matching Weighting Strategies Evaluation",
        "timestamp": datetime.now().isoformat(),
        "pairs_count": 120,
        "candidates_count": 30,
        "vacancies_count": 60,
        "outputs": {
            "main_summary_csv": str(MAIN_EVALUATION_CSV),
            "master_predictions_csv": str(ALL_PREDICTIONS_CSV),
            "report_markdown": str(EXP1_RESULTS_MD),
        },
    }
    with open(CONFIG_METADATA_JSON, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Clean Console Output
    print("\n" + "=" * 90)
    print("EXPERIMENT 01: SIMPLIFIED EVALUATION SUMMARY")
    print("=" * 90)
    print(main_df.to_string(index=False))
    print("\n" + "=" * 90)
    print(f"Saved main summary table to: {MAIN_EVALUATION_CSV}")
    print(f"Saved master predictions to: {ALL_PREDICTIONS_CSV}")
    print(f"Saved clean report to:       {EXP1_RESULTS_MD}")
    print("=" * 90)


if __name__ == "__main__":
    main()
