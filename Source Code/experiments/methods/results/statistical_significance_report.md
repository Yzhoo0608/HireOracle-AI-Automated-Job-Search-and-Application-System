# Statistical Significance Report: Human Baseline vs. AI Pipeline

- **Objective:** Determine whether the performance differences between the human baseline and AI pipeline are statistically significant.
- **Dataset:** 120 candidate-job pairs (30 candidates, 4 jobs each).
- **Hypotheses:**
  - **H₀:** There is no significant difference between human and AI performance.
  - **H₁:** There is a significant difference between human and AI performance.
  - **Significance Level:** α = 0.05 (95% confidence level).

---

## Candidate Ranking Metrics Significance 

| Metric | Human Baseline Mean | Full AI Pipeline Mean | Difference (\Delta) | Paired $t$-statistic | $p$-value ($t$-test) | Wilcoxon $p$-value | Statistically Significant? ($\alpha = 0.05$) | Conclusion |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **NDCG@1** | 0.9333 | 0.8 | 0.1333 | 1.8381 | **0.0763** | 0.0702 | **NO (p >= 0.05)** | Fail to reject H0 |
| **NDCG@2** | 0.961 | 0.8882 | 0.0728 | 1.7869 | **0.0844** | 0.058 | **NO (p >= 0.05)** | Fail to reject H0 |
| **NDCG@4** | 0.9758 | 0.9297 | 0.0461 | 1.8314 | **0.0773** | 0.0803 | **NO (p >= 0.05)** | Fail to reject H0 |
| **Precision@1** | 0.8333 | 0.7667 | 0.0667 | 1.4392 | **0.1608** | 0.1573 | **NO (p >= 0.05)** | Fail to reject H0 |
| **Recall@2** | 0.9333 | 0.9 | 0.0333 | 1.0 | **0.3256** | 0.3173 | **NO (p >= 0.05)** | Fail to reject H0 |

---

## Pair-Level Error Significance (N = 120 Pairs)

| Metric | Human Baseline (Uniform) | Full AI Pipeline (Dynamic) | Difference | Paired $t$-statistic | $p$-value ($t$-test) | Wilcoxon $p$-value |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **MAE (Points)** | 10.90 | 14.30 | 3.40 | -3.2306 | 1.5975e-03 | 1.4617e-03 |

---

1. **Ranking Performance (p > 0.05):** All five ranking metrics (NDCG@1, NDCG@2, NDCG@4, Precision@1, and Recall@2) have p-values above 0.05. No statistically significant difference was found between the human baseline and AI pipeline in job ranking.

2. **Matching Score Accuracy (p < 0.05):** The AI pipeline has a 3.40-point higher MAE, with a statistically significant difference (p = 0.0016). This shows that AI matching scores are less accurate than human scores, although the ranking metrics show no significant difference.
