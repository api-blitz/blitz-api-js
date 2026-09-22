/**
 * The one place a paginated resource method turns its params into a request.
 *
 * Every paginated method has the same three obligations: strip `max_items` (a
 * client-side cap, never sent on the wire), send the page key the paginator asks
 * for rather than the one the caller passed, and forward `options` to *every*
 * page fetch, not just the first. Doing that here makes it structural instead of
 * a convention re-implemented — and re-tested — at each of the seven call sites,
 * the same move `v2_response` makes for the `fair_usage` block.
 *
 * Both helpers spread the caller's params onto the wire body, so endpoint-specific
 * fields (`company`, `people`, `job`, `company_linkedin_url`, ...) pass through
 * untouched; only the paging keys are rewritten.
 */

import type * as z from "zod";
import type { BlitzAPI } from "../client.js";
import {
  type CursorEnvelope,
  make_cursor_page_promise,
  make_offset_page_promise,
  type OffsetEnvelope,
  type PagePromise,
} from "../pagination.js";
import type {
  CursorPaginatedParams,
  OffsetPaginatedParams,
  RequestOptions,
} from "../types/filters.js";

/** POST `path` once per page, walking the response `cursor` until it is `null`. */
export function cursor_page<TItem, TResponse extends CursorEnvelope<TItem>>(
  client: BlitzAPI,
  path: string,
  { max_items, ...params }: CursorPaginatedParams,
  schema: z.ZodType<TResponse>,
  options?: RequestOptions,
): PagePromise<TItem, TResponse> {
  return make_cursor_page_promise<TItem, TResponse>(params.cursor, max_items, (cursor) =>
    client.request("POST", path, { ...params, cursor }, schema, options),
  );
}

/** POST `path` once per page, incrementing `page` until it exceeds `total_pages`. */
export function offset_page<TItem, TResponse extends OffsetEnvelope<TItem>>(
  client: BlitzAPI,
  path: string,
  { max_items, ...params }: OffsetPaginatedParams,
  schema: z.ZodType<TResponse>,
  options?: RequestOptions,
): PagePromise<TItem, TResponse> {
  return make_offset_page_promise<TItem, TResponse>(params.page ?? 1, max_items, (page) =>
    client.request("POST", path, { ...params, page }, schema, options),
  );
}
