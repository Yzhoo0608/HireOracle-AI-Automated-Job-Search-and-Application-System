# Experiment 01: Final Evaluation Results

## 1. Main Comparison Table (N = 120 Pairs, M = 30 Candidates)

| Method | MAE | RMSE | Spearman_rho | Pearson_r | NDCG@1 | NDCG@2 | NDCG@4 | Precision@1 | Recall@2 | Predicted_Mean | Ground_Truth_Mean |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Method 1: Uniform Weighting | 10.9 | 14.0 | 0.8752 | 0.8549 | 0.92 | 0.9532 | 0.971 | 0.8333 | 0.92 | 52.34 | 47.98 |
| Method 2: Fixed Expert Weighting | 11.14 | 14.4 | 0.8731 | 0.8517 | 0.92 | 0.9532 | 0.971 | 0.8333 | 0.92 | 53.19 | 47.98 |
| Method 3: LLM Dynamic Weighting | 9.38 | 12.46 | 0.9214 | 0.9074 | 0.9467 | 0.9613 | 0.9791 | 0.8333 | 0.92 | 54.39 | 47.98 |

*Notes on Evaluation Metrics:*
- **MAE / RMSE:** Lower is better. Measures prediction errors between matching scores (0–100) and human ground-truth scores (0–100).
- **Spearman (ρ):** Measures rank-order correlation between predicted and human scores (p < 10⁻³⁸ for all methods).
- **Pearson (r):** Measures linear correlation between predicted and human scores (p < 10⁻³⁴ for all methods).
- **NDCG@k:** Evaluates ranking quality using graded relevance (0 = Negative, 1 = Partial Match, 2 = High Match).
- **Precision@1:** Percentage of top-1 recommendations that are relevant (Grade ≥ 1).
- **Recall@2:** Percentage of all relevant jobs retrieved within the top 2 recommendations.
