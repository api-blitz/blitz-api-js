/** Response models for the Search resource. */

import * as z from "zod";
import { search_envelope, v2_response } from "./envelopes.js";
import { blitzList, blitzObject } from "./models.js";
import { Company, Person } from "./shared.js";

/** Cursor-paginated result of `search.people`. */
export const PeopleSearchResponse = search_envelope(Person);
export type PeopleSearchResponse = z.infer<typeof PeopleSearchResponse>;

/** Cursor-paginated result of `search.companies`. */
export const CompanySearchResponse = search_envelope(Company);
export type CompanySearchResponse = z.infer<typeof CompanySearchResponse>;

/**
 * Page-paginated result of `search.employee_finder`. The one list endpoint that
 * pages by offset rather than cursor, so it carries `page`/`total_pages` instead
 * of a `cursor` and does not use the cursor envelope.
 */
export const EmployeeFinderResponse = v2_response({
  company_linkedin_url: z.string().nullish(),
  max_results: z.number().nullish(),
  results_length: z.number().nullish(),
  page: z.number().nullish(),
  total_pages: z.number().nullish(),
  results: blitzList(Person),
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

/** Result of `search.waterfall_icp`. Not paginated — a single ranked result set. */
export const WaterfallIcpResponse = v2_response({
  company_linkedin_url: z.string().nullish(),
  max_results: z.number().nullish(),
  results_length: z.number().nullish(),
  results: blitzList(WaterfallIcpMatch),
});
export type WaterfallIcpResponse = z.infer<typeof WaterfallIcpResponse>;
