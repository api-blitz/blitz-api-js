# blitz-api-js — Project Context

> Source-of-truth reference for maintaining and extending this repo. Read this
> before making changes so you don't re-derive decisions already made.
> Companion docs: [`README.md`](../README.md) (users),
> [`CONTRIBUTING.md`](../CONTRIBUTING.md) (dev workflow + release setup),
> [`CLAUDE.md`](../CLAUDE.md) (agent quick rules).

---

## 1. What this repo is

The official **typed TypeScript SDK for the Blitz API** (https://blitz-api.ai), a
B2B data / GTM REST API (people & company search, contact enrichment, utilities).
It is an **idiomatic, async-only port of the Python SDK `blitz-api-py`** and
behaves the same way over the same 14 endpoints.

Two design mandates:

1. **As strongly typed as possible** — static TypeScript types *and* runtime
   validation (Zod), with editor autocomplete.
2. **Automated releases on `main`** — merging publishes to npm with no manual
   token handling.

Distribution name: **`blitz-api-js`** (npm, unscoped, public).

---

## 2. The Blitz API (what we wrap)

- **Base URL**: `https://api.blitz-api.ai`
- **Auth**: `x-api-key` HTTP header (NOT `Authorization`).
- **Rate limit**: 5 req/s on all plans; per-key value in
  `key_info.max_requests_per_seconds`.
- **OpenAPI**: 3.1.0, version `2.0.0`. All endpoints are `/v2/...`.
- **Status conventions**: 401 invalid/missing key · 402 insufficient credits ·
  404 not found · 429 rate limited (wait 60s then retry) · 5xx server error.

### Endpoint → method → response model (all 14)

| HTTP | Path | SDK method | Response model |
| --- | --- | --- | --- |
| GET | `/v2/account/key-info` | `account.key_info()` | `KeyInfo` |
| POST | `/v2/search/waterfall-icp-keyword` | `search.waterfall_icp()` | `WaterfallIcpResponse` |
| POST | `/v2/search/employee-finder` | `search.employee_finder()` | `EmployeeFinderResponse` |
| POST | `/v2/search/people` | `search.people()` | `PeopleSearchResponse` |
| POST | `/v2/search/companies` | `search.companies()` | `CompanySearchResponse` |
| POST | `/v2/enrichment/email` | `enrichment.email()` | `EmailEnrichmentResponse` |
| POST | `/v2/enrichment/phone` | `enrichment.phone()` | `PhoneEnrichmentResponse` |
| POST | `/v2/enrichment/email-to-person` | `enrichment.email_to_person()` | `EmailToPersonResponse` |
| POST | `/v2/enrichment/phone-to-person` | `enrichment.phone_to_person()` | `PhoneToPersonResponse` |
| POST | `/v2/enrichment/company` | `enrichment.company()` | `CompanyEnrichmentResponse` |
| POST | `/v2/enrichment/domain-to-linkedin` | `enrichment.domain_to_linkedin()` | `DomainToLinkedinResponse` |
| POST | `/v2/enrichment/linkedin-to-domain` | `enrichment.linkedin_to_domain()` | `LinkedinToDomainResponse` |
| POST | `/v2/utils/current-date` | `utils.current_date()` | `CurrentDateResponse` |
| POST | `/v2/utils/company-employment-distribution` | `utils.company_employment_distribution()` | `CompanyEmploymentDistributionResponse` |

### Re-deriving the API surface

The full spec/docs come from the **Blitz docs MCP** (`mcp__claude_ai_Blitz__*`).
The OpenAPI spec lives at `/openapi/api-reference/v2.openapi.json`; use `jq`
against it for request schemas and response `example` blocks. The `.md` mirror of
any docs page is at `https://docs.blitz-api.ai/<path>.md`.

---

## 3. THE crux: why response models are hand-written

The spec's **request** bodies are richly typed (nested objects, enums) — modeled
precisely as TypeScript interfaces + generated enums. The spec's **response**
bodies are example-only (`{"type":"object","example":{…}}`, no `properties`), so a
generator would emit `unknown` for every response. Therefore **response models are
hand-derived** from the example JSON (re-verified against the live docs via the
MCP) as Zod schemas. `z.looseObject` keeps unknown fields so additions don't break
deserialization between SDK releases.

---

## 4. Divergences from the Python SDK (intentional)

- **Async-only**: one `BlitzAPI` class; every method returns a `Promise`. No sync
  twin, no context manager (`fetch` has no pool to close). The Python sync/async
  split collapses to one client.
- **snake_case everywhere**: method names, parameter-object keys, constructor
  options, and response keys are all snake_case — maximal 1:1 parity with the API
  docs and the Python SDK. Consequence: **no case conversion** — the request body
  builder (`to_jsonable`) only drops `null`/`undefined` and recurses.
- **Zod, not Pydantic**: `blitzObject` = `z.looseObject` (≈ `extra="allow"`);
  inferred types via `z.infer`. Validation throws on bad shape (Zod error).
- **Enums** are a `const` value array + a string-literal union + a `z.enum`, not
  classes. Filter fields accept `Enum | (string & {})` (autocomplete, never blocks
  raw strings). The string value is what goes on the wire.
- **`fetch` + `AbortSignal.timeout()`** instead of httpx; `fetch`/`sleep`/`now` are
  injectable for tests.
- **Completeness fix caught by the MCP cross-check**: the live `waterfall-icp`
  response includes top-level `company_linkedin_url`, `max_results`, and
  `results_length` (its old spec example was `null`, so the Python model omits
  them). The TS `WaterfallIcpResponse` includes them.
- **Pagination** (no Python analog): `search.people`/`companies` (cursor) and
  `search.employee_finder` (page) return a `PagePromise` (`src/pagination.ts`),
  Stainless/OpenAI-style but snake_case. `await` it for the first `Page` (`.data`
  items + `.response` raw 1:1 body + `has_next_page()`/`get_next_page()`/`iter_pages()`),
  or `for await` it to stream every item across pages (each page fetched on demand,
  through the rate limiter). This changed those three methods' return type from
  `Promise<Response>` to `PagePromise`. Cursor endpoints stop on `cursor === null`
  and **throw** on a non-advancing cursor (the API returning the same cursor it was
  given) so a stuck stream aborts instead of looping forever; offset stops at
  `page >= total_pages`. `waterfall_icp` is not paginated. The cursor/offset wiring
  lives in two factories (`make_cursor_page_promise`/`make_offset_page_promise`) so
  `people`/`companies` share one path and the guard lives in one place.
  - **`max_results` is page size, not a total** (the API bills 1 credit per result
    returned), so `for await` streams every match up to the server limit. The three
    paginated methods therefore accept a client-side **`max_items`** total cap that
    bounds `for await`/`collect()` and stops fetching once reached. `max_items` is
    destructured off in the resource method and **never sent on the wire** (it's not
    an API field). It caps the `PagePromise` streaming entry point only — `await` +
    manual `get_next_page()` stay uncapped. `PagePromise.collect()` drains the
    (capped) stream into an array via a small `take(source, n)` generator.

---

## 5. Architecture map

```
src/
  index.ts        Public surface: BlitzAPI, error classes, VERSION, all types/enums/filters.
  version.ts      Single source of version. `// x-release-please-version` marker.
  constants.ts    Base URL, env var, header, timeout, retries, rps(5), 429 wait(60s), UA.
  errors.ts       Exception hierarchy (see §6).
  rate-limit.ts   RateLimiter: token bucket; injectable now()/sleep().
  base-client.ts  IO-free: to_jsonable, build_url/headers, should_retry, backoff_seconds,
                  retry_delay, make_status_error, parse_json_body, parse_model.
                  STATUS_ERRORS maps code->class.
  client.ts       BlitzAPI: the fetch retry loop, options ctor, lazy memoized resource getters.
  pagination.ts   Page/CursorPage/OffsetPage/PagePromise: auto-pagination for the search.* lists.
  resources/      One module per OpenAPI tag group (account/search/enrichment/utils).
  types/
    models.ts     blitzObject = (shape) => z.looseObject(shape);
                  blitzList(item) = null/undefined-tolerant array field (coerces both to []).
    shared.ts     Location, Experience, Education, Certification, Person, HQ, Company.
    enums.ts      GENERATED. Industry(534) + CompanyType/EmployeeRange/Continent/
                  SalesRegion/JobFunction/JobLevel. Never hand-edit (see §7).
    filters.ts    Request filter interfaces + *Value aliases + per-method *Params interfaces.
    account/search/enrichment/utils.ts  Response schemas + inferred types per group.
    index.ts      Re-exports the public type surface.
scripts/gen-enums.ts        Regenerates types/enums.ts from openapi/enum-source.json.
openapi/enum-source.json    Vendored enum value lists (copied byte-for-byte from blitz-api-py).
test/                       Vitest + MSW (resources/models) and a fake clock/fetch (retry/etc).
.github/workflows/          ci.yml, release.yml, pr-title.yml.
```

### Request flow

`resource.method(params)` → `client.request(method, path, params, schema)` →
`to_jsonable(params)` (drop null/undefined, recurse) → `rateLimiter.acquire()` →
`fetch(url, { …, signal: AbortSignal.timeout })` → on `res.ok`,
`schema.parse(await res.json())`; on non-2xx, map to an error; on 429/5xx/network,
retry per policy.

---

## 6. Exception hierarchy (`src/errors.ts`)

```
BlitzError
├── APIConnectionError -> APITimeoutError      # request never completed
└── APIStatusError                             # non-2xx; .status_code, .body, .message, .request_id
    ├── AuthenticationError       # 401
    ├── InsufficientCreditsError  # 402
    ├── NotFoundError             # 404
    ├── RateLimitError            # 429 (only after retries exhausted)
    └── ServerError               # 5xx (only after retries exhausted)
```

Unmapped non-2xx → generic `APIStatusError` (or `ServerError` for any 5xx).
`error.name` is set per class via `new.target.name`.

---

## 7. Data-model specifics & quirks

- **`Industry` has 534 values** including upstream oddities: near-duplicates
  (`"Airlines and Aviation"` vs `"Airlines/Aviation"`) and one double-escaped value,
  `"Women\\'s Handbag Manufacturing"` (two literal backslashes + apostrophe). Kept
  byte-for-byte. The generator emits each value via `JSON.stringify` so escaping
  round-trips exactly.
- **`Company.linkedin_id` is a number**; `Person`/`Experience` linkedin ids are strings.
- **`Location`** is reused for `Person.location` and `Experience.job_location`.
- **`HQ.postcode`/`street`** are only returned by company enrichment; **`Experience.company_name`**
  only by people search. All optional on one superset model.
- **List fields use `blitzList(item)`** (`src/types/models.ts`), which coerces a
  missing **or `null`** value to `[]`. Plain `z.array(x).default([])` only fills the
  default for `undefined`, so an explicit `null` would throw a `ZodError` and break
  deserialization — `blitzList` keeps a `null`-for-empty-list from doing so.
- **`specialties`** is the one list kept `.nullish()` (nullable, surfaces `null`
  rather than `[]`) because the API documents it as genuinely nullable.

---

## 8. Release automation

`release-please` (`release-type: node`) maintains a Release PR from Conventional
Commits. Merging it bumps `package.json` + `src/version.ts`, updates
`CHANGELOG.md`, tags, and the `publish` job runs `npm publish` via **npm Trusted
Publishing (OIDC)** — no stored token, automatic provenance. One-time human setup
(npm trusted publisher, GitHub `npm` environment, branch protection, first-release
bootstrap) is documented in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## 9. Known limitations / future work

- Pagination offers `collect()` (array) and a `max_items` total cap; `waterfall_icp`
  is not paginated. The cursor guard catches an immediate non-advancing cursor but not
  a multi-step cycle (A→B→A) — the API's stable cursors + 1k-page limit + `max_items`
  make this a non-issue in practice.
- No streaming, no per-call timeout override, no response caching.
- Rate limiter does not auto-detect the per-key limit from `key_info` (uses 5 rps).
- Response models are validated against the spec's *examples*, not a formal response
  schema (the API doesn't publish one); `z.looseObject` is the safety net.

---

## 10. Decision log

- **2026-06-01** — Hardened list-field parsing: introduced `blitzList(item)` and
  replaced every response `z.array(...).default([])` with it. `.default([])` only
  fills `undefined`, so an explicit `null` from the API threw a `ZodError` (escaping
  the `BlitzError` hierarchy and breaking the forward-compat guarantee). `blitzList`
  coerces `null` and `undefined` to `[]`; `Company.specialties` stays `.nullish()` by
  design. Added a regression parse test for `null` lists (top-level + nested).
- **2026-06-01** — Initial TS SDK, ported from `blitz-api-py`. Zod v4 (responses) +
  TS interfaces (requests); async-only; snake_case everywhere (user decision, for
  1:1 docs/Python parity); release-please + npm OIDC; hand-written response models;
  vendored `enum-source.json`. Added the missing `waterfall-icp` envelope fields
  caught by cross-checking the live OpenAPI examples.
- **2026-06-01** — Added auto-pagination (`PagePromise`/`Page`, cursor + offset),
  Stainless/OpenAI-style adapted to snake_case. Changed the return type of
  `search.people`/`companies`/`employee_finder` to `PagePromise` (acceptable pre-1.0).
- **2026-06-01** — Eng-review hardening of pagination: extracted the duplicated
  `people`/`companies` cursor wiring into `make_cursor_page_promise` (offset kept on its
  own `make_offset_page_promise`), and added a non-advancing-cursor guard to `CursorPage`
  that throws `BlitzError` when the API returns the cursor it was just given (prevents an
  infinite `for await` loop). Expanded `test/pagination.test.ts` to cover the guard,
  `companies` streaming, early `break`, error propagation through `PagePromise`,
  single-page cursor, explicit start cursor/page, and offset `iter_pages`.
- **2026-06-01** — Second eng review (cost-safety): `max_results` is page size and the
  API bills per result, so an unbounded `for await` can silently pull/charge for tens of
  thousands of records. Added a client-side `max_items` total cap (threaded through both
  factories → `PagePromise`, capped via a `take` generator, stripped from the wire) plus
  `PagePromise.collect()`. Expanded tests with the full `max_items` suite, mid-stream
  page-fetch failures (500/429/network on page 2, cursor + offset), empty-page
  continuation, and absent/zero pagination metadata.
