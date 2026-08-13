/** Response models for the Company resource (TAM builders). */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";
import { Company } from "./shared.js";

/**
 * One `company.tam_by_jobs` match: a company plus how many of its live job
 * postings matched the filters. `matched_jobs` is the count on this company (it
 * respects the request's `job.min_per_company` floor). `company` reuses the
 * shared {@link Company} model.
 */
export const TamByJobsMatch = blitzObject({
  company: Company.nullish(),
  matched_jobs: z.number().nullish(),
});
export type TamByJobsMatch = z.infer<typeof TamByJobsMatch>;

/**
 * Cursor-paginated result of `company.tam_by_jobs`. Unlike the search/jobs
 * envelopes this one carries **no `total_results`** (the spec omits it); iterate
 * until `cursor` is `null`. `results` is a list of {@link TamByJobsMatch}.
 */
export const TamByJobsResponse = blitzObject({
  results: blitzList(TamByJobsMatch),
  results_length: z.number().nullish(),
  max_results: z.number().nullish(),
  cursor: z.string().nullish(),
});
export type TamByJobsResponse = z.infer<typeof TamByJobsResponse>;
