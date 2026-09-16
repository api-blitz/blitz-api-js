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
  allowed_apis: blitzList(z.string()),
  active_plans: blitzList(ActivePlan),
  // NB: the inherited `fair_usage` carries no `rate_limit` block on this endpoint —
  // key-info is the one endpoint that is not rate limited.
});
export type KeyInfo = z.infer<typeof KeyInfo>;
