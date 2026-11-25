import { askJSON } from '../groq';
import type { ParsedCV, Job, JobMatch, UserPreferences } from '@/shared/types';

interface SixFactorAnalysisResponse {
  weights?: {
    job_title_weight?: number;
    location_weight?: number;
    qualification_level_weight?: number;
    job_type_weight?: number;
    salary_weight?: number;
    years_of_experience_weight?: number;
  };
  scores?: {
    job_title_score?: number;
    location_score?: number;
    education_score?: number;
    job_type_score?: number;
    salary_score?: number;
    experience_score?: number;
  };
  // Fallbacks if flat JSON is returned
  job_title_weight?: number;
  location_weight?: number;
  qualification_level_weight?: number;
  job_type_weight?: number;
  salary_weight?: number;
  years_of_experience_weight?: number;
  job_title_score?: number;
  location_score?: number;
  education_score?: number;
  job_type_score?: number;
  salary_score?: number;
  experience_score?: number;
  skill_gaps?: string[];
  recommendations?: string[];
}

/**
 * Evaluates candidate-job match using the 6 canonical benchmark factors
 * defined in benchmark_ground_truth_completed.csv and validated in Experiments 03, 04, and 05:
 *
 * 1. job_title (Job Title & Role Alignment)
 * 2. location (Location Compatibility)
 * 3. qualification_level (Formal Education Alignment)
 * 4. job_type (Employment Arrangement Match)
 * 5. salary (Salary Compatibility, neutral when undisclosed)
 * 6. years_of_experience (Years & Depth of Experience)
 *
 * Note: skill_score is removed to maintain exact 1:1 parity with benchmark_ground_truth_completed.csv.
 * Missing tools/skills are surfaced in skill_gaps for applicant guidance.
 *
 * Composite Score: S(C, J) = sum( (w_i / 100) * s_i )
 */
export async function matchJobToCV(
  cv: ParsedCV,
  job: Job,
  preferences: UserPreferences | null
): Promise<Omit<JobMatch, 'id' | 'created_at'>> {
  const isSalaryDisclosed = Boolean(
    job.salary_range &&
    !job.salary_range.toLowerCase().includes('not spec') &&
    !job.salary_range.toLowerCase().includes('undisclose')
  );

  const salaryDisplay = isSalaryDisclosed
    ? job.salary_range
    : 'Undisclosed';

  const prompt = `
You are an expert recruitment evaluator and candidate-job matching benchmark annotator.
Evaluate the candidate against the job vacancy across EXACTLY the six standardized dimensions from the benchmark ground truth:

1. Job title
2. Location
3. Qualification level
4. Job type
5. Salary
6. Years of experience

Do NOT use any other factor or add skills as a separate scoring factor. Specific missing technical tools are identified under skill_gaps.

STAGE 1: VACANCY DYNAMIC WEIGHTING (Percentage weights summing to exactly 100%)
Determine the relative importance (percentage weights) of the six factors for this specific job vacancy:
- job_title_weight: How critical professional role/title alignment and core duties are.
- location_weight: How critical geographic proximity or commute is for this vacancy.
- qualification_level_weight: How critical formal academic education or certification is (if "Not Specified", lower to 5-10%).
- job_type_weight: How critical employment arrangement (e.g., Full-time vs Contract/Temp) is.
- salary_weight: How critical salary alignment is (if "Undisclosed", lower to 5-10%).
- years_of_experience_weight: How critical length and seniority of work experience are.

Rules for weights:
- All six weights must be numbers between 0 and 100.
- The six weights MUST sum to exactly 100.
- Do NOT simply assign uniform weights (16.67% each) or fixed predefined weights. Reflect this specific vacancy's stated priorities.

STAGE 2: SEMANTIC FACTOR SCORING (Scores from 0 to 100)
Score the candidate against the vacancy across each of the six dimensions:

1. job_title_score (Job Title & Role Alignment):
   Alignment between candidate's professional title/domain and the job title and core responsibilities.
   (100 = exact match / strong overlap; 70-85 = relevant adjacent role; 30-60 = distant role in same domain; 0 = completely unrelated/cross-domain).

2. location_score (Location Compatibility):
   Geographical commute or location alignment in Malaysia.
   (100 = same city/district or candidate is open/remote; 70-90 = adjacent city in same metro/state; 30-50 = interstate requiring relocation; 0 = incompatible).

3. education_score (Qualification Level Alignment):
   Formal academic education alignment.
   (100 = candidate meets or exceeds required qualification; 75-80 = neutral baseline when job does not specify an education requirement; 50-80 = minor gap compensated by experience; 0 = candidate completely lacks required qualification).

4. job_type_score (Job Type / Employment Arrangement):
   (100 = exact match e.g. Full time to Full time; 50 = contract vs full time or minor discrepancy; 0 = incompatible).

5. salary_score (Salary Compatibility):
   Alignment between candidate expected salary and job offered salary.
   (100 = candidate expectation overlaps offered range; 75-80 = neutral baseline when job salary is undisclosed or not specified; 50-80 = close within 15-20%; 0 = major mismatch).

6. experience_score (Years & Seniority of Experience):
   Length and seniority of relevant professional experience.
   (100 = candidate experience meets or exceeds required years; 70-90 = within 1-2 years; 30-60 = noticeable seniority/junior gap; 0 = completely lacking relevant domain experience).

STAGE 3: SKILL GAPS & RECOMMENDATIONS
- skill_gaps: An array of specific required or preferred skills/tools explicitly mentioned in the job description that the candidate lacks in their CV.
- recommendations: 2-3 concise, actionable recommendations for the candidate.

Return valid JSON with this exact structure:
{
  "weights": {
    "job_title_weight": 25,
    "location_weight": 15,
    "qualification_level_weight": 10,
    "job_type_weight": 10,
    "salary_weight": 10,
    "years_of_experience_weight": 30
  },
  "scores": {
    "job_title_score": 85,
    "location_score": 90,
    "education_score": 100,
    "job_type_score": 100,
    "salary_score": 80,
    "experience_score": 90
  },
  "skill_gaps": ["Docker", "Kubernetes"],
  "recommendations": ["Highlight microservices experience in summary", "Mention familiarity with container orchestration"]
}

=== CANDIDATE PROFILE ===
Target / Preferred Job Titles: ${preferences?.job_titles?.join(', ') || 'Not explicitly specified'}
CV Summary: ${cv.summary || 'None provided'}
CV Skills: ${cv.skills && cv.skills.length > 0 ? cv.skills.join(', ') : 'None listed'}
CV Experience: ${JSON.stringify(cv.experience || [])}
CV Education: ${JSON.stringify(cv.education || [])}
Candidate Preferred Location: ${preferences?.location || 'Not specified'}
Candidate Preferred Job Type: ${preferences?.job_type || 'any'}
Candidate Expected Salary Range: ${preferences?.salary_min || 0} - ${preferences?.salary_max || 0}

=== JOB POSTING ===
Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Job Type: ${job.job_type || 'Not specified'}
Offered Salary: ${salaryDisplay}
Requirements / Qualifications: ${JSON.stringify(job.requirements || [])}
Job Description:
${job.description || 'No description provided'}
`;

  const analysis = await askJSON<SixFactorAnalysisResponse>(
    prompt,
    'You are an expert recruitment evaluator and candidate-job matching benchmark annotator. Return ONLY JSON.'
  );

  // Extract six weights (supporting both nested analysis.weights and flat analysis)
  const rawW = analysis.weights || {};
  const wTitle = Math.max(0, Number(rawW.job_title_weight ?? analysis.job_title_weight) || 0);
  const wLoc = Math.max(0, Number(rawW.location_weight ?? analysis.location_weight) || 0);
  const wEdu = Math.max(0, Number(rawW.qualification_level_weight ?? analysis.qualification_level_weight) || 0);
  const wType = Math.max(0, Number(rawW.job_type_weight ?? analysis.job_type_weight) || 0);
  const wSal = Math.max(0, Number(rawW.salary_weight ?? analysis.salary_weight) || 0);
  const wExp = Math.max(0, Number(rawW.years_of_experience_weight ?? analysis.years_of_experience_weight) || 0);

  const weightSum = wTitle + wLoc + wEdu + wType + wSal + wExp;

  // Normalized six weights guarantee sum is exactly 100.0%
  const normWeights = weightSum > 0 ? {
    title: (wTitle / weightSum) * 100,
    loc: (wLoc / weightSum) * 100,
    edu: (wEdu / weightSum) * 100,
    type: (wType / weightSum) * 100,
    sal: (wSal / weightSum) * 100,
    exp: (wExp / weightSum) * 100,
  } : {
    title: 25,
    loc: 15,
    edu: 15,
    type: 15,
    sal: 15,
    exp: 15,
  };

  // Helper to clamp scores cleanly between 0 and 100
  const clampScore = (val: any, fallback = 0) => {
    const num = Number(val);
    if (isNaN(num)) return fallback;
    return Math.min(100, Math.max(0, Math.round(num)));
  };

  // Extract six factor scores (supporting both nested analysis.scores and flat analysis)
  const rawS = analysis.scores || {};
  const jobTitleScore = clampScore(rawS.job_title_score ?? analysis.job_title_score, 0);
  const locationScore = clampScore(rawS.location_score ?? analysis.location_score, 0);
  const educationScore = clampScore(rawS.education_score ?? analysis.education_score, 75);
  const jobTypeScore = clampScore(rawS.job_type_score ?? analysis.job_type_score, 0);
  const salaryScore = clampScore(rawS.salary_score ?? analysis.salary_score, 75);
  const experienceScore = clampScore(rawS.experience_score ?? analysis.experience_score, 0);

  // Exact 6-factor mathematical composite score: S(C, J) = sum( (w_i / 100) * s_i )
  const compositeScore = (
    (normWeights.title / 100) * jobTitleScore +
    (normWeights.loc / 100) * locationScore +
    (normWeights.edu / 100) * educationScore +
    (normWeights.type / 100) * jobTypeScore +
    (normWeights.sal / 100) * salaryScore +
    (normWeights.exp / 100) * experienceScore
  );

  const overallScore = Math.min(100, Math.max(0, Math.round(compositeScore)));

  const skillGaps = Array.isArray(analysis.skill_gaps)
    ? analysis.skill_gaps.filter(g => typeof g === 'string' && g.trim().length > 0)
    : [];

  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations.filter(r => typeof r === 'string' && r.trim().length > 0)
    : [];

  const dynamicWeights = {
    job_title: Math.round(normWeights.title),
    location: Math.round(normWeights.loc),
    qualification_level: Math.round(normWeights.edu),
    job_type: Math.round(normWeights.type),
    salary: Math.round(normWeights.sal),
    years_of_experience: Math.round(normWeights.exp),
  };

  return {
    user_id: '', // Will be filled by caller
    job_id: job.id,
    overall_score: overallScore,
    skill_score: 0, // Removed to match 6-factor benchmark_ground_truth_completed.csv
    experience_score: experienceScore,
    education_score: educationScore,
    location_score: locationScore,
    salary_score: salaryScore,
    job_title_score: jobTitleScore,
    job_type_score: jobTypeScore,
    dynamic_weights: dynamicWeights,
    skill_gaps: skillGaps,
    recommendations: recommendations,
  };
}
