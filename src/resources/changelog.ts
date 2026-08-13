/** The Changelog resource: `client.changelog`. */

import type { BlitzAPI } from "../client.js";
import { ChangelogResponse } from "../types/changelog.js";
import type { ChangelogParams, RequestOptions } from "../types/filters.js";

// Public endpoint: no `/v2` prefix, and the trailing slash is load-bearing.
const CHANGELOG = "/changelog/";

export class ChangelogResource {
  constructor(private readonly client: BlitzAPI) {}

  /**
   * List the public Blitz API changelog, newest-first. Each entry carries a
   * `date`, a `type` (`breaking` | `feature` | `improvement` | `fix` |
   * `deprecation` | `announcement`), a `title`, and optional `body`,
   * `affected_endpoints`, and `links`.
   *
   * This endpoint is **public** — it costs no credits and works regardless of
   * API-key validity (the SDK still sends the key header, which the endpoint
   * ignores). It is **not paginated**: it returns a plain array filtered by
   * `days` / `limit`.
   */
  list(params: ChangelogParams = {}, options?: RequestOptions): Promise<ChangelogResponse> {
    return this.client.request("GET", CHANGELOG, undefined, ChangelogResponse, options, {
      days: params.days,
      limit: params.limit,
    });
  }
}
