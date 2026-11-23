/** The Feedback resource: `client.feedback`. */

import type { BlitzAPI } from "../client.js";
import { FeedbackResponse } from "../types/feedback.js";
import type { FeedbackParams, RequestOptions } from "../types/filters.js";

const FEEDBACK = "/v2/feedback";

export class FeedbackResource {
  constructor(private readonly client: BlitzAPI) {}

  /**
   * Send a bug report, a feature request, or any other feedback to the Blitz team, about
   * the API, data quality, the docs, or the MCP server. Costs 0 records, and every API key
   * can call it, whatever endpoints the key has access to. Returns a confirmation that the
   * feedback was recorded; there is no ticket id and no reply.
   */
  send(params: FeedbackParams, options?: RequestOptions): Promise<FeedbackResponse> {
    return this.client.request("POST", FEEDBACK, params, FeedbackResponse, options);
  }
}
