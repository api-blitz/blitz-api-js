/** The Jobs resource: `client.jobs`. */

import type { BlitzAPI } from "../client.js";
import type { PagePromise } from "../pagination.js";
import type { CompanyJobsParams, JobSearchParams, RequestOptions } from "../types/filters.js";
import { CompanyJobsResponse, type Job, JobSearchResponse } from "../types/jobs.js";
import { cursor_page } from "./paginate.js";

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
    params: JobSearchParams = {},
    options?: RequestOptions,
  ): PagePromise<Job, JobSearchResponse> {
    return cursor_page(this.client, SEARCH, params, JobSearchResponse, options);
  }

  /**
   * List job postings at a single company, scoped by its LinkedIn company URL.
   * Cursor-paginated (see {@link JobsResource.search}).
   */
  company(
    params: CompanyJobsParams,
    options?: RequestOptions,
  ): PagePromise<Job, CompanyJobsResponse> {
    return cursor_page(this.client, COMPANY, params, CompanyJobsResponse, options);
  }
}
