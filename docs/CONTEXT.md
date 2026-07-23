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
behaves the same way over all 17 endpoints. `blitz-api-py` covers the same
surface, jobs included — keep the two at parity, and cross-check the sibling SDK
when changing any endpoint.

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
- **Rate limit**: 5 req/s **per endpoint** on all plans; your per-endpoint value in
  `key_info.max_requests_per_seconds`.
- **OpenAPI**: 3.1.0, version `2.0.0`. All endpoints are `/v2/...`.
- **Status conventions**: 401 invalid/missing key · 402 insufficient credits ·
  404 not found · 429 rate limited (wait 60s then retry) · 5xx server error.

### Endpoint → method → response model (all 17)

| HTTP | Path | SDK method | Response model |
| --- | --- | --- | --- |
| GET | `/v2/account/key-info` | `account.key_info()` | `KeyInfo` |
| POST | `/v2/search/waterfall-icp-keyword` | `search.waterfall_icp()` | `WaterfallIcpResponse` |
| POST | `/v2/search/employee-finder` | `search.employee_finder()` | `EmployeeFinderResponse` |
| POST | `/v2/search/people` | `search.people()` | `PeopleSearchResponse` |
| POST | `/v2/search/companies` | `search.companies()` | `CompanySearchResponse` |
| POST | `/v2/jobs/search` | `jobs.search()` | `JobSearchResponse` |
| POST | `/v2/jobs/company` | `jobs.company()` | `CompanyJobsResponse` |
| POST | `/v2/enrichment/email` | `enrichment.email()` | `EmailEnrichmentResponse` |
| POST | `/v2/enrichment/phone` | `enrichment.phone()` | `PhoneEnrichmentResponse` |
| POST | `/v2/enrichment/email-to-person` | `enrichment.email_to_person()` | `EmailToPersonResponse` |
| POST | `/v2/enrichment/phone-to-person` | `enrichment.phone_to_person()` | `PhoneToPersonResponse` |
| POST | `/v2/enrichment/company` | `enrichment.company()` | `CompanyEnrichmentResponse` |
| POST | `/v2/enrichment/domain-to-linkedin` | `enrichment.domain_to_linkedin()` | `DomainToLinkedinResponse` |
| POST | `/v2/enrichment/linkedin-to-domain` | `enrichment.linkedin_to_domain()` | `LinkedinToDomainResponse` |
| POST | `/v2/enrichment/company-distribution-by-country` | `enrichment.company_distribution_by_country()` | `CompanyDistributionByCountryResponse` |
| POST | `/v2/enrichment/company-distribution-by-department` | `enrichment.company_distribution_by_department()` | `CompanyDistributionByDepartmentResponse` |
| POST | `/v2/utils/current-date` | `utils.current_date()` | `CurrentDateResponse` |

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
- **Pagination**: `search.people`/`companies` and `jobs.search`/`company` (cursor) and
  `search.employee_finder` (page) return a `PagePromise` (`src/pagination.ts`),
  Stainless/OpenAI-style but
  snake_case. NOTE (corrected 2026-06-02): the Python SDK *also* paginates the same
  cursor/page methods, jobs included
  (`AsyncCursorPage`/`AsyncPageNumberPage`, `auto_paging_iter`/`iter_pages`); the public
  surfaces intentionally diverge — TS uses `.data` + `for await` + `.collect()` and a
  non-advancing-cursor guard (which Python lacks), where Python uses `.results` +
  `auto_paging_iter()` and names the offset class `PageNumberPage` (TS: `OffsetPage`).
  `await` it for the first `Page` (`.data`
  items + `.response` raw 1:1 body + `has_next_page()`/`get_next_page()`/`iter_pages()`),
  or `for await` it to stream every item across pages (each page fetched on demand,
  through the rate limiter). This changed those three `search.*` methods' return type
  from `Promise<Response>` to `PagePromise`. Cursor endpoints stop on `cursor === null`
  and **throw** on a non-advancing cursor (the API returning the same cursor it was
  given) so a stuck stream aborts instead of looping forever; offset stops at
  `page >= total_pages`. `waterfall_icp` is not paginated. The cursor/offset wiring
  lives in two factories (`make_cursor_page_promise`/`make_offset_page_promise`) so
  all four cursor methods share one path and the guard lives in one place.
  - **`max_results` is page size, not a total** (the API bills 1 credit per result
    returned), so `for await` streams every match up to the server limit. The five
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
  rate-limit.ts   RateLimiter: a single token bucket; injectable now()/sleep().
                  The client holds one per endpoint path (Map), so each endpoint is
                  throttled independently.
  base-client.ts  IO-free: to_jsonable, build_url/headers, should_retry, backoff_seconds,
                  retry_delay, make_status_error, parse_json_body, parse_model.
                  STATUS_ERRORS maps code->class.
  client.ts       BlitzAPI: the fetch retry loop, options ctor, lazy memoized resource getters.
  pagination.ts   Page/CursorPage/OffsetPage/PagePromise: auto-pagination for the
                  search.* and jobs.* lists.
  resources/      One module per OpenAPI tag group (account/search/jobs/enrichment/utils).
  types/
    models.ts     blitzObject = (shape) => z.looseObject(shape);
                  blitzList(item) = null/undefined-tolerant array field (coerces both to []).
    shared.ts     Location, Experience, Education, Certification, Person, HQ, Company.
    enums.ts      GENERATED. Industry(534) + CompanyType/EmployeeRange/Continent/
                  SalesRegion/JobFunction/JobLevel/LastFundingType/Seniority/
                  EmploymentType/WorkArrangement. Never hand-edit (see §7).
    filters.ts    Request filter interfaces + *Value aliases + per-method *Params interfaces.
    account/search/jobs/enrichment/utils.ts  Response schemas + inferred types per group.
    index.ts      Re-exports the public type surface.
scripts/gen-enums.ts        --fetch pulls the live spec, de-dups, rewrites the cache + enums.ts;
                            default/--check render from the cache offline (CI drift guard).
openapi/enum-source.json    GENERATED cache: deduped enum lists pulled from the OpenAPI spec
                            (https://api.blitz-api.ai/openapi) by `pnpm gen:enums:fetch`.
test/                       Vitest + MSW (resources/models) and a fake clock/fetch (retry/etc).
.github/workflows/          ci.yml, release.yml, pr-title.yml.
```

### Request flow

`resource.method(params)` → `client.request(method, path, params, schema)` →
`to_jsonable(params)` (drop null/undefined, recurse) → `rateLimiterFor(path).acquire()`
(the per-endpoint bucket) →
`fetch(url, { …, signal: AbortSignal.timeout })` → on `res.ok`,
`schema.parse(await res.json())`; on non-2xx, map to an error; on 429/5xx/network,
retry per policy.

---

## 6. Exception hierarchy (`src/errors.ts`)

```
BlitzError
├── APIConnectionError -> APITimeoutError      # request never completed
├── APIResponseValidationError                 # 2xx body not JSON / wrong shape; .status_code, .request_id, .cause
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
- **`Location`** is reused for `Person.location`, `Experience.job_location`, and
  `Job.location`. The jobs payload populates only `city`/`country_code`; because every
  field is `.nullish()` on a `blitzObject`, the superset parses it unchanged rather than
  needing a narrower per-endpoint duplicate.
- **`Job.date_posted` stays a string.** The API emits a non-ISO-8601 timestamp
  (`"2026-07-08 23:00:07+02"` — space separator, offset, no `T`), so it is never
  coerced to a `Date`.
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
- No streaming, no response caching. A per-call `timeout` override exists (options-bag
  arg, see §10); timeouts are terminal (not retried).
- Rate limiting is **per endpoint**: the client holds one token bucket per endpoint path
  (lazy `Map` in `client.ts`), each sized at `rate_limit_rps` (5 by default), so a burst on
  one endpoint (e.g. `enrichment.email`) never throttles another (e.g. `enrichment.phone`).
  This mirrors the API, whose server-side limit is itself **per endpoint** (5 rps on each
  endpoint independently, per the docs), so a single client instance stays under the limit on
  every endpoint. The 429 retry path remains the backstop for bursts across processes (each
  process has its own buckets). `blitz-api-py` is also per endpoint (sliding window there vs.
  token bucket here), so the "mirror 1:1" parity holds.
- Rate limiter does not auto-detect your per-endpoint limit from `key_info` (uses 5 rps).
- Response models are validated against the spec's *examples*, not a formal response
  schema (the API doesn't publish one); `z.looseObject` is the safety net.

---

## 10. Decision log

- **2026-07-23** — Closed server-parity gaps found by auditing `blitz-api` (server = source of
  truth, cross-checked against the live spec) field-by-field. **(1)** `KeyInfo.remaining_credits`
  and `max_requests_per_seconds` widened to `number | "unlimited"` — the API returns the literal
  `"unlimited"` on unlimited plans, which a `number`-only schema **rejected** (`APIResponseValidationError`).
  **(2)** `Education.school` → **`school_name`** and added `field_of_study`: the server always emits
  `school_name`, so the old typed `school` field never populated (the real value survived only as an
  untyped passthrough key). Not a real break — the renamed field was always empty. Guarded by a
  schema-shape assertion since `blitzObject` would otherwise preserve the raw key. This is a shared
  `Location`/`Education`-style superset model, so every Person-returning endpoint benefits.
  **(3)** `DomainToLinkedinResponse` gained `company_name` + `other[]` (new `DomainToLinkedinMatch`).
  **(4)** Request-side additions: `PeopleFilter.linkedin_url` and `WaterfallIcpParams.profile_min_connections`
  (both in the spec, previously unexpressible via the typed surface). **(5)** `CascadeTier.location`
  and `include_headline_search` made optional (spec requires only `include_title`); `current_date`'s
  `region` made optional (spec has a default). All mirrored 1:1 in `blitz-api-py`. `CompanyFilter.linkedin_url`
  is a documented superset field (applies on `search.people` only; `search.companies` ignores it).

- **2026-07-22** — Added the Job Search endpoints and realigned the people location
  filter. **(1)** New `client.jobs` namespace (its own OpenAPI tag, so its own module
  per the one-module-per-tag rule) with `jobs.search()` → `POST /v2/jobs/search` and
  `jobs.company()` → `POST /v2/jobs/company`. Both are cursor-paginated through the
  existing `make_cursor_page_promise`, so they inherit the null-cursor stop and the
  non-advancing-cursor guard for free; server-side cap is 5,000 jobs per query, 50 per
  page. `jobs.company()` takes no default `= {}` because `company_linkedin_url` is
  required (the API 422s without it) — it follows the `search.employee_finder`
  precedent, not the `search.companies` one. Response models live in `types/jobs.ts`
  and reuse the shared `Location`. **(2)** Three enums added to `PROPERTY_TO_CLASS`:
  `seniority`→`Seniority`, `employment_type`→`EmploymentType`,
  `work_arrangement`→`WorkArrangement`. `company.size` maps onto the **existing**
  `EmployeeRange` class rather than getting its own: the value lists are byte-identical,
  and two properties sharing one class name collapses to a single output key (verified —
  the regeneration is a pure append). If upstream ever forks them, the generator's
  divergence check throws and names both spec paths, which is the intended human
  decision point. `job.field` is deliberately left unmapped — it is free-form upstream
  and must never become an enum. **(3)** **Breaking**: `PeopleLocationFilter.city` went
  from `string[]` to `KeywordFilter` (`{include, exclude}`), matching the live spec.
  No README sample or test exercised it, so nothing else failed — which is exactly why
  it needs calling out. **(4)** `JobCompanyFilter` cannot reuse `CompanyFilter`: its
  `hq.country_code` is an include/exclude object (not `string[]`), it has no
  `continent`/`sales_region`, and `size` is include-only. `is_agency` is typed
  `boolean`, not `boolean | null` — `to_jsonable` strips `null`, so omission is the only
  way to express the spec's tri-state "both", and it means the same thing.
- **2026-06-19** — Synced three endpoints to the live spec. **(1)** The company
  search filter (`CompanyFilter`, shared by `search.people`/`search.companies`)
  gained `total_funding`/`last_funding_amount`/`last_funding_year` (ranges),
  `last_funding_type` (new `LastFundingTypeFilter` over the new generated
  `LastFundingType` enum — added `last_funding_type` to `PROPERTY_TO_CLASS`), and
  `lead_investors` (keywords); `CompanyHQFilter` gained `state`. Requests are
  TS-only, so these are non-breaking pass-through fields. **(2)** The two employee
  distribution endpoints **moved + were renamed** to follow the spec (now tagged
  *Company Enrichment*): `utils.company_employment_distribution` →
  `enrichment.company_distribution_by_country`
  (`/v2/enrichment/company-distribution-by-country`) and
  `utils.company_department_distribution` →
  `enrichment.company_distribution_by_department`
  (`/v2/enrichment/company-distribution-by-department`); response models moved to
  `types/enrichment.ts` and were renamed (`Company{Employment,Department}Distribution`
  → `CompanyDistributionBy{Country,Department}Response`). **Breaking** surface change.
  PascalCase type names follow the **OpenAPI spec**, not the Python SDK: the field key
  `last_funding_type` → `LastFundingType`, and the paths
  `company-distribution-by-{country,department}` → `CompanyDistributionBy…Response`
  (matching the method names). The spec defines no named types of its own
  (`components.schemas` is empty, responses are example-only), and the merged Python
  SDK chose identifiers that drift from the spec path/field (`FundingType`,
  `CompanyCountryDistributionResponse`) — we intentionally do **not** mirror those.
  The snake_case wire surface (methods, params, response keys) stays 1:1 with both the
  API and Python.
- **2026-06-03** — Enum generator now pulls from the live OpenAPI spec
  (`https://api.blitz-api.ai/openapi`) instead of a hand-vendored file.
  `scripts/gen-enums.ts --fetch` walks the spec, maps each inlined enum to a name
  by its owning request property (`PROPERTY_TO_CLASS`), collapses the 6–12
  byte-identical duplicate occurrences, de-dups exact-repeat values, and rewrites
  both the committed cache `openapi/enum-source.json` and `src/types/enums.ts`.
  Verified byte-identical to the previous output for all enums (incl. the
  double-escaped `Women\\'s Handbag Manufacturing`). Kept the drift guard
  **offline** (only `--fetch` hits the network): CI's `pnpm gen:enums:check`
  re-renders from the committed cache and never depends on the network or breaks
  on upstream change — refreshes land as deliberate PRs. The generator **throws**
  (rather than silently shrinking output) if a mapped enum is missing upstream or
  its duplicate occurrences diverge, and warns-and-ignores an unmapped enum.
  The `publish` job in `release.yml` adds a **release-time sync gate**: it runs
  `gen:enums:fetch` and fails if the regenerated `src/types/enums.ts` differs from
  what's committed, so no release can ship enums stale vs prod. It diffs only the
  rendered `enums.ts` (which carries no spec metadata), so a `spec_version`-only
  bump never spuriously blocks a release (the only CI use of the network; per-PR
  `ci.yml` stays offline).
- **2026-06-02** — Closed three parity gaps found by comparing against `blitz-api-py`:
  **(G1)** timeouts are now **terminal** — the request loop only retries *pre-response*
  network errors, never a timeout, because `fetch`+`AbortSignal.timeout` can't tell
  whether a per-result-billed POST already reached the server (Python distinguishes
  connect- vs read-phase via httpx; fetch can't, so we err on not re-billing).
  **(G2)** a 2xx body that isn't JSON or fails Zod now raises `APIResponseValidationError`
  (a `BlitzError`) instead of leaking a raw `ZodError`; merged `parse_json_body` +
  `parse_model` into `parse_success_body`. **(G3)** added a per-call `timeout` via an
  options-bag second arg (`method(params, { timeout })`), threaded through
  `client.request` and propagated across paginated page fetches. Left the pagination
  *surface* naming and the sync-client/context-manager omissions as intentional.
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
