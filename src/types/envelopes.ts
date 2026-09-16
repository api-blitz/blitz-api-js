/**
 * Internal factories for the response envelopes every `/v2` endpoint shares.
 *
 * Deliberately **not** re-exported from `types/index.ts` — like `models.ts`,
 * these are construction helpers, not part of the public surface. Callers see
 * only the concrete schemas the group modules build with them.
 */

import * as z from "zod";
import { blitzList, blitzObject } from "./models.js";
import { FairUsage } from "./shared.js";

/**
 * Build a `/v2` response schema, appending the {@link FairUsage} block the API
 * attaches to every one of them.
 *
 * Declaring `fair_usage` by hand on each model made it a convention that had to
 * be remembered, policed by a hand-maintained list in the tests. Building every
 * envelope through here makes it structural instead: a `/v2` response cannot be
 * defined without it. The public `/changelog/` — a top-level array, and the one
 * endpoint with no `fair_usage` — is the sole exception and uses `blitzList`
 * directly.
 */
export const v2_response = <T extends z.ZodRawShape>(shape: T) =>
  blitzObject({
    ...shape,
    /** Record usage, rate limit, and tracing data for this request. */
    fair_usage: FairUsage.nullish(),
  });

/**
 * The paging scalars every cursor endpoint returns alongside its `results`.
 * Spread rather than `.extend()`ed so each envelope keeps the API's own field
 * order.
 */
const cursor_fields = <T extends z.ZodType>(item: T) => ({
  results: blitzList(item),
  results_length: z.number().nullish(),
  max_results: z.number().nullish(),
  /** `null` once the walk is complete; pass it back to fetch the next page. */
  cursor: z.string().nullish(),
});

/**
 * Build a cursor-paginated `/v2` response schema around its item type.
 *
 * The resulting shape is what `make_cursor_page_promise` constrains its response
 * to, which is why those call sites need no accessor callbacks. Used bare by the
 * `company.tam_by_*` pair, whose responses omit `total_results`.
 */
export const cursor_envelope = <T extends z.ZodType>(item: T) => v2_response(cursor_fields(item));

/**
 * Build a cursor-paginated `/v2` response schema that also reports
 * `total_results` — the four list endpoints that count their full result set
 * (`search.people`, `search.companies`, `jobs.search`, `jobs.company`).
 */
export const search_envelope = <T extends z.ZodType>(item: T) =>
  v2_response({
    /** Total matches for the query across all pages, not just this one. */
    total_results: z.number().nullish(),
    ...cursor_fields(item),
  });
