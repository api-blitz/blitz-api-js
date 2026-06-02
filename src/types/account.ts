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

/** The result of `client.account.key_info()` — key health and limits. */
export const KeyInfo = blitzObject({
  valid: z.boolean().nullish(),
  id: z.string().nullish(),
  remaining_credits: z.number().nullish(),
  next_reset_at: z.string().nullish(),
  max_requests_per_seconds: z.number().nullish(),
  allowed_apis: blitzList(z.string()),
  active_plans: blitzList(ActivePlan),
});
export type KeyInfo = z.infer<typeof KeyInfo>;
