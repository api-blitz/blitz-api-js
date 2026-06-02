/** The Search resource: `client.search`. */

import type { BlitzAPI } from "../client.js";
import {
  make_cursor_page_promise,
  make_offset_page_promise,
  type PagePromise,
} from "../pagination.js";
import type {
  CompanySearchParams,
  EmployeeFinderParams,
  PeopleSearchParams,
  RequestOptions,
  WaterfallIcpParams,
} from "../types/filters.js";
import {
  CompanySearchResponse,
  EmployeeFinderResponse,
  PeopleSearchResponse,
  WaterfallIcpResponse,
} from "../types/search.js";
import type { Company, Person } from "../types/shared.js";

const PEOPLE = "/v2/search/people";
const COMPANIES = "/v2/search/companies";
const EMPLOYEE_FINDER = "/v2/search/employee-finder";
const WATERFALL = "/v2/search/waterfall-icp-keyword";

export class SearchResource {
  constructor(private readonly client: BlitzAPI) {}

  /**
   * Search people across many companies, combining company and persona filters.
   * Cursor-paginated — `for await (const person of …)` to stream all results, or
   * `await` for the first page (`.data`, `.response`, `.has_next_page()`).
   */
  people(
    { max_items, ...params }: PeopleSearchParams = {},
    options?: RequestOptions,
  ): PagePromise<Person, PeopleSearchResponse> {
    return make_cursor_page_promise<Person, PeopleSearchResponse>(
      params.cursor,
      max_items,
      (cursor) =>
        this.client.request("POST", PEOPLE, { ...params, cursor }, PeopleSearchResponse, options),
      (r) => r.results,
      (r) => r.cursor,
    );
  }

  /**
   * Find companies matching ICP filters (industry, size, HQ, revenue, ...).
   * Cursor-paginated (see {@link SearchResource.people}).
   */
  companies(
    { max_items, ...params }: CompanySearchParams = {},
    options?: RequestOptions,
  ): PagePromise<Company, CompanySearchResponse> {
    return make_cursor_page_promise<Company, CompanySearchResponse>(
      params.cursor,
      max_items,
      (cursor) =>
        this.client.request(
          "POST",
          COMPANIES,
          { ...params, cursor },
          CompanySearchResponse,
          options,
        ),
      (r) => r.results,
      (r) => r.cursor,
    );
  }

  /**
   * Search employees at a single company. Page-paginated (1-based) — increments
   * `page` until it exceeds `total_pages`.
   */
  employee_finder(
    { max_items, ...params }: EmployeeFinderParams,
    options?: RequestOptions,
  ): PagePromise<Person, EmployeeFinderResponse> {
    return make_offset_page_promise<Person, EmployeeFinderResponse>(
      params.page ?? 1,
      max_items,
      (page) =>
        this.client.request(
          "POST",
          EMPLOYEE_FINDER,
          { ...params, page },
          EmployeeFinderResponse,
          options,
        ),
      (r) => r.results,
      (r) => r.total_pages,
    );
  }

  /**
   * Find the best decision-maker at a company via a prioritized cascade.
   * Not paginated — returns a single ranked result set.
   */
  waterfall_icp(
    params: WaterfallIcpParams,
    options?: RequestOptions,
  ): Promise<WaterfallIcpResponse> {
    return this.client.request("POST", WATERFALL, params, WaterfallIcpResponse, options);
  }
}
