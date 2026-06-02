/**
 * Canonical example response payloads, mirroring the Blitz OpenAPI v2 examples
 * (ported from the Python SDK's test fixtures). Used to test the hand-written
 * Zod schemas against the shapes the API actually returns.
 */

const PERSON = {
  first_name: "Beulah",
  last_name: "Lee",
  full_name: "Beulah Lee",
  nickname: null,
  civility_title: null,
  headline: "Software Engineer at Google",
  about_me: "Motivated engineer.",
  location: {
    city: "Sunnyvale",
    state_code: "CA",
    country_code: "US",
    continent: "North America",
  },
  linkedin_url: "https://www.linkedin.com/in/beulah-lee",
  connections_count: 500,
  profile_picture_url: "https://media.licdn.com/dms/image/v2/photo",
  experiences: [
    {
      company_name: "Google",
      job_title: "Software Engineer",
      company_linkedin_url: "https://www.linkedin.com/company/google",
      company_linkedin_id: "c346a3f2-6914-51e8-bb11-7da93440a3c0",
      company_domain: "google.com",
      job_description: "Google Workspace",
      job_start_date: "2025-04-01",
      job_end_date: null,
      job_is_current: true,
      job_location: { city: "Sunnyvale", state_code: "CA", country_code: "US" },
    },
  ],
  education: [{ degree: "Bachelor's degree", start_date: "2019-01-01", end_date: "2023-01-01" }],
  skills: ["python"],
  certifications: [
    { authority: "Google", name: "Cloud Cybersecurity", url: "https://example.com/badge" },
  ],
};

const COMPANY = {
  linkedin_url: "https://www.linkedin.com/company/google",
  linkedin_id: 1441,
  name: "Google",
  about: "A problem isn't solved until it's solved for all.",
  specialties: ["search", "cloud"],
  industry: "Software Development",
  type: "Public Company",
  size: "10001+",
  employees_on_linkedin: 328177,
  followers: 40093219,
  founded_year: null,
  hq: {
    city: "Mountain View",
    state: "California",
    country_code: "US",
    country_name: "United States",
    region: "NORAM",
    continent: "North America",
  },
  domain: "google.com",
  website: "https://www.google.com",
};

export const KEY_INFO = {
  valid: true,
  id: "key_abc123",
  remaining_credits: 99.5,
  next_reset_at: "2026-02-12T17:48:25.199Z",
  max_requests_per_seconds: 5,
  allowed_apis: ["/enrichment/email", "/search/people"],
  active_plans: [
    { name: "Unlimited Leads", status: "active", started_at: "2026-01-12T17:48:25.200Z" },
  ],
};

export const PEOPLE_SEARCH = {
  total_results: 14337505,
  results: [PERSON],
  results_length: 1,
  max_results: 1,
  cursor: "eyJzIjpbNTAwXX0",
};

export const COMPANY_SEARCH = {
  total_results: 100,
  results: [COMPANY],
  results_length: 1,
  max_results: 1,
  cursor: "eyJpIjoiY2E5OTcxZjU",
};

export const EMPLOYEE_FINDER = {
  company_linkedin_url: "https://www.linkedin.com/company/openai",
  max_results: 1,
  results_length: 1,
  page: 1,
  total_pages: 1285,
  results: [PERSON],
};

export const WATERFALL_ICP = {
  company_linkedin_url: "https://www.linkedin.com/company/openai",
  max_results: 1,
  results_length: 1,
  results: [{ icp: 1, ranking: 1, person: PERSON }],
};

export const EMAIL_ENRICHMENT = {
  found: true,
  email: "antoine@blitz-agency.com",
  all_emails: [
    {
      email: "antoine@blitz-agency.com",
      job_order_in_profile: 1,
      company_linkedin_url: "https://www.linkedin.com/company/blitz-api",
      email_domain: "blitz-agency.com",
    },
  ],
};

export const PHONE_ENRICHMENT = { found: true, phone: "+1234567890" };

export const EMAIL_TO_PERSON = { found: true, person: PERSON };

export const PHONE_TO_PERSON = { found: true, person: PERSON };

export const COMPANY_ENRICHMENT = { found: true, company: COMPANY };

export const DOMAIN_TO_LINKEDIN = {
  found: true,
  company_linkedin_url: "https://www.linkedin.com/company/blitz-api",
};

export const LINKEDIN_TO_DOMAIN = { found: true, email_domain: "blitz-agency.com" };

export const CURRENT_DATE = {
  datetime: "2026-01-08 12:00:00 -05:00",
  timestamp: 1736385600,
  timezone: "America/New_York",
  timezone_name: "(GMT-05:00) New York",
};

export const EMPLOYMENT_DISTRIBUTION = {
  company_linkedin_url: "https://www.linkedin.com/company/openai",
  total_employees: 1234,
  distribution: [
    { country: "US", count: 900 },
    { country: "unknown", count: 54 },
  ],
};
