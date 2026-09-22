/** The Company resource: `client.company`. */

import type { BlitzAPI } from "../client.js";
import type { PagePromise } from "../pagination.js";
import {
  type TamByJobsMatch,
  TamByJobsResponse,
  type TamByPeopleMatch,
  TamByPeopleResponse,
} from "../types/company.js";
import type { RequestOptions, TamByJobsParams, TamByPeopleParams } from "../types/filters.js";
import { cursor_page } from "./paginate.js";

const TAM_BY_JOBS = "/v2/company/tam-by-jobs";
const TAM_BY_PEOPLE = "/v2/company/tam-by-people";

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
    params: TamByJobsParams = {},
    options?: RequestOptions,
  ): PagePromise<TamByJobsMatch, TamByJobsResponse> {
    return cursor_page(this.client, TAM_BY_JOBS, params, TamByJobsResponse, options);
  }

  /**
   * Build a Total Addressable Market of companies from the people who already
   * work there: filter people exactly as with `search.people` (title, function,
   * level, location, education) plus company firmographics, and get back the
   * **distinct** companies employing them, each with how many of its current
   * employees matched (`matched_people`). Use `people.min_per_company` to
   * require a minimum number of matching employees per company.
   *
   * Where `tam_by_jobs` sizes accounts on who they are hiring, this sizes them
   * on who already works there. Cursor-paginated — `for await (const match of
   * …)` streams every `{ company, matched_people }` across all pages, or
   * `await` for the first page (`.data`, `.response`, `.has_next_page()`). The
   * API bills **1 record per result returned**; bound spend with `max_items`.
   *
   * `min_per_company` can make a page come back partial, so keep paging until
   * `cursor` is `null` (the `PagePromise` already does).
   */
  tam_by_people(
    params: TamByPeopleParams = {},
    options?: RequestOptions,
  ): PagePromise<TamByPeopleMatch, TamByPeopleResponse> {
    return cursor_page(this.client, TAM_BY_PEOPLE, params, TamByPeopleResponse, options);
  }
}
