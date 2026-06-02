/** The Utilities resource: `client.utils`. */

import type { BlitzAPI } from "../client.js";
import type {
  CompanyLinkedinUrlParams,
  CurrentDateParams,
  RequestOptions,
} from "../types/filters.js";
import { CompanyEmploymentDistributionResponse, CurrentDateResponse } from "../types/utils.js";

const CURRENT_DATE = "/v2/utils/current-date";
const EMPLOYMENT_DISTRIBUTION = "/v2/utils/company-employment-distribution";

export class UtilsResource {
  constructor(private readonly client: BlitzAPI) {}

  /** Get the current server date/time for an IANA timezone (e.g. `America/New_York`). */
  current_date(params: CurrentDateParams, options?: RequestOptions): Promise<CurrentDateResponse> {
    return this.client.request("POST", CURRENT_DATE, params, CurrentDateResponse, options);
  }

  /** Get a company's employee count broken down by country. */
  company_employment_distribution(
    params: CompanyLinkedinUrlParams,
    options?: RequestOptions,
  ): Promise<CompanyEmploymentDistributionResponse> {
    return this.client.request(
      "POST",
      EMPLOYMENT_DISTRIBUTION,
      params,
      CompanyEmploymentDistributionResponse,
      options,
    );
  }
}
