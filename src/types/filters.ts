/**
 * Typed request structures for the Blitz API endpoints.
 *
 * Keys are snake_case, matching the wire format and the API docs 1:1. Enum-
 * constrained fields accept either a known value (autocompleted from the
 * generated union, e.g. `"Software Development"`) or any raw string, so a value
 * missing from the vendored taxonomy never blocks a caller.
 */

import type {
  CompanyType,
  Continent,
  EmployeeRange,
  EmploymentType,
  Industry,
  JobFunction,
  JobLevel,
  LastFundingType,
  SalesRegion,
  Seniority,
  WorkArrangement,
} from "./enums.js";

// Each accepts a known enum value (autocompleted) or a raw string.
export type IndustryValue = Industry | (string & {});
export type CompanyTypeValue = CompanyType | (string & {});
export type EmployeeRangeValue = EmployeeRange | (string & {});
export type ContinentValue = Continent | (string & {});
export type SalesRegionValue = SalesRegion | (string & {});
export type JobFunctionValue = JobFunction | (string & {});
export type JobLevelValue = JobLevel | (string & {});
export type LastFundingTypeValue = LastFundingType | (string & {});
export type SeniorityValue = Seniority | (string & {});
export type EmploymentTypeValue = EmploymentType | (string & {});
export type WorkArrangementValue = WorkArrangement | (string & {});

/** Free-text include/exclude keyword filter. */
export interface KeywordFilter {
  include?: string[];
  exclude?: string[];
}

/** Include/exclude filter over the fixed industry taxonomy. */
export interface IndustryFilter {
  include?: IndustryValue[];
  exclude?: IndustryValue[];
}

/** Include/exclude filter over company types. */
export interface CompanyTypeFilter {
  include?: CompanyTypeValue[];
  exclude?: CompanyTypeValue[];
}

/** Include/exclude filter over the last-funding-round types. */
export interface LastFundingTypeFilter {
  include?: LastFundingTypeValue[];
  exclude?: LastFundingTypeValue[];
}

/** Numeric range filter. `0` means unset for most fields. */
export interface RangeFilter {
  min?: number;
  max?: number;
}

/** Headquarters-location filter for company search. */
export interface CompanyHQFilter {
  city?: KeywordFilter;
  state?: KeywordFilter;
  country_code?: string[];
  continent?: ContinentValue[];
  sales_region?: SalesRegionValue[];
}

/** Company search criteria, shared by `search.companies` and `search.people`. */
export interface CompanyFilter {
  /** Match specific companies by LinkedIn URL. Applied on `search.people` only;
   * `search.companies` ignores it. */
  linkedin_url?: string[];
  name?: KeywordFilter;
  industry?: IndustryFilter;
  type?: CompanyTypeFilter;
  employee_range?: EmployeeRangeValue[];
  employee_count?: RangeFilter;
  min_linkedin_followers?: number;
  revenue?: RangeFilter;
  naics_code?: KeywordFilter;
  sic_code?: KeywordFilter;
  web_traffic?: RangeFilter;
  ad_spend?: RangeFilter;
  total_funding?: RangeFilter;
  last_funding_amount?: RangeFilter;
  last_funding_year?: RangeFilter;
  last_funding_type?: LastFundingTypeFilter;
  lead_investors?: KeywordFilter;
  keywords?: KeywordFilter;
  founded_year?: RangeFilter;
  hq?: CompanyHQFilter;
}

/** Job-title filter. Wrap a value in `[brackets]` for an exact match. */
export interface PeopleJobTitleFilter {
  include_linkedin_headline?: boolean;
  include?: string[];
  exclude?: string[];
}

/** Location filter for the people side of a people search. */
export interface PeopleLocationFilter {
  /** Keywords matched against the city the person is based in. */
  city?: KeywordFilter;
  country_code?: string[];
  continent?: ContinentValue[];
  sales_region?: SalesRegionValue[];
}

/** People search criteria for `search.people`. */
export interface PeopleFilter {
  /** Match specific people by their LinkedIn profile URL (server caps at 50). */
  linkedin_url?: string[];
  job_title?: PeopleJobTitleFilter;
  job_function?: JobFunctionValue[];
  job_level?: JobLevelValue[];
  min_connections?: number;
  location?: PeopleLocationFilter;
  education?: KeywordFilter;
}

/** One tier of a waterfall ICP cascade, tried in order until results are found. */
export interface CascadeTier {
  include_title: string[];
  /** Server defaults to worldwide when omitted. */
  location?: string[];
  /** Server defaults to `false` when omitted. */
  include_headline_search?: boolean;
  exclude_title?: string[];
}

/**
 * Include/exclude filter over a job's seniority band.
 *
 * These are **years-of-experience** bands on the posting (`0-2`, `2-5`, `5-10`,
 * `10+`) — unrelated to the people-side {@link JobLevelValue} (`C-Team`, `VP`, …).
 */
export interface SeniorityFilter {
  include?: SeniorityValue[];
  exclude?: SeniorityValue[];
}

/** Include/exclude filter over the employment type a job offers. */
export interface EmploymentTypeFilter {
  include?: EmploymentTypeValue[];
  exclude?: EmploymentTypeValue[];
}

/** Include/exclude filter over where the work is performed. */
export interface WorkArrangementFilter {
  include?: WorkArrangementValue[];
  exclude?: WorkArrangementValue[];
}

/** Location filter for a job posting (the job's location, not the company HQ). */
export interface JobLocationFilter {
  city?: KeywordFilter;
  /** ISO-3166 alpha-2 codes, matched exactly. */
  country_code?: KeywordFilter;
}

/** Recency filter restricting results to jobs posted within the last N days. */
export interface DatePostedFilter {
  /** Required when `date_posted` is set (1–3650). */
  last_days: number;
}

/** Job-level search criteria, shared by `jobs.search` and `jobs.company`. */
export interface JobFilter {
  title?: KeywordFilter;
  description?: KeywordFilter;
  /** Broad theme search across title, description, skills, and taxonomies. */
  ai_keywords?: KeywordFilter;
  /** Professional field or discipline. Free-form — accepts any label. */
  field?: KeywordFilter;
  seniority?: SeniorityFilter;
  employment_type?: EmploymentTypeFilter;
  work_arrangement?: WorkArrangementFilter;
  location?: JobLocationFilter;
  date_posted?: DatePostedFilter;
}

/**
 * Job criteria for `company.tam_by_jobs` — the same shape as {@link JobFilter}
 * plus a per-company floor. Extending (rather than adding the field to
 * `JobFilter`) keeps the shared filter used by `jobs.search`/`jobs.company`,
 * which have no such field, clean.
 */
export interface TamJobFilter extends JobFilter {
  /**
   * Only include companies with at least this many matching job postings
   * (integer, 0–25; `0` = unset). Raises the bar for what counts as a hit when
   * building a Total Addressable Market.
   */
  min_per_company?: number;
}

/** Include-only filter over the LinkedIn size buckets. The API exposes no `exclude` here. */
export interface CompanySizeFilter {
  include?: EmployeeRangeValue[];
}

/** Headquarters-location filter for the company side of a job search. */
export interface JobCompanyHQFilter {
  city?: KeywordFilter;
  state?: KeywordFilter;
  /** ISO-3166 alpha-2 codes, matched exactly. */
  country_code?: KeywordFilter;
}

/**
 * Company-level firmographic criteria for `jobs.search`, matched against the
 * enriched company record behind each posting.
 */
export interface JobCompanyFilter {
  /** `true` = only staffing/recruitment agencies, `false` = exclude confirmed
   * agencies. Omit to include both. */
  is_agency?: boolean;
  industry?: IndustryFilter;
  employee_count?: RangeFilter;
  size?: CompanySizeFilter;
  keywords?: KeywordFilter;
  hq?: JobCompanyHQFilter;
}

// ---------------------------------------------------------------------------
// Method parameter shapes (the request body for each endpoint, snake_case).
// ---------------------------------------------------------------------------

export interface PeopleSearchParams {
  company?: CompanyFilter;
  people?: PeopleFilter;
  /** Results **per page** (1–50). The API bills 1 credit per result returned. */
  max_results?: number;
  cursor?: string;
  /**
   * Client-side cap on the **total** items streamed via `for await` / `collect()`
   * across all pages; stops fetching once reached. Not sent on the wire — set
   * `max_results` to bound the per-page (and therefore per-page billing) size.
   */
  max_items?: number;
}

export interface CompanySearchParams {
  company?: CompanyFilter;
  /** Results **per page** (1–50). The API bills 1 credit per result returned. */
  max_results?: number;
  cursor?: string;
  /**
   * Client-side cap on the **total** items streamed via `for await` / `collect()`
   * across all pages; stops fetching once reached. Not sent on the wire — set
   * `max_results` to bound the per-page (and therefore per-page billing) size.
   */
  max_items?: number;
}

export interface JobSearchParams {
  job?: JobFilter;
  company?: JobCompanyFilter;
  /** Results **per page** (1–50). The API bills 1 credit per result returned. */
  max_results?: number;
  cursor?: string;
  /**
   * Client-side cap on the **total** items streamed via `for await` / `collect()`
   * across all pages; stops fetching once reached. Not sent on the wire — set
   * `max_results` to bound the per-page (and therefore per-page billing) size.
   */
  max_items?: number;
}

export interface CompanyJobsParams {
  company_linkedin_url: string;
  job?: JobFilter;
  /** Results **per page** (1–50). The API bills 1 credit per result returned. */
  max_results?: number;
  cursor?: string;
  /**
   * Client-side cap on the **total** items streamed via `for await` / `collect()`
   * across all pages; stops fetching once reached. Not sent on the wire — set
   * `max_results` to bound the per-page (and therefore per-page billing) size.
   */
  max_items?: number;
}

/**
 * Params for `company.tam_by_jobs` — build a Total Addressable Market of
 * companies from live hiring signals (each result is a company plus how many of
 * its current postings matched). Cursor-paginated. The API bills **1 credit per
 * result returned** (up to `max_results`). Can raise `AuthenticationError` (401),
 * `InsufficientCreditsError` (402), `RateLimitError` (429), or `ServerError` (5xx).
 */
export interface TamByJobsParams {
  /** Job-level filters plus `min_per_company` (see {@link TamJobFilter}). */
  job?: TamJobFilter;
  /** Company firmographics — the same block as `jobs.search` ({@link JobCompanyFilter}). */
  company?: JobCompanyFilter;
  /** Results **per page** (1–50, default 10). The API bills 1 credit per result returned. */
  max_results?: number;
  cursor?: string;
  /**
   * Client-side cap on the **total** items streamed via `for await` / `collect()`
   * across all pages; stops fetching once reached. Not sent on the wire — set
   * `max_results` to bound the per-page (and therefore per-page billing) size.
   */
  max_items?: number;
}

export interface EmployeeFinderParams {
  company_linkedin_url: string;
  country_code?: string[];
  continent?: ContinentValue[];
  sales_region?: SalesRegionValue[];
  job_level?: JobLevelValue[];
  job_function?: JobFunctionValue[];
  min_connections_count?: number;
  /** Results **per page** (1–50). The API bills 1 credit per result returned. */
  max_results?: number;
  page?: number;
  /**
   * Client-side cap on the **total** items streamed via `for await` / `collect()`
   * across all pages; stops fetching once reached. Not sent on the wire — set
   * `max_results` to bound the per-page (and therefore per-page billing) size.
   */
  max_items?: number;
}

export interface WaterfallIcpParams {
  company_linkedin_url: string;
  cascade: CascadeTier[];
  /** Minimum LinkedIn connections for a match. Server defaults to 200. */
  profile_min_connections?: number;
  max_results?: number;
}

/** Params for `enrichment.email` and `enrichment.phone`. */
export interface PersonLinkedinUrlParams {
  person_linkedin_url: string;
}

/**
 * Params for `enrichment.company`, `enrichment.linkedin_to_domain`,
 * `enrichment.company_distribution_by_country`, and
 * `enrichment.company_distribution_by_department`.
 */
export interface CompanyLinkedinUrlParams {
  company_linkedin_url: string;
}

export interface EmailToPersonParams {
  email: string;
}

export interface PhoneToPersonParams {
  phone: string;
}

export interface DomainToLinkedinParams {
  domain: string;
}

export interface CurrentDateParams {
  /** IANA timezone (e.g. `America/New_York`). Server defaults to `America/New_York`. */
  region?: string;
}

/**
 * Params for `changelog.list` — the public Blitz API changelog.
 *
 * The endpoint is **public** (no credits, and it works regardless of API-key
 * validity) and **not paginated** — it returns a plain array, newest-first,
 * filtered by these query-string parameters.
 */
export interface ChangelogParams {
  /** Only return entries from the last N days (integer > 0). Omit for all history. */
  days?: number;
  /** Maximum number of entries to return (integer > 0, server default 50). */
  limit?: number;
}

/** Per-call request controls, accepted as the optional last argument of every method. */
export interface RequestOptions {
  /**
   * Per-request timeout in **seconds**. Overrides the client-wide `timeout` for
   * this single call (and, for a paginated method, every page it fetches).
   */
  timeout?: number;
}
