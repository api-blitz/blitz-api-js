/** Response models for the Utilities resource. */

import * as z from "zod";
import { blitzObject } from "./models.js";
import { FairUsage } from "./shared.js";

/** Result of `utils.current_date`. */
export const CurrentDateResponse = blitzObject({
  datetime: z.string().nullish(),
  timestamp: z.number().nullish(),
  timezone: z.string().nullish(),
  timezone_name: z.string().nullish(),
  /** Record usage, rate limit, and tracing data for this request. */
  fair_usage: FairUsage.nullish(),
});
export type CurrentDateResponse = z.infer<typeof CurrentDateResponse>;
