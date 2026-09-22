/** The Search resource: `client.search`. */

import type { BlitzAPI } from "../client.js";
import type { PagePromise } from "../pagination.js";
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
import { cursor_page, offset_page } from "./paginate.js";

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
    params: PeopleSearchParams = {},
    options?: RequestOptions,
  ): PagePromise<Person, PeopleSearchResponse> {
    return cursor_page(this.client, PEOPLE, params, PeopleSearchResponse, options);
  }

  /**
   * Find companies matching ICP filters (industry, size, HQ, revenue, ...).
   * Cursor-paginated (see {@link SearchResource.people}).
   */
  companies(
    params: CompanySearchParams = {},
    options?: RequestOptions,
  ): PagePromise<Company, CompanySearchResponse> {
    return cursor_page(this.client, COMPANIES, params, CompanySearchResponse, options);
  }

  /**
   * Search employees at a single company. Page-paginated (1-based) — increments
   * `page` until it exceeds `total_pages`.
   */
  employee_finder(
    params: EmployeeFinderParams,
    options?: RequestOptions,
  ): PagePromise<Person, EmployeeFinderResponse> {
    return offset_page(this.client, EMPLOYEE_FINDER, params, EmployeeFinderResponse, options);
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
