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
  MxProvider,
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
export type MxProviderValue = MxProvider | (string & {});
export type SeniorityValue = Seniority | (string & {});
export type EmploymentTypeValue = EmploymentType | (string & {});
export type WorkArrangementValue = WorkArrangement | (string & {});

/**
 * Free-text include/exclude keyword filter.
 *
 * Every filter list on the search endpoints is capped at **50 entries** server
 * side; a longer list is rejected with a `422`. Split a longer list across
 * several requests.
 */
export interface KeywordFilter {
  include?: string[];
  exclude?: string[];
}

/**
 * Include/exclude filter over the fixed industry taxonomy.
 *
 * `"Unknown"` is a sentinel, not a real industry. In `include` it is added to the
 * industries you list (`["Banking", "Unknown"]` returns banks plus the sentinel's
 * matches); in `exclude` it drops them. Added 2026-09-16 — before it, reaching those
 * records meant listing every other industry in `exclude`, which the 50-entry cap made
 * impossible.
 *
 * What it matches depends on the endpoint. On `search.companies` it is a company with
 * **no industry value**. On the people- and job-side endpoints (`search.people`,
 * `company.tam_by_people`, `jobs.*`, `company.tam_by_jobs`), where this filter sits
 * under `company.industry`, it matches those **and** — since 2026-09-17 — records with
 * **no company attached at all**; `exclude` drops both groups.
 */
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

/**
 * Include/exclude filter over the mail provider behind a company's domains, read
 * from their MX records. A company matches when **any** of its domains uses the
 * provider. Each list is capped at 50 entries.
 *
 * `"any"` stands for every provider: in `include` it keeps companies that have MX
 * data, in `exclude` it keeps companies that have none. A company with no MX data is
 * never matched by `include`, and `exclude` never drops it. For example,
 * `{ include: ["any"], exclude: ["google"] }` means companies with MX data that do
 * not use Google.
 */
export interface MxProviderFilter {
  include?: MxProviderValue[];
  exclude?: MxProviderValue[];
}

/** Mail-provider (MX record) criteria for a company. */
export interface MxFilter {
  provider?: MxProviderFilter;
}

/**
 * Numeric range filter. `0` means unset for most fields, and a `max` of `0`
 * specifically means **no upper bound**.
 *
 * Since 2026-09-16 a range whose `min` is above its `max` is rejected with a
 * `422` naming the field. Previously it was accepted and silently misbehaved —
 * `company.revenue` failed with a `500`, every other range returned no results —
 * so this surfaces as a thrown `APIStatusError` rather than an empty page.
 */
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

/**
 * Company search criteria, shared by `search.companies`, `search.people` and
 * `company.tam_by_people`.
 *
 * `linkedin_url` is **not** here: only the people-side endpoints honour it, and
 * `search.companies` accepts-then-ignores it — see {@link PeopleCompanyFilter}.
 */
export interface CompanyFilter {
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
  /** Mail provider of the company, from the MX records of its domains. */
  mx?: MxFilter;
}

/**
 * Company criteria for the people-side searches — the same shape as
 * {@link CompanyFilter} plus the `linkedin_url` filter that only `search.people`
 * and `company.tam_by_people` honour.
 *
 * Extending (rather than leaving the field on the shared filter) keeps it off
 * `search.companies`, which accepts it and then silently returns results for the
 * other criteria — the same accepted-but-ignored failure mode that got
 * `linkedin_url` removed from {@link PeopleFilter}, and the same split as
 * {@link TamPeopleFilter} over {@link PeopleFilter}.
 */
export interface PeopleCompanyFilter extends CompanyFilter {
  /** Match specific companies by LinkedIn URL (server caps the list at 50). */
  linkedin_url?: string[];
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

/**
 * Education filter: free-text phrases plus start- and end-year ranges.
 *
 * `include`/`exclude` phrases are matched against a person's education entries
 * (organization, degree and end year); the tokens of one phrase must co-occur
 * within a **single** entry, so wrap the year in the phrase (`"Stanford 2025"`) to
 * correlate school and year.
 *
 * Both year ranges apply to **that same entry** as `include`, and an entry with no
 * such year never matches a bound. Years run 0–2100 and `0` leaves a bound unset; a
 * range with `min` above `max` is rejected with a `422`.
 */
export interface PeopleEducationFilter extends KeywordFilter {
  /** Year an education entry started. */
  start_year?: RangeFilter;
  /** Year an education entry ended (the graduation year). */
  end_year?: RangeFilter;
}

/**
 * The `is_recent_hire` flag. Where it sits in the request body depends on the endpoint:
 * inside the `people` object on `search.people` and `company.tam_by_people` ({@link
 * PeopleFilter}), inside each `cascade` tier on `search.waterfall_icp` ({@link
 * CascadeTier}), and top-level on `search.employee_finder` and both
 * `enrichment.company_distribution_by_*` methods. The types place it accordingly and
 * nowhere else — a field in the wrong place is a `422`, not ignored.
 */
export interface RecentHireFlag {
  /**
   * Keep only people whose job started in the **last 90 days** (default `false`). A job
   * with no start date never matches.
   *
   * Which job is checked depends on the endpoint:
   * - `search.people`, `company.tam_by_people`: a job that also matches your other job
   *   and company filters. On `search.people` that covers the jobs
   *   {@link JobHistoryFlags} selects (current jobs by default).
   * - `search.waterfall_icp`: within this tier, a job at the company that also matches
   *   the tier's title filters — again among the jobs {@link JobHistoryFlags} selects.
   * - `search.employee_finder`: the person's current job at the company, which must also
   *   match `job_level` and `job_function`.
   * - `enrichment.company_distribution_by_*`: only people whose current job at the
   *   company started in the window are counted.
   */
  is_recent_hire?: boolean;
}

/**
 * Which of a person's jobs `search.people` (inside `people`) and `search.waterfall_icp`
 * (inside each `cascade` tier) match against.
 *
 * Your job and company filters (and, on the waterfall, the tier's title filters) must
 * all hold in the **same** job. The matched job comes back in `experiences[]`, with
 * `job_is_current` saying whether it is a current one. A person is returned once; if
 * both a current and a past job match, the current one is preferred. Setting both flags
 * to `false` is rejected with a `422`.
 */
export interface JobHistoryFlags {
  /** Search each person's current jobs. Defaults to `true`. */
  include_active_jobs?: boolean;
  /** Also search each person's past jobs. Defaults to `false`. */
  include_past_jobs?: boolean;
}

/**
 * People search criteria, shared by `search.people` and
 * `company.tam_by_people`.
 *
 * `linkedin_url` is **not** here: `/v2/search/people` stopped accepting it on
 * 2026-09-11 (a request that still sends it succeeds but silently ignores the
 * filter), and it survives only on `company.tam_by_people` — see
 * {@link TamPeopleFilter}.
 *
 * `include_active_jobs`/`include_past_jobs` are **not** here either: only
 * `search.people` takes them — see {@link PeopleSearchFilter}.
 */
export interface PeopleFilter extends RecentHireFlag {
  job_title?: PeopleJobTitleFilter;
  job_description?: KeywordFilter;
  job_function?: JobFunctionValue[];
  job_level?: JobLevelValue[];
  min_connections?: number;
  location?: PeopleLocationFilter;
  education?: PeopleEducationFilter;
}

/**
 * People criteria for `search.people` — the same shape as {@link PeopleFilter} plus the
 * {@link JobHistoryFlags}. Extending (rather than widening `PeopleFilter`) keeps them off
 * `company.tam_by_people`, which matches current employees only and rejects the fields
 * — the same split as {@link TamPeopleFilter}.
 */
export interface PeopleSearchFilter extends PeopleFilter, JobHistoryFlags {}

/**
 * One tier of a waterfall ICP cascade, tried in order until results are found. Each tier
 * carries its own {@link RecentHireFlag} and {@link JobHistoryFlags}.
 */
export interface CascadeTier extends RecentHireFlag, JobHistoryFlags {
  /**
   * Phrases matched against the job title (up to 50). Wrap a phrase in `[brackets]`
   * (`"[CEO]"`) for an exact match, ignoring case and accents; otherwise it is a
   * tokenized full-text match.
   */
  include_title: string[];
  /** Server defaults to worldwide when omitted. Each entry must be at least 2 characters. */
  location?: string[];
  /** Server defaults to `false` when omitted. */
  include_headline_search?: boolean;
  /** Phrases to exclude from the job title (up to 50); `[brackets]` work as in `include_title`. */
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
  /**
   * Matched against the job title only (a strict role search). Wrap a phrase in
   * `[brackets]` (`"[Head of Sales]"`) to match the whole title exactly, ignoring case
   * and accents, in `include` or `exclude`; an unbracketed phrase is a tokenized
   * full-text match, as before.
   */
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

/**
 * People criteria for `company.tam_by_people` — the same shape as
 * {@link PeopleFilter} plus a per-company floor and the `linkedin_url` filter
 * that `search.people` no longer honours. Extending (rather than widening
 * `PeopleFilter`) keeps the shared filter, which has neither field, clean —
 * the same split as {@link TamJobFilter} over {@link JobFilter}.
 */
export interface TamPeopleFilter extends PeopleFilter {
  /** Match specific people by their LinkedIn profile URL (server caps at 50). */
  linkedin_url?: string[];
  /**
   * Only include companies with at least this many matching employees
   * (integer, 0–25; `0` = unset). When it filters heavily a page may come back
   * partial — keep paging until `cursor` is `null`.
   */
  min_per_company?: number;
}

/** Include-only filter over the LinkedIn size buckets. The API exposes no `exclude` here. */
export interface CompanySizeFilter {
  include?: EmployeeRangeValue[];
}

/** Headquarters-location filter for the company side of a job search. */
export interface JobCompanyHQFilter {
  /** Wrap a phrase in `[brackets]` to match the whole city exactly, ignoring case and accents. */
  city?: KeywordFilter;
  /** Wrap a phrase in `[brackets]` to match the whole state/region exactly, ignoring case and accents. */
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
  mx?: MxFilter;
}

// ---------------------------------------------------------------------------
// Method parameter shapes (the request body for each endpoint, snake_case).
// ---------------------------------------------------------------------------

/**
 * The paging controls every cursor-paginated method accepts.
 *
 * `max_results` is the **page size**, not a total: the API bills 1 record per
 * result returned, so a bare `for await` streams every match up to the server
 * limit. Bound the total with `max_items`.
 */
export interface CursorPaginatedParams {
  /** Results **per page** (1–50, default 10). The API bills 1 record per result returned. */
  max_results?: number;
  /** Pass back the `cursor` from the previous page; `null` there means the walk is done. */
  cursor?: string;
  /**
   * Client-side cap on the **total** items streamed via `for await` / `collect()`
   * across all pages; stops fetching once reached. Not sent on the wire — set
   * `max_results` to bound the per-page (and therefore per-page billing) size.
   */
  max_items?: number;
}

/** The paging controls the one offset-paginated method (`search.employee_finder`) accepts. */
export interface OffsetPaginatedParams extends Omit<CursorPaginatedParams, "cursor"> {
  /** 1-based page number. Defaults to 1. */
  page?: number;
}

export interface PeopleSearchParams extends CursorPaginatedParams {
  company?: PeopleCompanyFilter;
  people?: PeopleSearchFilter;
}

export interface CompanySearchParams extends CursorPaginatedParams {
  company?: CompanyFilter;
}

export interface JobSearchParams extends CursorPaginatedParams {
  job?: JobFilter;
  company?: JobCompanyFilter;
}

export interface CompanyJobsParams extends CursorPaginatedParams {
  company_linkedin_url: string;
  job?: JobFilter;
}

/**
 * Params for `company.tam_by_jobs` — build a Total Addressable Market of
 * companies from live hiring signals (each result is a company plus how many of
 * its current postings matched). Cursor-paginated. The API bills **1 record per
 * result returned** (up to `max_results`). Can raise `AuthenticationError` (401),
 * `InsufficientRecordsError` (402), `RateLimitError` (429), or `ServerError` (5xx).
 */
export interface TamByJobsParams extends CursorPaginatedParams {
  /** Job-level filters plus `min_per_company` (see {@link TamJobFilter}). */
  job?: TamJobFilter;
  /** Company firmographics — the same block as `jobs.search` ({@link JobCompanyFilter}). */
  company?: JobCompanyFilter;
}

/**
 * Params for `company.tam_by_people` — build a Total Addressable Market of
 * companies from the people who already work there (each result is a company
 * plus how many of its current employees matched). Takes the same filters as
 * `search.people`, except the {@link JobHistoryFlags} — it matches current
 * employees only. Cursor-paginated. The API bills **1 record per result
 * returned** (up to `max_results`). Can raise `AuthenticationError` (401),
 * `InsufficientRecordsError` (402), `RateLimitError` (429), or `ServerError` (5xx).
 */
export interface TamByPeopleParams extends CursorPaginatedParams {
  /** Company firmographics — the same block as `search.people` ({@link PeopleCompanyFilter}). */
  company?: PeopleCompanyFilter;
  /** People filters plus `linkedin_url`/`min_per_company` (see {@link TamPeopleFilter}). */
  people?: TamPeopleFilter;
}

export interface EmployeeFinderParams extends OffsetPaginatedParams, RecentHireFlag {
  company_linkedin_url: string;
  country_code?: string[];
  continent?: ContinentValue[];
  sales_region?: SalesRegionValue[];
  job_level?: JobLevelValue[];
  job_function?: JobFunctionValue[];
  min_connections_count?: number;
}

export interface WaterfallIcpParams {
  company_linkedin_url: string;
  /** Tiers tried in priority order. Capped at **10** steps server side. */
  cascade: CascadeTier[];
  /** Minimum LinkedIn connections for a match. Server defaults to `0`. */
  profile_min_connections?: number;
  /** Results to return (1–100, default 10) — a higher ceiling than the paginated endpoints' 50. */
  max_results?: number;
}

/** Params for `enrichment.person`, `enrichment.email`, and `enrichment.phone`. */
export interface PersonLinkedinUrlParams {
  person_linkedin_url: string;
}

/** Params for `enrichment.company` and `enrichment.linkedin_to_domain`. */
export interface CompanyLinkedinUrlParams {
  company_linkedin_url: string;
}

/**
 * Params for `enrichment.company_distribution_by_country` and
 * `enrichment.company_distribution_by_department`. Extending
 * {@link CompanyLinkedinUrlParams} (rather than widening it) keeps `is_recent_hire`
 * off `enrichment.company` and `enrichment.linkedin_to_domain`, which reject
 * an unknown field with a `422`.
 */
export interface CompanyDistributionParams extends CompanyLinkedinUrlParams, RecentHireFlag {}

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
 * The endpoint is **public** (no records, and it works regardless of API-key
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
