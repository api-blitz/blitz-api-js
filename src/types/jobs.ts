/** Response models for the Jobs resource. */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";
import { FairUsage, Location } from "./shared.js";

/**
 * A single job posting returned by `jobs.search` and `jobs.company`.
 *
 * `date_posted` is the raw timestamp string the API emits (e.g.
 * `"2026-07-08 23:00:07+02"` — a space separator and a UTC offset, not ISO-8601),
 * so it is kept as a string rather than coerced to a `Date`. `location` reuses the
 * shared {@link Location} model, of which the jobs payload populates `city` and
 * `country_code`.
 */
export const Job = blitzObject({
  date_posted: z.string().nullish(),
  title: z.string().nullish(),
  url: z.string().nullish(),
  company_name: z.string().nullish(),
  company_linkedin_url: z.string().nullish(),
  ai_summary: z.string().nullish(),
  location: Location.nullish(),
});
export type Job = z.infer<typeof Job>;

/** Cursor-paginated result of `jobs.search`. */
export const JobSearchResponse = blitzObject({
  total_results: z.number().nullish(),
  results: blitzList(Job),
  results_length: z.number().nullish(),
  max_results: z.number().nullish(),
  cursor: z.string().nullish(),
  /** Record usage, rate limit, and tracing data for this request. */
  fair_usage: FairUsage.nullish(),
});
export type JobSearchResponse = z.infer<typeof JobSearchResponse>;

/** Cursor-paginated result of `jobs.company`. */
export const CompanyJobsResponse = blitzObject({
  total_results: z.number().nullish(),
  results: blitzList(Job),
  results_length: z.number().nullish(),
  max_results: z.number().nullish(),
  cursor: z.string().nullish(),
  /** Record usage, rate limit, and tracing data for this request. */
  fair_usage: FairUsage.nullish(),
});
export type CompanyJobsResponse = z.infer<typeof CompanyJobsResponse>;
