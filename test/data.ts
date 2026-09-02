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
  education: [
    {
      school_name: "Stanford University",
      degree: "Bachelor's degree",
      field_of_study: "Computer Science",
      start_date: "2019-01-01",
      end_date: "2023-01-01",
    },
  ],
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

/**
 * The `fair_usage` block the API attaches to every `/v2` response. Spread into
 * the fixtures below so the models are exercised against the real envelope.
 */
export const FAIR_USAGE = {
  records_used: 3,
  records_remaining: 9913547,
  next_reset_at: "2026-09-29T10:25:23.155Z",
  rate_limit: { requests_per_second: 100, remaining_this_second: 97 },
  request_id: "019bae09-0055-7441-b2ea-16086e499219",
};

/** `account.key-info` is the one endpoint that is not rate limited, so it omits `rate_limit`. */
export const FAIR_USAGE_NO_RATE_LIMIT = {
  records_used: 0,
  records_remaining: 9913547,
  next_reset_at: "2026-09-29T10:25:23.155Z",
  request_id: "019bae09-0055-7441-b2ea-16086e499219",
};

export const KEY_INFO = {
  valid: true,
  id: "key_abc123",
  records_remaining: 99.5,
  next_reset_at: "2026-02-12T17:48:25.199Z",
  max_requests_per_seconds: 5,
  allowed_apis: ["/enrichment/email", "/search/people"],
  active_plans: [
    { name: "Unlimited Leads", status: "active", started_at: "2026-01-12T17:48:25.200Z" },
  ],
  fair_usage: FAIR_USAGE_NO_RATE_LIMIT,
};

export const PEOPLE_SEARCH = {
  total_results: 14337505,
  results: [PERSON],
  results_length: 1,
  max_results: 1,
  cursor: "example_cursor_people_p2",
  fair_usage: FAIR_USAGE,
};

export const COMPANY_SEARCH = {
  total_results: 100,
  results: [COMPANY],
  results_length: 1,
  max_results: 1,
  cursor: "example_cursor_companies_p2",
};

const JOB = {
  date_posted: "2026-07-08 23:00:07+02",
  title: "Growth Marketing Manager, SMB Ads",
  url: "https://www.linkedin.com/jobs/view/growth-marketing-manager-smb-ads-at-openai-4437309737",
  company_name: "OpenAI",
  company_linkedin_url: "https://www.linkedin.com/company/openai",
  ai_summary:
    "The Growth Marketing Manager will execute growth experiments across acquisition, activation, lifecycle, and early retention for small business advertisers.",
  location: { city: "San Francisco", country_code: "US" },
};

export const JOB_SEARCH = {
  total_results: 4821,
  results: [JOB],
  results_length: 1,
  max_results: 1,
  cursor: "example_cursor_jobs_p2",
};

export const COMPANY_JOBS = {
  total_results: 37,
  results: [JOB],
  results_length: 1,
  max_results: 1,
  cursor: "example_cursor_company_jobs_p2",
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
  fair_usage: FAIR_USAGE,
};

export const PHONE_ENRICHMENT = { found: true, phone: "+1234567890" };

export const EMAIL_TO_PERSON = { found: true, person: PERSON };

export const PHONE_TO_PERSON = { found: true, person: PERSON };

export const COMPANY_ENRICHMENT = { found: true, company: COMPANY };

export const DOMAIN_TO_LINKEDIN = {
  found: true,
  company_linkedin_url: "https://www.linkedin.com/company/blitz-api",
  company_name: "Blitz",
  other: [
    {
      company_linkedin_url: "https://www.linkedin.com/company/blitz-other",
      company_name: "Blitz Other",
    },
  ],
};

/** An unlimited-plan key: metered fields come back as the literal `"unlimited"`. */
export const KEY_INFO_UNLIMITED = {
  valid: true,
  id: "key_unlimited",
  records_remaining: "unlimited",
  max_requests_per_seconds: "unlimited",
  allowed_apis: ["/search/people"],
  active_plans: [{ name: "Unlimited", status: "active" }],
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
    { country: "US", count: 900, percentage_ratio: 72.93 },
    { country: "unknown", count: 54, percentage_ratio: 4.38 },
  ],
};

export const DEPARTMENT_DISTRIBUTION = {
  company_linkedin_url: "https://www.linkedin.com/company/openai",
  total_employees: 1234,
  distribution: [
    { department: "Engineering", count: 320, percentage_ratio: 25.93 },
    { department: "Other", count: 54, percentage_ratio: 4.38 },
  ],
};

/** Cursor-paginated result of `company.tam_by_jobs` (a company + matched_jobs, no total_results). */
export const TAM_BY_JOBS = {
  results: [{ company: COMPANY, matched_jobs: 7 }],
  results_length: 1,
  max_results: 1,
  cursor: "example_cursor_tam_p2",
};

/** Public changelog: a top-level array of entries, newest-first. */
export const CHANGELOG = [
  {
    date: "2026-08-01",
    type: "feature",
    title: "Added the company TAM-by-jobs endpoint",
    body: "Build a Total Addressable Market of companies from live hiring signals.",
    affected_endpoints: ["/v2/company/tam-by-jobs"],
    links: [{ label: "Docs", url: "https://docs.blitz-api.ai/changelog" }],
  },
  { date: "2026-07-15", type: "fix", title: "Fixed a cursor pagination edge case" },
];
