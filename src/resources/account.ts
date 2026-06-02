/** The Account resource: `client.account`. */

import type { BlitzAPI } from "../client.js";
import { KeyInfo } from "../types/account.js";

const KEY_INFO = "/v2/account/key-info";

export class AccountResource {
  constructor(private readonly client: BlitzAPI) {}

  /**
   * Check the API key's validity, credit balance, and rate limit.
   * A cheap health check to run before a batch job.
   */
  key_info(): Promise<KeyInfo> {
    return this.client.request("GET", KEY_INFO, undefined, KeyInfo);
  }
}
