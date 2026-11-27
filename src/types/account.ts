/** Response models for the Account resource. */

import * as z from "zod";
import { v2_response } from "./envelopes.js";
import { blitzList, blitzObject } from "./models.js";
import { MeteredValue } from "./shared.js";

/** A subscription plan attached to the API key. */
export const ActivePlan = blitzObject({
  name: z.string().nullish(),
  status: z.string().nullish(),
  started_at: z.string().nullish(),
});
export type ActivePlan = z.infer<typeof ActivePlan>;

/** The result limits of one search endpoint, an entry of `KeyInfo.limits`. */
export const SearchLimit = blitzObject({
  /** The endpoint this limit applies to, in the format of `allowed_apis` (no `/v2` prefix). */
  path: z.string().nullish(),
  /** The largest `max_results` one call to this endpoint accepts; a larger value returns `422`. */
  max_results_per_page: z.number().nullish(),
  /**
   * The most results one search returns across all its pages. A search that gets to this
   * number ends with a `null` cursor (or its last `page`). A number, or `"unlimited"`.
   */
  max_results_total: MeteredValue,
});
export type SearchLimit = z.infer<typeof SearchLimit>;

/** The result of `client.account.key_info()` — key health and limits. */
export const KeyInfo = v2_response({
  valid: z.boolean().nullish(),
  id: z.string().nullish(),
  /**
   * Records left on the plan. Renamed by the API from `remaining_credits` on
   * 2026-09-01 to match `fair_usage.records_remaining` and the
   * `x-records-remaining` response header.
   */
  records_remaining: MeteredValue,
  next_reset_at: z.string().nullish(),
  max_requests_per_seconds: MeteredValue,
  /** The result limits of each search endpoint (added by the API on 2026-11-27). */
  limits: blitzList(SearchLimit),
  allowed_apis: blitzList(z.string()),
  active_plans: blitzList(ActivePlan),
  // NB: the inherited `fair_usage` carries no `rate_limit` block on this endpoint —
  // key-info is the one endpoint that is not rate limited.
});
export type KeyInfo = z.infer<typeof KeyInfo>;
