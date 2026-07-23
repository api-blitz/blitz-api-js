/** The Jobs resource: `client.jobs`. */

import type { BlitzAPI } from "../client.js";
import { make_cursor_page_promise, type PagePromise } from "../pagination.js";
import type { CompanyJobsParams, JobSearchParams, RequestOptions } from "../types/filters.js";
import { CompanyJobsResponse, type Job, JobSearchResponse } from "../types/jobs.js";

const SEARCH = "/v2/jobs/search";
const COMPANY = "/v2/jobs/company";

export class JobsResource {
  constructor(private readonly client: BlitzAPI) {}

  /**
   * Search live job postings across companies, combining job-level filters with
   * company firmographics. Cursor-paginated — `for await (const job of …)` to
   * stream all results, or `await` for the first page (`.data`, `.response`,
   * `.has_next_page()`).
   */
  search(
    { max_items, ...params }: JobSearchParams = {},
    options?: RequestOptions,
  ): PagePromise<Job, JobSearchResponse> {
    return make_cursor_page_promise<Job, JobSearchResponse>(
      params.cursor,
      max_items,
      (cursor) =>
        this.client.request("POST", SEARCH, { ...params, cursor }, JobSearchResponse, options),
      (r) => r.results,
      (r) => r.cursor,
    );
  }

  /**
   * List job postings at a single company, scoped by its LinkedIn company URL.
   * Cursor-paginated (see {@link JobsResource.search}).
   */
  company(
    { max_items, ...params }: CompanyJobsParams,
    options?: RequestOptions,
  ): PagePromise<Job, CompanyJobsResponse> {
    return make_cursor_page_promise<Job, CompanyJobsResponse>(
      params.cursor,
      max_items,
      (cursor) =>
        this.client.request("POST", COMPANY, { ...params, cursor }, CompanyJobsResponse, options),
      (r) => r.results,
      (r) => r.cursor,
    );
  }
}
