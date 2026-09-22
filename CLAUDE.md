# CLAUDE.md — agent quick rules for blitz-api-js

Typed TypeScript SDK for the Blitz API. Read `docs/CONTEXT.md` before non-trivial
changes — it records the design decisions so you don't re-derive them.

## Golden rules

- **snake_case everywhere** on the public surface — method names, parameter-object
  keys, constructor options, and response keys — to match the API and the Python
  SDK 1:1. Do not "camelCase-ify". Biome's `useNamingConvention` is intentionally off.
- **Responses are hand-written Zod schemas**, never generated — even though the
  runtime spec now publishes real response `properties` (since 2026-09-15; see
  `docs/CONTEXT.md` §3 for why the decision stands). Build schemas with `blitzObject`
  (= `z.looseObject`) so unknown fields are preserved (forward-compat). Verify shapes
  against the runtime spec `https://api.blitz-api.ai/openapi` (typed responses) and
  the docs mirror `https://docs.blitz-api.ai/api-reference/v2.openapi.json` (example
  payloads). Start any sync at `GET https://api.blitz-api.ai/changelog/` — and re-read it
  right before merging, since upstream keeps moving while a sync branch is open. A response
  field earns a place on a model only if the runtime spec's response `properties` or a
  docs-mirror example shows it; a fixture you wrote yourself is not evidence.
- **Async-only.** One `BlitzAPI` class; methods return a `Promise` (or a `PagePromise`
  for the paginated lists). Uses the global `fetch` (overridable via the `fetch` option).
- **Pagination** (`src/pagination.ts`): `search.people`/`companies`,
  `jobs.search`/`company` and `company.tam_by_jobs`/`tam_by_people` (cursor) and
  `search.employee_finder` (page) return a `PagePromise` — `await` for the first `Page`
  (`.data` items, `.response` raw 1:1 body, `has_next_page()`/`get_next_page()`/`iter_pages()`),
  or `for await` to stream all items. Cursor stops on `cursor === null` (and throws on a
  non-advancing cursor to avoid an infinite loop); offset at `page >= total_pages`.
  Cursor/offset wiring is shared via `cursor_page`/`offset_page` in
  `src/resources/paginate.ts` (they strip `max_items`, rewrite the paging key, and thread
  `options` into every page fetch) over
  `make_cursor_page_promise`/`make_offset_page_promise`. `CursorPage`/`OffsetPage` read
  `results`/`cursor`/`total_pages` off the response through the
  `CursorEnvelope`/`OffsetEnvelope` constraints — never pass accessor callbacks.
  `waterfall_icp` is not paginated. Keep helper names snake_case.
- **`enums.ts` and `openapi/enum-source.json` are both generated** — never
  hand-edit. Run `pnpm gen:enums:fetch` to pull the live spec
  (`https://api.blitz-api.ai/openapi`), de-dup the inlined enums, and rewrite
  both files; commit both. CI drift guard `pnpm gen:enums:check` stays **offline**
  (renders from the committed cache — never fetches), so it never breaks on a
  network blip or an upstream change.
- **Build response envelopes with the factories in `src/types/envelopes.ts`**, never by
  hand: `v2_response(shape)` for any `/v2` response (it appends the shared `fair_usage`
  block, so it can't be forgotten), `cursor_envelope(item)` for a cursor-paginated one,
  `search_envelope(item)` when it also reports `total_results`, `offset_fields(item)`
  spread into the one offset-paginated response. `envelopes.ts` is
  internal — like `models.ts` it is deliberately not re-exported from `types/index.ts`.
  `test/models.test.ts` sweeps every exported object schema and fails unless each is
  either listed in its `SUB_MODELS` exemption set or declares `fair_usage` — so a new
  response model of *any* name gets checked. Add genuinely nested models to that set;
  never widen it to silence a real endpoint model. `MeteredValue` (`number | "unlimited"`) is the shared union for
  record/rate values.
- **A request field the API accepts and then ignores does not belong on that endpoint's
  params type.** Split it onto a narrower interface (`PeopleCompanyFilter extends
  CompanyFilter`, `TamPeopleFilter extends PeopleFilter`, `TamJobFilter extends
  JobFilter`) rather than widening the shared one — a silently-dropped filter is the worst
  failure mode, so make it a compile error.
- Superset models with optional fields (`.nullish()` scalars, `blitzList(...)` for
  lists — coerces a missing **or `null`** value to `[]`), not per-endpoint duplicates.
  Numeric fields use `z.number().nullish()`. Use plain `.nullish()` only for a list the
  API documents as genuinely nullable (e.g. `Company.specialties`).
- **Request-side list caps are documented, not enforced.** The API rejects a filter list
  over 50 entries (`cascade`: 10) with a `422`; say so in the interface doc comment and
  let the server enforce it.

## Commands

```bash
pnpm lint && pnpm typecheck && pnpm gen:enums:check && pnpm test && pnpm build
```

## Adding / changing an endpoint

1. Get the request + response schema from the runtime spec
   (`https://api.blitz-api.ai/openapi`) and an example payload from the docs mirror
   (`https://docs.blitz-api.ai/api-reference/v2.openapi.json`).
2. Request types → add/extend an interface in `src/types/filters.ts` (snake_case).
3. Response model → build it with a factory from `src/types/envelopes.ts` in the right
   `src/types/<group>.ts`, reusing `shared.ts` models; export it from
   `src/types/index.ts`. A paginated endpoint is usually one line:
   `export const XResponse = cursor_envelope(XMatch);`.
4. Resource method → add it to the class in `src/resources/<group>.ts`, calling
   `this.client.request("POST", path, params, ResponseSchema, options)` with a path
   constant; accept an optional `options?: RequestOptions` (per-call `timeout`) last
   arg and pass it through. A **paginated** method is one line —
   `return cursor_page(this.client, PATH, params, XResponse, options)` (or `offset_page`)
   — and takes `params` whole, *not* destructured: stripping `max_items` and rewriting
   the cursor/page key belong to the helper, not the call site. Params
   interfaces `extend CursorPaginatedParams` / `OffsetPaginatedParams` rather than
   re-declaring `max_results`/`cursor`/`max_items`.
5. Tests → a parse test in `test/models.test.ts` (+ payload in `test/data.ts`) and a
   request/response test in `test/resources.test.ts`.
6. Run all checks. Use a `feat:` commit.

## Retry / errors / rate limit (mirror, do not drift)

- Retry `429`, `>= 500` (incl. the `503` the search/jobs endpoints return on a partial
  failure — explicitly retriable), and **pre-response** network errors; **timeouts are
  terminal** (never retried — a timed-out, per-result-billed POST may already have run);
  `401/402/404/422` throw immediately.
- 429 waits `Retry-After` or 60s; else exponential backoff `min(8, 0.5*2^(n-1)) + jitter`.
- Error hierarchy in `src/errors.ts`; status map `{401,402,404,429}` else
  `ServerError` (5xx) / `APIStatusError`. A 2xx body that isn't JSON or fails Zod
  raises `APIResponseValidationError` (also a `BlitzError`), via `parse_success_body`.
- Rate limiter is a token bucket (`src/rate-limit.ts`); `now`/`sleep` are injectable
  for tests. Client `fetch`/`sleep` are injectable too.
