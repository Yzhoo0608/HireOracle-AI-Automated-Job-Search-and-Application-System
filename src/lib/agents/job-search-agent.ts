import { chromium } from 'playwright';
import { ask, askJSON } from '../groq';
import type { Job, JobSearchRequest } from '../types';

export async function searchJobs(filters: JobSearchRequest, userSkills: string[] = []): Promise<Omit<Job, 'id' | 'created_at'>[]> {
  // Expand skills into job titles
  let searchKeywords = filters.keywords || [];
  if (searchKeywords.length === 0 && userSkills.length > 0) {
    const prompt = `Based on these skills: ${userSkills.join(', ')}, suggest 3 specific job titles to search for. Return a JSON object with a "titles" array containing strings.`;
    try {
      const response = await askJSON<any>(prompt, "You are a career advisor. Return ONLY a JSON object with a \"titles\" array.");
      if (response && Array.isArray(response.titles)) {
        searchKeywords = response.titles;
      } else if (Array.isArray(response)) {
        searchKeywords = response;
      } else if (response && typeof response === 'object') {
        const values = Object.values(response);
        const foundArray = values.find(val => Array.isArray(val));
        if (foundArray) {
          searchKeywords = foundArray as string[];
        } else {
          searchKeywords = ["Software Engineer"];
        }
      } else {
        searchKeywords = ["Software Engineer"];
      }
    } catch (e) {
      searchKeywords = ["Software Engineer"]; // Fallback
    }
  }

  // Determine JobStreet base URL based on location
  let baseUrl = 'https://my.jobstreet.com';
  const loc = (filters.location || '').toLowerCase();
  if (loc.includes('singapore')) {
    baseUrl = 'https://sg.jobstreet.com';
  } else if (loc.includes('philippines') || loc.includes('manila')) {
    baseUrl = 'https://ph.jobstreet.com';
  } else if (loc.includes('indonesia') || loc.includes('jakarta')) {
    baseUrl = 'https://id.jobstreet.com';
  }

  // Construct search query URL
  let url = `${baseUrl}/jobs?keywords=${encodeURIComponent(searchKeywords.join(' '))}`;
  if (filters.location) {
    url += `&where=${encodeURIComponent(filters.location)}`;
  }

  const rawResults: any[] = [];
  
  // Launch Playwright headless browser
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    console.log(`[JobStreet Scraper] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the job listing cards to appear
    try {
      await page.waitForSelector('a[data-automation="jobTitle"]', { timeout: 10000 });
    } catch (e) {
      console.log("[JobStreet Scraper] Timeout waiting for jobTitle elements.");
    }
    
    // Scrape job cards from the DOM
    const jobsData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('article, div[data-automation="jobListing"]'));
      return cards.slice(0, 10).map(card => {
        const titleEl = card.querySelector('a[data-automation="jobTitle"]');
        const companyEl = card.querySelector('[data-automation="jobCompany"]');
        const locationEl = card.querySelector('[data-automation="jobLocation"]');
        const salaryEl = card.querySelector('[data-automation="jobSalary"]');
        
        const title = titleEl ? titleEl.textContent?.trim() : '';
        const href = titleEl ? titleEl.getAttribute('href') : '';
        const company = companyEl ? companyEl.textContent?.trim() : '';
        const location = locationEl ? locationEl.textContent?.trim() : '';
        const salary = salaryEl ? salaryEl.textContent?.trim() : '';
        
        const bulletEls = Array.from(card.querySelectorAll('ul li, [data-automation="jobCardSnippet"]'));
        const snippet = bulletEls.map(b => b.textContent?.trim()).filter(Boolean).join('. ') || card.textContent?.trim() || '';
        
        return {
          title,
          href,
          company,
          location,
          salary,
          snippet: snippet.slice(0, 500)
        };
      });
    });
    
    for (const job of jobsData) {
      if (job.title && job.href) {
        const jobUrl = job.href.startsWith('http') ? job.href : `${baseUrl}${job.href}`;
        rawResults.push({
          title: job.title,
          company: job.company || 'Unknown Company',
          location: job.location || 'Malaysia',
          salary: job.salary || '',
          snippet: job.snippet,
          link: jobUrl
        });
      }
    }
  } catch (err: any) {
    console.error('[JobStreet Scraper] Error during scraping:', err.message);
  } finally {
    await browser.close();
  }

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
        Company: ${raw.company}
        Location: ${raw.location}
        Salary Info: ${raw.salary}
        Snippet: ${raw.snippet}
      `;

      const structured = await askJSON<any>(prompt, "You are a helpful assistant parsing job search results into JSON.");
      
      jobs.push({
        title: structured.title || raw.title,
        company: structured.company || raw.company || 'Unknown Company',
        location: structured.location || raw.location || filters.location || 'Malaysia',
        description: structured.description || raw.snippet,
        requirements: structured.requirements || { skills: [], experience_years: 0, education: '', other: [] },
        salary_range: structured.salary_range || raw.salary || '',
        url: raw.link,
        source: 'JobStreet',
        posted_date: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to parse job", raw);
    }
  }

  return jobs;
}
