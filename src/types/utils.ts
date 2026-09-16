/** Response models for the Utilities resource. */

import * as z from "zod";
import { v2_response } from "./envelopes.js";

/** Result of `utils.current_date`. */
export const CurrentDateResponse = v2_response({
  datetime: z.string().nullish(),
  timestamp: z.number().nullish(),
  timezone: z.string().nullish(),
  timezone_name: z.string().nullish(),
});
export type CurrentDateResponse = z.infer<typeof CurrentDateResponse>;
