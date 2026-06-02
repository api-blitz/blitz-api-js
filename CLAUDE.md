# CLAUDE.md — agent quick rules for blitz-api-js

Typed TypeScript SDK for the Blitz API. Read `docs/CONTEXT.md` before non-trivial
changes — it records the design decisions so you don't re-derive them.

## Golden rules

- **snake_case everywhere** on the public surface — method names, parameter-object
  keys, constructor options, and response keys — to match the API and the Python
  SDK 1:1. Do not "camelCase-ify". Biome's `useNamingConvention` is intentionally off.
- **Responses are hand-written Zod schemas**, never generated. The spec's responses
  are example-only. Build schemas with `blitzObject` (= `z.looseObject`) so unknown
  fields are preserved (forward-compat). Verify shapes against the docs examples via
  the Blitz MCP (`mcp__claude_ai_Blitz__*`, OpenAPI at
  `/openapi/api-reference/v2.openapi.json`).
- **Async-only.** One `BlitzAPI` class; methods return a `Promise` (or a `PagePromise`
  for the paginated lists). Uses the global `fetch` (overridable via the `fetch` option).
- **Pagination** (`src/pagination.ts`): `search.people`/`companies` (cursor) and
  `search.employee_finder` (page) return a `PagePromise` — `await` for the first `Page`
  (`.data` items, `.response` raw 1:1 body, `has_next_page()`/`get_next_page()`/`iter_pages()`),
  or `for await` to stream all items. Cursor stops on `cursor === null` (and throws on a
  non-advancing cursor to avoid an infinite loop); offset at `page >= total_pages`.
  Cursor/offset wiring is shared via `make_cursor_page_promise`/`make_offset_page_promise`.
  `waterfall_icp` is not paginated. Keep helper names snake_case.
- **`enums.ts` is generated** — never hand-edit. Edit `openapi/enum-source.json`
  then `pnpm gen:enums`. CI drift guard: `pnpm gen:enums:check`.
- Superset models with optional fields (`.nullish()` scalars, `blitzList(...)` for
  lists — coerces a missing **or `null`** value to `[]`), not per-endpoint duplicates.
  Numeric fields use `z.number().nullish()`. Use plain `.nullish()` only for a list the
  API documents as genuinely nullable (e.g. `Company.specialties`).

## Commands

```bash
pnpm lint && pnpm typecheck && pnpm gen:enums:check && pnpm test && pnpm build
```

## Adding / changing an endpoint

1. Get the request schema + a response example from the Blitz MCP.
2. Request types → add/extend an interface in `src/types/filters.ts` (snake_case).
3. Response model → add a `blitzObject` schema in the right `src/types/<group>.ts`,
   reusing `shared.ts` models; export it from `src/types/index.ts`.
4. Resource method → add it to the class in `src/resources/<group>.ts`, calling
   `this.client.request("POST", path, params, ResponseSchema)` with a path constant.
5. Tests → a parse test in `test/models.test.ts` (+ payload in `test/data.ts`) and a
   request/response test in `test/resources.test.ts`.
6. Run all checks. Use a `feat:` commit.

## Retry / errors / rate limit (mirror, do not drift)

- Retry only `429` and `>= 500` (and network/timeout); `401/402/404` throw immediately.
- 429 waits `Retry-After` or 60s; else exponential backoff `min(8, 0.5*2^(n-1)) + jitter`.
- Error hierarchy in `src/errors.ts`; status map `{401,402,404,429}` else
  `ServerError` (5xx) / `APIStatusError`.
- Rate limiter is a token bucket (`src/rate-limit.ts`); `now`/`sleep` are injectable
  for tests. Client `fetch`/`sleep` are injectable too.
