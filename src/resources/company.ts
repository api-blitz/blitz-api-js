/** The Company resource: `client.company`. */

import type { BlitzAPI } from "../client.js";
import { make_cursor_page_promise, type PagePromise } from "../pagination.js";
import { type TamByJobsMatch, TamByJobsResponse } from "../types/company.js";
import type { RequestOptions, TamByJobsParams } from "../types/filters.js";

const TAM_BY_JOBS = "/v2/company/tam-by-jobs";

export class CompanyResource {
  constructor(private readonly client: BlitzAPI) {}

  /**
   * Build a Total Addressable Market of companies from live hiring signals:
   * combine job-level filters (title, description, seniority, ...) with company
   * firmographics, and get back each matching company plus how many of its
   * current postings matched (`matched_jobs`). Use `job.min_per_company` to
   * require a minimum number of matching postings per company.
   *
   * Cursor-paginated — `for await (const match of …)` streams every
   * `{ company, matched_jobs }` across all pages, or `await` for the first page
   * (`.data`, `.response`, `.has_next_page()`). The API bills **1 record per
   * result returned**; bound spend with `max_items`.
   */
  tam_by_jobs(
    { max_items, ...params }: TamByJobsParams = {},
    options?: RequestOptions,
  ): PagePromise<TamByJobsMatch, TamByJobsResponse> {
    return make_cursor_page_promise<TamByJobsMatch, TamByJobsResponse>(
      params.cursor,
      max_items,
      (cursor) =>
        this.client.request("POST", TAM_BY_JOBS, { ...params, cursor }, TamByJobsResponse, options),
      (r) => r.results,
      (r) => r.cursor,
    );
  }
}
