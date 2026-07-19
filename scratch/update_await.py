import os
import re

db_functions = [
    'createUser', 'getUserByEmail', 'getUserById', 'updateUserPreferences',
    'createCVProfile', 'getCVProfile',
    'getJobByJobStreetId', 'createJob', 'getJobById', 'getJobByUrl', 'getAllJobs', 'searchJobs', 'getJobsCreatedToday',
    'createJobMatch', 'getJobMatchById', 'getJobMatchesByUser',
    'createApplication', 'getApplicationById', 'getApplicationsByUser', 'updateApplicationStatus', 'checkDuplicateApplication',
    'createEmailLog', 'checkDuplicateEmail', 'getEmailLogByApplication',
    'createInterviewSession', 'getInterviewSession', 'updateInterviewSession', 'getInterviewSessionsByUser',
    'getDashboardStats', 'getAcceptedJobMatches', 'updateUserActiveStatus', 'getUnmatchedJobsForUser', 'hasAppliedToJob', 'hasAppliedToCompanyAndTitle', 'hasAppliedToJobStreetId'
]

# Regex pattern for any of these functions
func_pattern = re.compile(r'\b(' + '|'.join(db_functions) + r')\(')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content

    # Replace occurrences of func( with await func(
    # but only if not already preceded by await
    def repl(m):
        return 'await ' + m.group(0)

    # We want to replace but be careful not to do it if there's already await
    # Let's just do a naive replace first and fix double awaits
    
    content = re.sub(r'(?<!await\s)(?<!function\s)(?<!async\s)(?<!\.\s)\b(' + '|'.join(db_functions) + r')\s*\(', repl, content)

    # Clean up any double awaits
    content = content.replace('await await ', 'await ')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith('.ts') or f.endswith('.tsx'):
                process_file(os.path.join(root, f))

base = r"c:\Users\User\Downloads\AI Job Agent\AI-job-agent\src"
walk_dir(os.path.join(base, "app", "api"))
walk_dir(os.path.join(base, "lib", "agents"))

