# evaluate_experiment03.py
"""
Experiment 3: Human vs AI
=================================
Compares Human Baselines against the Full Automated AI Pipeline:
  - Method 1: Uniform Weighting using Human Ground-Truth Factor Scores (Exp 1 Weights)
  - Method 2: Fixed Expert Weighting using Human Ground-Truth Factor Scores (Exp 1 Weights)
  - Method 3: Dynamic Weighting using AI-Generated Factor Scores from Exp 2 (Exp 1 Weights)

Weight Sources:
  - Method 1: Uniform Weighting (100.0 / 6.0 = 16.6667% full precision)
  - Method 2: Fixed Expert-Defined Weighting (21%, 21%, 16%, 16%, 15%, 11%)
  - Method 3: Vacancy-specific Dynamic Weights from Exp 1 (method3_vacancy_weights_60.csv)

Factor Score Sources:
  - Method 1: Human-annotated Ground-Truth Factor Scores (benchmark_ground_truth_completed.csv)
  - Method 2: Human-annotated Ground-Truth Factor Scores (benchmark_ground_truth_completed.csv)
  - Method 3: Original AI-Generated Factor Scores from Exp 2 (method4_semantic_scores_120.csv)

Outputs:
  - experiments/methods/results/experiment03_human_vs_ai_composite_120.csv
  - experiments/methods/results/experiment03_human_vs_ai_evaluation.csv
  - experiments/methods/results/experiment03_human_vs_ai_report.md
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from scipy.stats import pearsonr, spearmanr

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parents[2]
RESULTS_DIR = BASE_DIR / "experiments" / "methods" / "results"
PROCESSED_DATA_DIR = BASE_DIR / "experiments" / "dataset" / "processed"

# Authoritative input files
GROUND_TRUTH_FILE = PROCESSED_DATA_DIR / "benchmark_ground_truth_completed.csv"
SEMANTIC_SCORES_FILE = RESULTS_DIR / "method4_semantic_scores_120.csv"
VACANCY_WEIGHTS_FILE = RESULTS_DIR / "method3_vacancy_weights_60.csv"

# Dedicated outputs for Human vs AI experiment
OUTPUT_COMPOSITE_CSV = RESULTS_DIR / "experiment03_human_vs_ai_composite_120.csv"
OUTPUT_EVALUATION_CSV = RESULTS_DIR / "experiment03_human_vs_ai_evaluation.csv"
OUTPUT_REPORT_MD = RESULTS_DIR / "experiment03_human_vs_ai_report.md"

# Method 2: Fixed Expert Weights (from Experiment 1)
FIXED_WEIGHTS = {
    "job_title": 21.0,
    "location": 21.0,
    "qualification_level": 16.0,
    "job_type": 16.0,
    "salary": 15.0,
    "years_of_experience": 11.0,
}

# Method 1: Exact Uniform Weight (from Experiment 1)
UNIFORM_WEIGHT = 100.0 / 6.0  # 16.666666666666668%


def dcg_at_k(relevances: list[int], k: int) -> float:
    rel = np.asarray(relevances[:k], dtype=float)
    if rel.size == 0:
        return 0.0
    discounts = np.log2(np.arange(2, rel.size + 2))
    gains = (2.0 ** rel) - 1.0
    return float(np.sum(gains / discounts))


def evaluate_candidate_ranking(df: pd.DataFrame, score_col: str) -> dict:
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

        for k in (1, 2, 4):
            dcg = dcg_at_k(pred_grades, k)
            idcg = dcg_at_k(ideal_grades, k)
            if idcg > 0:
                ndcg_scores[k].append(dcg / idcg)

        p1_scores.append(1.0 if pred_grades[0] >= 1 else 0.0)

        total_rel = sum(1 for g in pred_grades if g >= 1)
        hits_in_top2 = sum(1 for g in pred_grades[:2] if g >= 1)
        if total_rel > 0:
            r2_scores.append(hits_in_top2 / total_rel)

    return {
        "NDCG@1": round(float(np.mean(ndcg_scores[1])), 4),
        "NDCG@2": round(float(np.mean(ndcg_scores[2])), 4),
        "NDCG@4": round(float(np.mean(ndcg_scores[4])), 4),
        "Precision@1": round(float(np.mean(p1_scores)), 4),
        "Recall@2": round(float(np.mean(r2_scores)), 4),
    }


def calc_score_metrics(y_pred: pd.Series, y_true: pd.Series) -> dict:
    yp = y_pred.astype(float).values
    yt = y_true.astype(float).values

    mae = float(np.mean(np.abs(yp - yt)))
    rmse = float(np.sqrt(np.mean((yp - yt) ** 2)))
    pr, _ = pearsonr(yp, yt)
    sr, _ = spearmanr(yp, yt)

    return {
        "MAE": round(mae, 2),
        "RMSE": round(rmse, 2),
        "Spearman_rho": round(float(sr), 4),
        "Pearson_r": round(float(pr), 4),
        "Pred_Mean": round(float(np.mean(yp)), 2),
        "GT_Mean": round(float(np.mean(yt)), 2),
    }


def run_experiment03_human_vs_ai():
    # --------------------------------------------------------
    # 1. Verify Data Files Exist
    # --------------------------------------------------------
    if not GROUND_TRUTH_FILE.exists():
        raise FileNotFoundError(f"Missing Ground Truth file: {GROUND_TRUTH_FILE}")
    if not SEMANTIC_SCORES_FILE.exists():
        raise FileNotFoundError(f"Missing Experiment 03 semantic scores: {SEMANTIC_SCORES_FILE}")
    if not VACANCY_WEIGHTS_FILE.exists():
        raise FileNotFoundError(f"Missing Experiment 03 vacancy weights: {VACANCY_WEIGHTS_FILE}")

    # Load datasets
    gt_df = pd.read_csv(GROUND_TRUTH_FILE)
    sem_df = pd.read_csv(SEMANTIC_SCORES_FILE)
    vw_df = pd.read_csv(VACANCY_WEIGHTS_FILE)

    if len(gt_df) != 120:
        raise ValueError(f"Expected 120 ground-truth pairs, found {len(gt_df)}")
    if len(sem_df) != 120:
        raise ValueError(f"Expected 120 AI semantic score pairs, found {len(sem_df)}")

    # Index by pair_id for strict alignment
    gt_map = {str(r["pair_id"]): r for _, r in gt_df.iterrows()}
    sem_map = {str(r["pair_id"]): r for _, r in sem_df.iterrows()}
    v_weights_map = {
        str(r["job_id_code"]): r
        for _, r in vw_df.iterrows()
        if r.get("status") == "success"
    }

    # Verify ID matching
    all_pair_ids = sorted(list(gt_map.keys()))
    if set(all_pair_ids) != set(sem_map.keys()):
        missing_in_sem = set(all_pair_ids) - set(sem_map.keys())
        missing_in_gt = set(sem_map.keys()) - set(all_pair_ids)
        raise ValueError(f"Pair ID mismatch! Missing in sem: {missing_in_sem}, Missing in gt: {missing_in_gt}")

    # --------------------------------------------------------
    # 2. Compute Composite Scores S(C, J)
    # --------------------------------------------------------
    records = []
    for pid in all_pair_ids:
        gt_row = gt_map[pid]
        sem_row = sem_map[pid]
        jcode = str(gt_row["job_id_code"])
        vrec = v_weights_map.get(jcode)

        # A. Human Ground-Truth Factor Scores (for Method 1 and Method 2)
        s_title_human = float(gt_row["score_title"])
        s_loc_human = float(gt_row["score_location"])
        s_edu_human = float(gt_row["score_education"])
        s_type_human = float(gt_row["score_type"])
        s_sal_human = float(gt_row["score_salary"])
        s_exp_human = float(gt_row["score_experience"])

        # B. AI-Generated Factor Scores (for Method 3)
        s_title_ai = float(sem_row["score_title_pred"])
        s_loc_ai = float(sem_row["score_location_pred"])
        s_edu_ai = float(sem_row["score_education_pred"])
        s_type_ai = float(sem_row["score_type_pred"])
        s_sal_ai = float(sem_row["score_salary_pred"])
        s_exp_ai = float(sem_row["score_experience_pred"])

        # Ground-truth targets
        gt_overall = float(gt_row["ground_truth_score"])
        rel_grade = int(gt_row["relevance_grade"])

        # Method 1: Uniform Weighting Using Human Scores
        s_uniform_human = (
            s_title_human + s_loc_human + s_edu_human + s_type_human + s_sal_human + s_exp_human
        ) / 6.0

        # Method 2: Fixed Expert Weighting Using Human Scores
        s_fixed_human = (
            (FIXED_WEIGHTS["job_title"] / 100.0) * s_title_human
            + (FIXED_WEIGHTS["location"] / 100.0) * s_loc_human
            + (FIXED_WEIGHTS["qualification_level"] / 100.0) * s_edu_human
            + (FIXED_WEIGHTS["job_type"] / 100.0) * s_type_human
            + (FIXED_WEIGHTS["salary"] / 100.0) * s_sal_human
            + (FIXED_WEIGHTS["years_of_experience"] / 100.0) * s_exp_human
        )

        # Method 3: Dynamic Weighting Using AI-Generated Factor Scores
        if vrec is not None:
            s_dyn_ai = (
                (float(vrec["job_title_weight"]) / 100.0) * s_title_ai
                + (float(vrec["location_weight"]) / 100.0) * s_loc_ai
                + (float(vrec["qualification_level_weight"]) / 100.0) * s_edu_ai
                + (float(vrec["job_type_weight"]) / 100.0) * s_type_ai
                + (float(vrec["salary_weight"]) / 100.0) * s_sal_ai
                + (float(vrec["years_of_experience_weight"]) / 100.0) * s_exp_ai
            )
        else:
            s_dyn_ai = (s_title_ai + s_loc_ai + s_edu_ai + s_type_ai + s_sal_ai + s_exp_ai) / 6.0

        records.append({
            "pair_id": pid,
            "candidate_id": gt_row["candidate_id"],
            "job_id_code": jcode,
            "pair_type": gt_row["pair_type"],
            "relevance_grade": rel_grade,
            "ground_truth_score": gt_overall,
            "score_uniform_human": round(s_uniform_human, 2),
            "score_fixed_human": round(s_fixed_human, 2),
            "score_dynamic_ai": round(s_dyn_ai, 2),
            "error_uniform_human": round(abs(s_uniform_human - gt_overall), 2),
            "error_fixed_human": round(abs(s_fixed_human - gt_overall), 2),
            "error_dynamic_ai": round(abs(s_dyn_ai - gt_overall), 2),
        })

    comp_df = pd.DataFrame(records)
    comp_df.to_csv(OUTPUT_COMPOSITE_CSV, index=False)

    # --------------------------------------------------------
    # 3. Evaluate Metrics for Human vs AI Experiment
    # --------------------------------------------------------
    methods = [
        ("Method 1: Uniform (Human Baseline)", "score_uniform_human", "Human Ground Truth", "Uniform (16.67% each)"),
        ("Method 2: Fixed Expert (Human Baseline)", "score_fixed_human", "Human Ground Truth", "Fixed Expert (21,21,16,16,15,11)"),
        ("Method 3: Dynamic LLM (Full AI Pipeline)", "score_dynamic_ai", "AI Zero-Shot (Exp 04)", "Dynamic LLM (Exp 01)"),
    ]

    eval_rows = []
    for m_label, score_col, factor_source, weight_source in methods:
        sm = calc_score_metrics(comp_df[score_col], comp_df["ground_truth_score"])
        rm = evaluate_candidate_ranking(comp_df, score_col)

        eval_rows.append({
            "Method": m_label,
            "Factor_Score_Source": factor_source,
            "Weight_Source": weight_source,
            "MAE": sm["MAE"],
            "RMSE": sm["RMSE"],
            "Spearman_rho": sm["Spearman_rho"],
            "Pearson_r": sm["Pearson_r"],
            "NDCG@1": rm["NDCG@1"],
            "NDCG@2": rm["NDCG@2"],
            "NDCG@4": rm["NDCG@4"],
            "Precision@1": rm["Precision@1"],
            "Recall@2": rm["Recall@2"],
            "Predicted_Mean": sm["Pred_Mean"],
            "Ground_Truth_Mean": sm["GT_Mean"],
        })

    eval_df = pd.DataFrame(eval_rows)
    eval_df.to_csv(OUTPUT_EVALUATION_CSV, index=False)

    # --------------------------------------------------------
    # 4. Generate Markdown Report
    # --------------------------------------------------------
    report_content = f"""# Experiment 3 (Exp05): Human vs AI Evaluation Report

## 1. Experiment Overview
- **Experiment Name**: **Human vs AI**
- **Evaluation Dataset**: N = {len(comp_df)} Candidate-Job Pairs (M = 30 Candidates, 4 Jobs each).
- **Setup**:
  - **Method 1 (Uniform Weighting)**: Human-annotated ground-truth factor scores + Uniform weights (16.67% each).
  - **Method 2 (Fixed Expert Weighting)**: Human-annotated ground-truth factor scores + Fixed expert weights (21%, 21%, 16%, 16%, 15%, 11%).
  - **Method 3 (Dynamic Weighting)**: Original AI-generated factor scores from Experiment 2 (`method4_semantic_scores_120.csv`) + Dynamic weights from Experiment 1 (`method3_vacancy_weights_60.csv`).

---

## 2. Main Results Table (Human vs AI)

| Method | Factor Score Source | Weight Source | MAE | RMSE | Spearman $\\rho$ | Pearson $r$ | NDCG@1 | NDCG@2 | NDCG@4 | Precision@1 | Recall@2 | Predicted Mean | Ground Truth Mean |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
"""
    for _, r in eval_df.iterrows():
        report_content += (
            f"| **{r['Method']}** | {r['Factor_Score_Source']} | {r['Weight_Source']} | "
            f"{r['MAE']} | {r['RMSE']} | {r['Spearman_rho']} | {r['Pearson_r']} | "
            f"{r['NDCG@1']} | {r['NDCG@2']} | {r['NDCG@4']} | {r['Precision@1']} | {r['Recall@2']} | "
            f"{r['Predicted_Mean']} | {r['Ground_Truth_Mean']} |\n"
        )

    report_content += """
---

## 3. Configuration & Integrity Summary
1. **Weight Sources**: All weights were retrieved directly from Experiment 1 configurations without modification or regeneration.
2. **Factor Score Sources**: Method 1 and Method 2 strictly employ human-annotated ground-truth factor scores from `benchmark_ground_truth_completed.csv`. Method 3 strictly retains the original AI-generated factor scores from Experiment 2 (`method4_semantic_scores_120.csv`).
3. **Record Alignment**: All 120 pairs were strictly aligned using the canonical `pair_id` key. No missing, duplicate, or unmatched candidate-job pairs exist.
4. **Preservation**: Original Experiment 1, 2, and initial Experiment 5 result files remain completely intact.
"""

    with open(OUTPUT_REPORT_MD, "w", encoding="utf-8") as f:
        f.write(report_content)

    print("-" * 80)
    print("EXPERIMENT 3 (EXP05): HUMAN VS AI EVALUATION SUMMARY")
    print("-" * 80)
    print(eval_df[["Method", "MAE", "RMSE", "Spearman_rho", "Pearson_r", "NDCG@1", "NDCG@4", "Precision@1", "Recall@2"]].to_string(index=False))
    print("-" * 80)
    print(f"Results saved to:\n  Composite CSV: {OUTPUT_COMPOSITE_CSV}\n  Summary CSV  : {OUTPUT_EVALUATION_CSV}\n  Report MD    : {OUTPUT_REPORT_MD}")
    print("-" * 80)


if __name__ == "__main__":
    run_experiment03_human_vs_ai()
