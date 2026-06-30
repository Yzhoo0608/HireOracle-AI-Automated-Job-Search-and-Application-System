import * as cheerio from 'cheerio';
import { ask, askJSON } from '../groq';
import type { Job, JobSearchRequest } from '../types';

export async function searchJobs(filters: JobSearchRequest, userSkills: string[] = []): Promise<Omit<Job, 'id' | 'created_at'>[]> {
  // Expand skills into job titles
  let searchKeywords = filters.keywords || [];
  if (searchKeywords.length === 0 && userSkills.length > 0) {
    const prompt = `Based on these skills: ${userSkills.join(', ')}, suggest 3 specific job titles to search for. Return a JSON array of strings ONLY.`;
    try {
      searchKeywords = await askJSON<string[]>(prompt, "You are a career advisor. Return ONLY a JSON array of strings.");
    } catch (e) {
      searchKeywords = ["Software Engineer"]; // Fallback
    }
  }

  const query = [...searchKeywords, filters.location || '', filters.remote ? 'remote' : ''].filter(Boolean).join(' ');
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' job')}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  
  const rawResults: any[] = [];
  $('.result').each((i, el) => {
    if (i >= 15) return; // Limit to 15 results
    const title = $(el).find('.result__title').text().trim();
    const snippet = $(el).find('.result__snippet').text().trim();
    const link = $(el).find('.result__url').attr('href') || '';
    
    if (title && link) {
      rawResults.push({ title, snippet, link: `https://${link.trim()}` });
    }
  });

  const jobs: Omit<Job, 'id' | 'created_at'>[] = [];
  
  // Use LLM to structure the raw results
  for (const raw of rawResults) {
    try {
      const prompt = `
        Extract job details from this search result. If some fields are missing, make your best guess or leave empty.
        Return JSON matching:
        {
          "title": "string",
          "company": "string",
          "location": "string",
          "description": "string",
          "requirements": {
            "skills": ["string"],
            "experience_years": number,
            "education": "string",
            "other": ["string"]
          },
          "salary_range": "string"
        }

        Title: ${raw.title}
        Snippet: ${raw.snippet}
      `;

      const structured = await askJSON<any>(prompt, "You are a helpful assistant parsing job search results into JSON.");
      
      jobs.push({
        title: structured.title || raw.title,
        company: structured.company || 'Unknown Company',
        location: structured.location || filters.location || 'Unknown Location',
        description: structured.description || raw.snippet,
        requirements: structured.requirements || { skills: [], experience_years: 0, education: '', other: [] },
        salary_range: structured.salary_range || '',
        url: raw.link,
        source: 'DuckDuckGo',
        posted_date: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to parse job", raw);
    }
  }

  return jobs;
}
