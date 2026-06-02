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
  Industry,
  JobFunction,
  JobLevel,
  SalesRegion,
} from "./enums.js";

// Each accepts a known enum value (autocompleted) or a raw string.
export type IndustryValue = Industry | (string & {});
export type CompanyTypeValue = CompanyType | (string & {});
export type EmployeeRangeValue = EmployeeRange | (string & {});
export type ContinentValue = Continent | (string & {});
export type SalesRegionValue = SalesRegion | (string & {});
export type JobFunctionValue = JobFunction | (string & {});
export type JobLevelValue = JobLevel | (string & {});

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

/** Numeric range filter. `0` means unset for most fields. */
export interface RangeFilter {
  min?: number;
  max?: number;
}

/** Headquarters-location filter for company search. */
export interface CompanyHQFilter {
  city?: KeywordFilter;
  country_code?: string[];
  continent?: ContinentValue[];
  sales_region?: SalesRegionValue[];
}

/** Company search criteria, shared by `search.companies` and `search.people`. */
export interface CompanyFilter {
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
  city?: string[];
  country_code?: string[];
  continent?: ContinentValue[];
  sales_region?: SalesRegionValue[];
}

/** People search criteria for `search.people`. */
export interface PeopleFilter {
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
  location: string[];
  include_headline_search: boolean;
  exclude_title?: string[];
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
  max_results?: number;
}

/** Params for `enrichment.email` and `enrichment.phone`. */
export interface PersonLinkedinUrlParams {
  person_linkedin_url: string;
}

/**
 * Params for `enrichment.company`, `enrichment.linkedin_to_domain`, and
 * `utils.company_employment_distribution`.
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
  region: string;
}
