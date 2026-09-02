/** Response models for the Search resource. */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";
import { Company, FairUsage, Person } from "./shared.js";

/** Cursor-paginated result of `search.people`. */
export const PeopleSearchResponse = blitzObject({
  total_results: z.number().nullish(),
  results: blitzList(Person),
  results_length: z.number().nullish(),
  max_results: z.number().nullish(),
  cursor: z.string().nullish(),
  /** Record usage, rate limit, and tracing data for this request. */
  fair_usage: FairUsage.nullish(),
});
export type PeopleSearchResponse = z.infer<typeof PeopleSearchResponse>;

/** Cursor-paginated result of `search.companies`. */
export const CompanySearchResponse = blitzObject({
  total_results: z.number().nullish(),
  results: blitzList(Company),
  results_length: z.number().nullish(),
  max_results: z.number().nullish(),
  cursor: z.string().nullish(),
  /** Record usage, rate limit, and tracing data for this request. */
  fair_usage: FairUsage.nullish(),
});
export type CompanySearchResponse = z.infer<typeof CompanySearchResponse>;

/** Page-paginated result of `search.employee_finder`. */
export const EmployeeFinderResponse = blitzObject({
  company_linkedin_url: z.string().nullish(),
  max_results: z.number().nullish(),
  results_length: z.number().nullish(),
  page: z.number().nullish(),
  total_pages: z.number().nullish(),
  results: blitzList(Person),
  /** Record usage, rate limit, and tracing data for this request. */
  fair_usage: FairUsage.nullish(),
});
export type EmployeeFinderResponse = z.infer<typeof EmployeeFinderResponse>;

/**
 * A single match from a waterfall ICP search.
 *
 * `icp` is the cascade tier that matched (1 = highest priority) and `ranking`
 * is the overall relevance within the company (1 = most relevant).
 */
export const WaterfallIcpMatch = blitzObject({
  icp: z.number().nullish(),
  ranking: z.number().nullish(),
  person: Person.nullish(),
});
export type WaterfallIcpMatch = z.infer<typeof WaterfallIcpMatch>;

/** Result of `search.waterfall_icp`. */
export const WaterfallIcpResponse = blitzObject({
  company_linkedin_url: z.string().nullish(),
  max_results: z.number().nullish(),
  results_length: z.number().nullish(),
  results: blitzList(WaterfallIcpMatch),
  /** Record usage, rate limit, and tracing data for this request. */
  fair_usage: FairUsage.nullish(),
});
export type WaterfallIcpResponse = z.infer<typeof WaterfallIcpResponse>;
