const fs = require('fs');

// Fix db.ts
let db = fs.readFileSync('src/lib/db.ts', 'utf-8');
db = db.replace('const match = url.match(/\\\\/job\\\\/(\\\\d+)/i);', 'const match = url.match(/\\/job\\/(\\d+)/i);');
fs.writeFileSync('src/lib/db.ts', db);

// Fix orchestrator.ts
let orch = fs.readFileSync('src/lib/agents/orchestrator.ts', 'utf-8');
const filterRegex = /const candidates = matches\.filter\(match => \{[\s\S]*?\}\);/;
const replaceWith = `const candidates = [];
      for (const match of matches) {
        if (!match.job) continue;
        const score = match.overall_score >= 70;
        const alreadyAppliedById = await hasAppliedToJob(userId, match.job_id);
        const alreadyAppliedByTitle = await hasAppliedToCompanyAndTitle(userId, match.job.company, match.job.title);
        const alreadyAppliedByJobStreetId = await hasAppliedToJobStreetId(userId, match.job.url);
        if (score && !alreadyAppliedById && !alreadyAppliedByTitle && !alreadyAppliedByJobStreetId) {
          candidates.push(match);
        }
      }`;
orch = orch.replace(filterRegex, replaceWith);
fs.writeFileSync('src/lib/agents/orchestrator.ts', orch);
