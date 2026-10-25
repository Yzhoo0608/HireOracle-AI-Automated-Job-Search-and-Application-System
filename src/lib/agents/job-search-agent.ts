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

  // Normalize and clean target search titles
  let targetTitles = Array.from(
    new Set(searchKeywords.map(t => typeof t === 'string' ? t.trim() : '').filter(Boolean))
  );
  if (targetTitles.length === 0) {
    targetTitles = ["Software Engineer"];
  }
  // Cap at top 3 titles to keep scraping responsive
  targetTitles = targetTitles.slice(0, 3);

  // Determine JobStreet base URL based on location
  let baseUrl = 'https://my.jobstreet.com';
  const rawLoc = (filters.location || '').trim();
  const locLower = rawLoc.toLowerCase();
  if (locLower.includes('singapore')) {
    baseUrl = 'https://sg.jobstreet.com';
  } else if (locLower.includes('philippines') || locLower.includes('manila')) {
    baseUrl = 'https://ph.jobstreet.com';
  } else if (locLower.includes('indonesia') || locLower.includes('jakarta')) {
    baseUrl = 'https://id.jobstreet.com';
  }

  // Filter out non-geographic or generic location strings that break JobStreet &where=
  const isGenericLocation = ['remote', 'any', 'all', 'malaysia', 'nationwide', 'open to all'].includes(locLower);
  const targetLocation = (!isGenericLocation && rawLoc.length > 0) ? rawLoc : '';

  const rawResults: any[] = [];
  const seenUrls = new Set<string>();
  const scrapingErrors: string[] = [];

  // Launch Playwright headless browser
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'Asia/Kuala_Lumpur',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const page = await context.newPage();

    // Helper function to scrape a single JobStreet query URL
    const scrapeUrl = async (queryUrl: string, titleLabel: string): Promise<number> => {
      console.log(`[JobStreet Scraper] Navigating to: ${queryUrl}`);
      try {
        await page.goto(queryUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

        // Check for Cloudflare challenge
        const pageTitle = (await page.title()) || '';
        const isCloudflare = pageTitle.toLowerCase().includes('just a moment') || 
                             pageTitle.toLowerCase().includes('security check') ||
                             pageTitle.toLowerCase().includes('cloudflare');
        if (isCloudflare) {
          const err = `JobStreet Cloudflare challenge intercepted query for "${titleLabel}"`;
          console.warn(`[JobStreet Scraper] ${err}`);
          scrapingErrors.push(err);
          return 0;
        }

        // Wait for job cards to appear
        try {
          await page.waitForSelector('a[data-automation="jobTitle"]', { timeout: 8000 });
        } catch (e) {
          console.log(`[JobStreet Scraper] No jobTitle cards found for: "${titleLabel}"`);
        }

        // Scrape job cards from the DOM
        const cards = await page.evaluate(() => {
          const cardEls = Array.from(document.querySelectorAll('article, div[data-automation="jobListing"]'));
          return cardEls.slice(0, 10).map(card => {
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

        let addedCount = 0;
        for (const job of cards) {
          if (job.title && job.href) {
            const jobUrl = job.href.startsWith('http') ? job.href : `${baseUrl}${job.href}`;
            if (!seenUrls.has(jobUrl)) {
              seenUrls.add(jobUrl);
              rawResults.push({
                title: job.title,
                company: job.company || 'Unknown Company',
                location: job.location || (targetLocation || 'Malaysia'),
                salary: job.salary || '',
                snippet: job.snippet,
                link: jobUrl
              });
              addedCount++;
            }
          }
        }
        return addedCount;
      } catch (err: any) {
        console.error(`[JobStreet Scraper] Error scraping ${queryUrl}:`, err.message);
        scrapingErrors.push(`Error for "${titleLabel}": ${err.message}`);
        return 0;
      }
    };

    // Task 1: Search EACH job title separately
    for (const title of targetTitles) {
      let queryUrl = `${baseUrl}/jobs?keywords=${encodeURIComponent(title)}&sortmode=listeddate`;
      if (targetLocation) {
        queryUrl += `&where=${encodeURIComponent(targetLocation)}`;
      }

      const found = await scrapeUrl(queryUrl, `${title} in ${targetLocation || 'All'}`);

      // Task 2: Location Fallback — If searching a specific state returned 0, retry nationwide
      if (found === 0 && targetLocation) {
        console.log(`[JobStreet Scraper] Location "${targetLocation}" yielded 0 jobs for "${title}". Retrying nationwide Malaysia search...`);
        const fallbackUrl = `${baseUrl}/jobs?keywords=${encodeURIComponent(title)}&sortmode=listeddate`;
        await scrapeUrl(fallbackUrl, `${title} (Nationwide Fallback)`);
      }

      // Small 1s delay between queries to avoid rapid-fire bot blocks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (err: any) {
    console.error('[JobStreet Scraper] Fatal browser error:', err.message);
    scrapingErrors.push(err.message);
  } finally {
    await browser.close();
  }

  // Task 5: If all searches failed because of Cloudflare or errors, log and notify
  if (rawResults.length === 0 && scrapingErrors.length > 0) {
    console.warn(`[JobStreet Scraper] Scraping completed with 0 results. Errors encountered:\n${scrapingErrors.join('\n')}`);
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
          "job_type": "string",
          "remote_mode": "string",
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
        job_type: structured.job_type || '',
        remote_mode: structured.remote_mode || '',
        is_active: true,
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

/**
 * Verify whether a job listing is still open and active on JobStreet.
 * Returns false if the posting is expired, closed, or removed.
 */
export async function verifyJobIsActive(jobUrl: string): Promise<boolean> {
  if (!jobUrl || !jobUrl.startsWith('http')) return true;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    const res = await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    if (res && (res.status() === 404 || res.status() === 410)) {
      return false;
    }

    const text = await page.evaluate(() => document.body ? document.body.innerText.toLowerCase() : '');
    const isExpired =
      text.includes('no longer advertised') ||
      text.includes('no longer available') ||
      text.includes('this job has expired') ||
      text.includes('jobs remain on jobstreet for 30 days') ||
      text.includes('this job is closed') ||
      text.includes('no longer accepting applications');

    return !isExpired;
  } catch (err: any) {
    console.warn(`[Job Verification] Could not verify URL ${jobUrl}:`, err.message);
    // In case of timeout or minor navigation issue, assume active to avoid false negatives
    return true;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
