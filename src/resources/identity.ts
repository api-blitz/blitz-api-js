/** The Identity resource: `client.identity`. */

import type { BlitzAPI } from "../client.js";
import type { CompanyMatchParams, PersonMatchParams, RequestOptions } from "../types/filters.js";
import { CompanyMatchResponse, PersonMatchResponse } from "../types/identity.js";

const PERSON_MATCH = "/v2/identity/person-match";
const COMPANY_MATCH = "/v2/identity/company-match";

export class IdentityResource {
  constructor(private readonly client: BlitzAPI) {}

  /**
   * Find the person behind a name. Each field you add makes the answer more exact; the
   * company fields help the most, and past jobs are always searched. Returns `matched`
   * with the person in `match`, `ambiguous` with up to 10 `candidates`, or `not_found`.
   * Costs 1 record for `matched` or `ambiguous`, 0 records for `not_found`.
   */
  person_match(params: PersonMatchParams, options?: RequestOptions): Promise<PersonMatchResponse> {
    return this.client.request("POST", PERSON_MATCH, params, PersonMatchResponse, options);
  }

  /**
   * Find a company from its name, domain or LinkedIn page URL (give at least one). The
   * domain is the most reliable field. Returns `matched` with the company in `match`,
   * `ambiguous` with up to 10 `candidates`, or `not_found`. Costs 1 record for `matched`
   * or `ambiguous`, 0 records for `not_found`.
   */
  company_match(
    params: CompanyMatchParams,
    options?: RequestOptions,
  ): Promise<CompanyMatchResponse> {
    return this.client.request("POST", COMPANY_MATCH, params, CompanyMatchResponse, options);
  }
}
