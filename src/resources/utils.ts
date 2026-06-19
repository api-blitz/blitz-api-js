/** The Utilities resource: `client.utils`. */

import type { BlitzAPI } from "../client.js";
import type { CurrentDateParams, RequestOptions } from "../types/filters.js";
import { CurrentDateResponse } from "../types/utils.js";

const CURRENT_DATE = "/v2/utils/current-date";

export class UtilsResource {
  constructor(private readonly client: BlitzAPI) {}

  /** Get the current server date/time for an IANA timezone (e.g. `America/New_York`). */
  current_date(params: CurrentDateParams, options?: RequestOptions): Promise<CurrentDateResponse> {
    return this.client.request("POST", CURRENT_DATE, params, CurrentDateResponse, options);
  }
}
