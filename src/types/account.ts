/** Response models for the Account resource. */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";

/** A subscription plan attached to the API key. */
export const ActivePlan = blitzObject({
  name: z.string().nullish(),
  status: z.string().nullish(),
  started_at: z.string().nullish(),
});
export type ActivePlan = z.infer<typeof ActivePlan>;

/**
 * A credit/rate value that is a number on metered plans and the literal
 * `"unlimited"` on unlimited plans. The API returns either, so both must parse.
 */
const CreditValue = z.union([z.number(), z.literal("unlimited")]).nullish();

/** The result of `client.account.key_info()` — key health and limits. */
export const KeyInfo = blitzObject({
  valid: z.boolean().nullish(),
  id: z.string().nullish(),
  remaining_credits: CreditValue,
  next_reset_at: z.string().nullish(),
  max_requests_per_seconds: CreditValue,
  allowed_apis: blitzList(z.string()),
  active_plans: blitzList(ActivePlan),
});
export type KeyInfo = z.infer<typeof KeyInfo>;
