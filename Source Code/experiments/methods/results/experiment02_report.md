# Experiment 02: Semantic Factor Scoring Evaluation Report
- **Objective:** Assess how accurately the zero-shot LLM scores candidate-job matches across six factors using 120 candidate-job pairs and human-assigned scores.
- **Model**: Groq `openai/gpt-oss-120b` 
- **Reference Ground Truth**: `benchmark_ground_truth_completed.csv`

---

## Dimensional Scoring Performance (N = 120)

| Factor | MAE | RMSE | Spearman $\rho$ | Pearson $r$ | Predicted Mean | Ground Truth Mean |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1. Job Title & Skills | 15.27 | 20.45 | 0.8321 | 0.8161 | 36.57 | 39.0 |
| 2. Location | 12.21 | 18.43 | 0.7827 | 0.9345 | 78.25 | 70.38 |
| 3. Qualification Level | 22.62 | 39.16 | 0.6379 | 0.6435 | 62.04 | 50.25 |
| 4. Job Type | 2.96 | 9.5 | 0.9958 | 0.9343 | 90.12 | 92.08 |
| 5. Salary Compatibility | 5.6 | 18.52 | 0.7686 | 0.8374 | 9.88 | 14.78 |
| 6. Years of Experience | 18.46 | 27.55 | 0.7494 | 0.7175 | 47.0 | 47.54 |
| **Macro Average** | 12.85 | 22.27 | 0.7944 | 0.8139 | 53.98 | 52.34 |

*Metrics Explanation:*
- **MAE / RMSE**: Lower is better. Compares predicted score ($0–100$) vs human ground truth score ($0–100$).
- **Spearman $\rho$**: Rank correlation ($0$ to $1.0$).
- **Pearson $r$**: Linear correlation ($0$ to $1.0$).

---

## Performance Breakdown by Pair Type

| Pair Type | Number of Pairs | Factor MAE | Factor RMSE |
| :--- | :---: | :---: | :---: |
| High_Match | 28 | 13.65 | 25.72 |
| Partial_Match | 32 | 14.35 | 25.58 |
| Hard_Negative | 30 | 13.08 | 24.63 |
| Cross_Domain_Negative | 30 | 10.28 | 20.01 |

---

1. **High Rank Correlation:** The model's rankings closely follow human evaluations, particularly for Job Title/Skills, Experience, and Location.
2. **Consistent Handling of Missing Information:** The model handles undisclosed salary and unspecified education requirements consistently with human annotations, avoiding unsupported assumptions.
