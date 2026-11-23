/** Response models for the Feedback resource. */

import * as z from "zod";
import { blitzObject } from "./models.js";

/**
 * Result of `feedback.send`: a confirmation that the feedback was recorded, with no
 * ticket id and no reply. Not built with `v2_response`: the spec's `200` schema for
 * `/v2/feedback` lists only `success` and `message`, with no `fair_usage` block.
 */
export const FeedbackResponse = blitzObject({
  /** `true` when the feedback was recorded. */
  success: z.boolean().nullish(),
  /** Confirmation text, such as `"Thanks, your feedback has been sent to the Blitz team."` */
  message: z.string().nullish(),
});
export type FeedbackResponse = z.infer<typeof FeedbackResponse>;
