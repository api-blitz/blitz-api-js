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
behaves the same way over all 21 endpoints. `blitz-api-py` covers the same
surface, jobs included — keep the two at parity, and cross-check the sibling SDK
when changing any endpoint. (The `fair_usage` / `records_remaining` sync of
2026-09-02 and the 2026-09-15 spec sync both still need mirroring in
`blitz-api-py`.)

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
- **Rate limit**: 10 req/s **per endpoint** on all plans (legacy plans created before
  2026-09-30 run at 50); your per-endpoint value in
  `key_info.max_requests_per_seconds`. The SDK's `rate_limit_rps` default stays **5**,
  deliberately half the cap.
- **OpenAPI**: 3.1.0. The live runtime spec (`https://api.blitz-api.ai/openapi`)
  reports `info.version` `1.0.0`; the docs-site mirror
  (`https://docs.blitz-api.ai/api-reference/v2.openapi.json`) reports `2.0.0`. They
  describe the same endpoints — see §3 for which to use for what. All endpoints are
  `/v2/...` (plus the public `/changelog/`).
- **Status conventions**: 401 invalid/missing key · 402 Fair Use limit reached ·
  404 not found · 422 invalid input (body `{success, error:{code, message}}`; documented
  on `domain-to-linkedin`, but any endpoint can reject a malformed body — e.g. a filter
  list over 50 entries) · 429 rate limited (wait 60s then retry) · **503 partial search
  failure**, explicitly retriable, on `search.people`/`companies` and
  `jobs.search`/`company` (since 2026-08-05 they return it instead of a truncated page) ·
  5xx server error. The SDK already handles both correctly with no special-casing: 503
  falls under `>= 500` so it retries as a `ServerError`, and 422 is a non-retried
  `APIStatusError`.
- **`fair_usage`**: every `/v2` response (and the `402` body) carries a per-request
  usage block — `records_used`, `records_remaining` (`number | "unlimited"`),
  `next_reset_at`, `rate_limit.{requests_per_second,remaining_this_second}`, and
  `request_id`. `rate_limit` is absent on `key-info`, the one endpoint that is not
  rate limited. Also mirrored in the `x-records-used`/`x-records-remaining` response
  headers; the SDK reads neither header.

### Endpoint → method → response model (all 21)

| HTTP | Path | SDK method | Response model |
| --- | --- | --- | --- |
| GET | `/v2/account/key-info` | `account.key_info()` | `KeyInfo` |
| POST | `/v2/search/waterfall-icp-keyword` | `search.waterfall_icp()` | `WaterfallIcpResponse` |
| POST | `/v2/search/employee-finder` | `search.employee_finder()` | `EmployeeFinderResponse` |
| POST | `/v2/search/people` | `search.people()` | `PeopleSearchResponse` |
| POST | `/v2/search/companies` | `search.companies()` | `CompanySearchResponse` |
| POST | `/v2/jobs/search` | `jobs.search()` | `JobSearchResponse` |
| POST | `/v2/jobs/company` | `jobs.company()` | `CompanyJobsResponse` |
| POST | `/v2/company/tam-by-jobs` | `company.tam_by_jobs()` | `TamByJobsResponse` |
| POST | `/v2/company/tam-by-people` | `company.tam_by_people()` | `TamByPeopleResponse` |
| POST | `/v2/enrichment/person` | `enrichment.person()` | `PersonEnrichmentResponse` |
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
| GET | `/changelog/` | `changelog.list()` | `ChangelogResponse` |

### Re-deriving the API surface

Everything is public, and there are **two** specs plus a changelog feed — use each
for what it is actually good at:

| Source | Use it for |
| --- | --- |
| `https://api.blitz-api.ai/openapi` (runtime) | **Request schemas and, since 2026-09-15, fully typed response `properties`** — the authority for field names/types/required-ness. Also what `pnpm gen:enums:fetch` pulls. |
| `https://docs.blitz-api.ai/api-reference/v2.openapi.json` (docs mirror) | **Response `example` payloads** (its responses are still example-only) and prose descriptions/costs. Good source for test fixtures. |
| `GET https://api.blitz-api.ai/changelog/` | What *changed* and when, with `affected_endpoints`. Start a sync here — it names the breaking changes. |

The `.md` mirror of any docs page is at `https://docs.blitz-api.ai/<path>.md`, and
the page index is `https://docs.blitz-api.ai/llms.txt`.

---

## 3. THE crux: why response models are hand-written

Historically the spec's **request** bodies were richly typed (nested objects, enums)
while its **response** bodies were example-only (`{"type":"object","example":{…}}`,
no `properties`), so a generator would have emitted `unknown` for every response.
That is why response models are **hand-derived** Zod schemas.

**Changed 2026-09-15:** the runtime spec now publishes real `properties` for every
`200` response. That does *not* flip the decision — the models stay hand-written
(the docs mirror is still example-only, the schemas encode SDK-specific choices like
`blitzList`'s `null`→`[]` coercion and the superset-model strategy, and generated
output would churn on every upstream tweak). It does make verification far cheaper:
a sync can now diff the hand-written shape against real schema field lists instead
of eyeballing examples. `z.looseObject` remains the safety net so additions don't
break deserialization between SDK releases.

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
- **Completeness fix caught by cross-checking the live spec**: the live `waterfall-icp`
  response includes top-level `company_linkedin_url`, `max_results`, and
  `results_length` (its old spec example was `null`, so the Python model omits
  them). The TS `WaterfallIcpResponse` includes them.
- **Pagination**: `search.people`/`companies`, `jobs.search`/`company`,
  `company.tam_by_jobs`/`tam_by_people` (cursor) and
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
  all six cursor methods share one path and the guard lives in one place.
  - **`max_results` is page size, not a total** (the API bills 1 record per result
    returned), so `for await` streams every match up to the server limit. The seven
    paginated methods therefore accept a client-side **`max_items`** total cap that
    bounds `for await`/`collect()` and stops fetching once reached. `max_items` is
    destructured off in `cursor_page`/`offset_page` (not the resource method, which
    passes `params` whole) and **never sent on the wire** (it's not an API field). It caps the `PagePromise` streaming entry point only — `await` +
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
  base-client.ts  IO-free: to_jsonable, build_url (optional query)/headers, should_retry, backoff_seconds,
                  retry_delay, make_status_error, parse_json_body, parse_model.
                  STATUS_ERRORS maps code->class.
  client.ts       BlitzAPI: the fetch retry loop, options ctor, lazy memoized resource getters.
  pagination.ts   Page/CursorPage/OffsetPage/PagePromise: auto-pagination for the
                  search.*, jobs.* and company.tam_by_* lists. CursorPage/OffsetPage
                  read results/cursor/total_pages straight off the response, via the
                  CursorEnvelope/OffsetEnvelope constraints — no accessor callbacks.
  resources/      One module per resource namespace (account/search/jobs/company/enrichment/utils/changelog).
    paginate.ts   INTERNAL. cursor_page()/offset_page(): the one place a paginated method
                  builds its request — strips max_items, rewrites the paging key, threads
                  options into every page fetch. The seven paginated methods are one line each.
  types/
    models.ts     INTERNAL (not re-exported). blitzObject = (shape) => z.looseObject(shape);
                  blitzList(item) = null/undefined-tolerant array field (coerces both to []).
    envelopes.ts  INTERNAL (not re-exported). v2_response(shape) appends the shared
                  fair_usage block; cursor_envelope(item) / search_envelope(item) build
                  the paginated envelopes; offset_fields(item) is the offset counterpart
                  (spread, not wrapped — employee-finder prefixes its own field). Every
                  /v2 model is constructed through these, so fair_usage is structural
                  rather than a remembered convention.
    shared.ts     Location, Experience, Education, Certification, Person, HQ, Company,
                  MeteredValue, FairUsage.
    enums.ts      GENERATED. Industry(535) + CompanyType/EmployeeRange/Continent/
                  SalesRegion/JobFunction/JobLevel/LastFundingType/Seniority/
                  EmploymentType/WorkArrangement. Never hand-edit (see §7).
    filters.ts    Request filter interfaces + *Value aliases + per-method *Params interfaces.
    account/search/jobs/company/enrichment/utils/changelog.ts  Response schemas + inferred types per group.
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
    ├── AuthenticationError  # 401
    ├── FairUsageLimitError  # 402
    ├── NotFoundError        # 404
    ├── RateLimitError       # 429 (only after retries exhausted)
    └── ServerError          # 5xx (only after retries exhausted)
```

Unmapped non-2xx → generic `APIStatusError` (or `ServerError` for any 5xx).
`error.name` is set per class via `new.target.name`.

`InsufficientCreditsError` — the 2.0.0-era deprecated alias of `FairUsageLimitError` —
was **removed on 2026-09-22**, in the next major after the one it was scheduled for. A
test pins its absence from the export surface. While it existed it was bound to the same
class object rather than a subclass, since the client throws `FairUsageLimitError` and a
subclass would have made `instanceof InsufficientCreditsError` false for exactly the
callers the alias existed for.

---

## 7. Data-model specifics & quirks

- **`Industry` has 535 values** including upstream oddities: near-duplicates
  (`"Airlines and Aviation"` vs `"Airlines/Aviation"`) and one double-escaped value,
  `"Women\\'s Handbag Manufacturing"` (two literal backslashes + apostrophe). Kept
  byte-for-byte. The generator emits each value via `JSON.stringify` so escaping
  round-trips exactly. The 535th, **`"Unknown"`** (added 2026-09-16), is a *sentinel*
  rather than an industry — it matches companies with no industry value, and upstream
  appends it after the alphabetical run, which the generator preserves (it mirrors spec
  order, it does not sort).
- **`Company.linkedin_id` is a number**; `Person`/`Experience` linkedin ids are strings.
- **`Company` carries no `slogan`/`revenue`/`employee_growth`.** They were added in the
  2026-09-15 sync and removed again on 2026-09-22: neither spec documents them on any
  response (`revenue` exists only as a *request-side* range filter) and no changelog entry
  announces them, so they would have read `undefined` forever. `blitzObject` preserves them
  as unknown keys if the API ever does send them. Rule: a response field goes on a model
  only if the runtime spec's response `properties` or a docs-mirror example shows it —
  a hand-written test fixture is not evidence, it just confirms itself.
- **`Location`** is reused for `Person.location`, `Experience.job_location`, and
  `Job.location`. Only `Person.location` carries `postal_code`/`street_address`; the jobs
  payload populates only `city`/`country_code`. Because every field is `.nullish()` on a
  `blitzObject`, the superset parses all three unchanged rather than needing narrower
  per-endpoint duplicates.
- **`Education` has no `field_of_study`.** The API removed it on 2026-09-15 and folded the
  field of study into `degree` (`"Bachelor of Science, Industrial Engineering"`). Guarded by
  a schema-shape assertion in `models.test.ts` — `blitzObject` would otherwise happily
  preserve a stray raw key and let the removal go unnoticed.
- **`Person.profile_picture_url` is always `null`** since 2026-09-15. The API still returns
  the key, so the field stays on the model (marked `@deprecated`) rather than being dropped.
- **`Person.headline` is derived**, not the free-text LinkedIn headline: it is built from the
  first position as `<job title> | @<employer>`.
- **`Experience.job_contract_type`/`job_work_arrangement` stay loose strings**, not the
  request-side `EmploymentType`/`WorkArrangement` enums — those enums exist only on the
  request side of the *jobs* endpoints, and the person payload's values are free-form.
- **`Job.date_posted` stays a string.** The API emits a non-ISO-8601 timestamp
  (`"2026-07-08 23:00:07+02"` — space separator, offset, no `T`), so it is never
  coerced to a `Date`.
- **`HQ.postcode`/`street` are no longer in the spec** — as of the 2026-09-15 sync they
  appear on no endpoint and in no example (upstream never announced this). Kept as optional
  fields anyway: they cost nothing when absent, and removing them would break callers over an
  unannounced change. Expect `undefined`. **`Experience.company_name`** is now populated on
  every person-returning endpoint (it used to be people-search-only) and prefers the name on
  the linked LinkedIn company page.
- **List fields use `blitzList(item)`** (`src/types/models.ts`), which coerces a
  missing **or `null`** value to `[]`. Plain `z.array(x).default([])` only fills the
  default for `undefined`, so an explicit `null` would throw a `ZodError` and break
  deserialization — `blitzList` keeps a `null`-for-empty-list from doing so.
- **`FairUsage` lives in `shared.ts`** and is added to every `/v2` response envelope
  as `fair_usage: FairUsage.nullish()` — optional everywhere so a response from a
  deployment that predates the block still parses. `MeteredValue`
  (`number | "unlimited"`) is shared by `FairUsage.records_remaining`,
  `KeyInfo.records_remaining`, and `KeyInfo.max_requests_per_seconds`. The public
  `/changelog/` (a top-level array) is the one endpoint without the block.
- **Every `array | null` list coerces to `[]`** through `blitzList`, with no
  exceptions — `experiences`, `skills`, `education`, `certifications` and
  `specialties`. `specialties` was the lone holdout until 2026-09-22 (see the
  decision log); the runtime spec types it exactly as it types `skills`, so the
  exemption was never a spec fact.

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
  This mirrors the API, whose server-side limit is itself **per endpoint** (10 rps on each
  endpoint independently, per the docs), so a single client instance stays under the limit on
  every endpoint. The 429 retry path remains the backstop for bursts across processes (each
  process has its own buckets). `blitz-api-py` is also per endpoint (sliding window there vs.
  token bucket here), so the "mirror 1:1" parity holds.
- Rate limiter does not auto-detect your per-endpoint limit from `key_info` (uses 5 rps,
  half the API's 10 — so the default leaves throughput on the table by design).
- Request-side **list caps are not enforced client-side**: the API rejects any filter list
  over 50 entries (and a `cascade` over 10 steps) with a `422`. The SDK documents the caps
  on the filter interfaces but does not validate, so an over-long list surfaces as a server
  error rather than a type error.
- `z.looseObject` remains the safety net for response drift, now backed by real response
  `properties` in the runtime spec (see §3) rather than examples alone.

---

## 10. Decision log

- **2026-09-22** — **`experiences[]` on `search.people` is contested upstream; the SDK now
  says so instead of picking a side** (#27, mirroring `blitz-api-py`). The earlier pass
  today read the 2026-09-21 changelog entry as settled and wrote "carries only the position
  that matched your query" into the README as fact. Re-checking all three sources shows
  that is one side of a live contradiction:
  - `GET /changelog/`, 2026-09-21: "`experiences[]` on `/v2/search/people` now carries the
    single position that matched your search."
  - `docs.blitz-api.ai/api-reference/people-search/find-people`: "Every result carries the
    person's full position history in `experiences[]`, in profile order, **not just the
    position that matched your filters**" — still live, and it negates the changelog's exact
    phrasing rather than merely lagging it.
  - The runtime spec carries no `description` on the field, so it breaks no tie.

  The tiebreaker we do have points *away* from the changelog: two of the three response
  examples on that same docs page carry **two** positions per person, at two different
  companies (a current Google role alongside a past Stripe internship; a current Google
  directorship alongside a past Meta role). A single matched position cannot be two entries
  at two employers, so the page's examples corroborate its prose. Being the later statement
  does not beat being explicitly denied by the reference *and* by its payloads.

  So the README, the `Person.experiences` doc comment and the decision log all state the
  conflict and tell callers not to depend on either reading, keeping the `enrichment.person`
  routing — which is the actionable part and correct under both. Docs-only; the field is
  `blitzList(Experience)` under either reading, so nothing in the schema moves. **The real
  fix is upstream:** once the API owner resolves the changelog/docs contradiction, both SDKs
  can state it plainly and drop the hedge. Cheap to carry until then, and far cheaper than
  sending readers to a billed `enrichment.person` call they may not need.

- **2026-09-22** — Cleared the three cross-SDK divergences `blitz-api-py` raised against
  PR #23 (issues #24, #25, #26), all folded into the same breaking release rather than
  deferred, since each is cheaper to take while callers are already re-reading their
  imports. **(1) `Company.specialties` now uses `blitzList`** (#24). It was the one
  `array | null` list still surfacing `null`, justified in the 2026-06-01 entry as "the
  API documents it as genuinely nullable" — which the runtime spec does not support:
  `specialties` is `anyOf[anyOf[array, null], null]` and `skills` is
  `anyOf[array, null]`, the same `array | null` either side of a redundant wrapper that
  is a schema-generation artefact, not a semantic distinction. Keeping it meant
  `company.specialties?.map()` needed a guard that `person.skills.map()` did not, which
  is the exact ad-hoc-guard problem `blitzList` exists to delete — and it made the two
  SDKs return different values for identical wire bytes. Type-level breaking
  (`string[] | null | undefined` → `string[]`), but only by removing a `null` callers
  had to handle. The rule in `CLAUDE.md` lost its "genuinely nullable" exemption
  clause with it: there is now no exempt list.
  **(2) Removed the `InsufficientCreditsError` alias** (#25, gap 1). Deprecated in
  2.0.0 "to be removed in a future major"; this is that major, and it survived one
  already. The compat test flipped to pinning the name's *absence* from the export
  surface, mirroring `test_insufficient_credits_alias_is_gone` on the Python side.
  **(3) `OffsetPage.has_next_page()` also requires a non-empty page** (#26). On
  `{ page: 2, total_pages: 9, results: [] }` the walk stopped costing seven round trips
  that return nothing — a stale or over-counted `total_pages` is plausible on an offset
  endpoint whose underlying set can shrink mid-walk. Non-breaking (it only ever stops
  earlier). Deliberately **not** mirrored onto `CursorPage`, which keeps paging through
  an empty page while the cursor is live: there a sparse intermediate page can precede a
  full one, so the same guard would truncate a valid walk. The asymmetry is now a comment
  on both classes so the next reader doesn't "fix" it into symmetry.
  **Left open:** #25's gap 2, the 402 class name (`FairUsageLimitError` here,
  `InsufficientRecordsError` in `blitz-api-py`). It is the single error name that differs
  across the two SDKs, but picking the winner is a product call and renaming the loser is
  a breaking change on whichever side moves — not something to decide inside a sync PR.

- **2026-09-22** — Changelog re-pull before merging the sync branch, per the "start any sync
  at `GET /changelog/`" rule — which the 2026-09-15 pass had not re-run, so it missed two
  upstream entries and shipped three fields that were never there.
  **(1) Removed `Company.slogan`, `Company.revenue`, `Company.employee_growth` and the
  `EmployeeGrowth` model.** A field-path diff of every response model against the runtime
  spec found them to be the only SDK-side fields with no counterpart anywhere: the runtime
  spec has no `slogan`/`employee_growth` at all and carries `revenue` only as a
  *request-side* range filter (`company.revenue.min`/`max`), the docs mirror's company
  examples omit all three, and no changelog entry announces them. Typed, they would read
  `undefined` on every response while promising a value; the parse test could not catch it
  because the fixture in `test/data.ts` supplied the values it then asserted. Removed rather
  than kept: unlike `HQ.postcode`/`street` — which the spec *used* to document, so dropping
  them would break callers over an unannounced change — these were never documented, so
  nothing can be relying on them. `blitzObject` still preserves them as unknown keys if the
  API turns out to send them. Note this is **not** a breaking change against the released
  `2.0.0`: all three fields (and `EmployeeGrowth`) were added and removed inside this same
  unreleased branch, so no published version ever carried them — they need no
  `BREAKING CHANGE:` footer, and listing them as one would tell users to fix code that
  never compiled against a real release. **(2) `experiences[]` on `search.people` is documented as
  *contested*, not narrowed** (see the 2026-09-22 entry on #27 above for the evidence).
  The first pass read the 2026-09-21 changelog entry as settled and wrote the narrowing
  into the README as fact; the API reference for the same endpoint explicitly denies that
  exact phrasing and its examples show two positions per person, so the docs are not
  merely lagging. No schema change either way — the field is the same
  `blitzList(Experience)` — and `enrichment.person` is the unambiguous route to a whole
  career, which is the actionable part and is correct under both readings.
  **(3) `Unknown` widened** (upstream 2026-09-17): on the people- and job-side endpoints
  `company.industry.include` now also matches records with **no company attached**, not just
  companies with no industry value; `exclude` drops both. `search.companies` keeps the
  narrower meaning. `IndustryFilter` is shared by all of them, so its doc comment now splits
  the two readings instead of documenting only the `search.companies` one.
  **Verified unchanged:** every other response model matches the runtime spec field-for-field
  (the only remaining SDK-side extras are the deliberate `Location`/`HQ` superset fields), the
  request filters match the spec's request `properties` exactly, and the `cascade: 10` /
  50-entry caps, `profile_min_connections: 0` default, `422` body shape and search-side `503`
  are all still as documented.

- **2026-09-22** — Second code-quality audit, finishing what the 2026-09-16 pass started.
  All behaviour-preserving; no wire change. **(1)** The accessor layer the previous entry
  claimed to delete was only *half* deleted: the six call sites stopped passing
  `get_items`/`get_cursor`/`get_total_pages`, but `CursorPage`/`OffsetPage` still carried
  them as private fields and constructor params, now fed by two hardcoded lambda triples
  inside the factories. Pushing the `CursorEnvelope`/`OffsetEnvelope` constraint down onto
  the classes lets them read `response.results`/`.cursor`/`.total_pages` directly, so all
  six fields and six params are gone (`pagination.ts` 288 → 266). The duplicated
  "is the cursor usable" predicate in `has_next_page`/`get_next_page` collapsed into one
  `#next_cursor()`. **This is a public-surface break, and the only one in the audit that
  reaches a released API:** `CursorPage`/`OffsetPage` are re-exported from `index.ts`, so
  their constructors go 5 args → 3 and `TResponse` gains a
  `CursorEnvelope`/`OffsetEnvelope` constraint — anyone who constructed a page by hand, or
  named the type over a `TResponse` without `results`, has to change. Counted as acceptable
  rather than papered over with a compatible overload: the discarded 5-arg form also
  required a `fetch_page` closure that only `make_*_page_promise` can build, so the
  constructor is reachable but not usefully callable from outside, and an overload would
  resurrect the exact accessor layer this entry deletes. It ships in a release that is
  already breaking, with a `BREAKING CHANGE:` footer rather than a silent signature change.
  (Raised in review on PR #23; recorded here rather than reverted.) **(2)** New internal
  `resources/paginate.ts` with
  `cursor_page()`/`offset_page()`. The seven paginated methods each re-implemented the same
  three obligations — strip `max_items`, rewrite the paging key, thread `options` into
  *every* page fetch — which is the same remembered-convention problem `v2_response` solved
  for `fair_usage`; each method body is now one line. **(3)** `offset_fields(item)` in
  `envelopes.ts`, the counterpart to `cursor_fields`, spread into `EmployeeFinderResponse`
  (verified parsed key order still matches the wire exactly). Not wrapped in an envelope
  factory: the sole offset endpoint prefixes `company_linkedin_url`, and the offset wire
  order genuinely differs from the cursor one (`results` last, `max_results` before
  `results_length`) — one parameterised shape would be magic hiding that.
  **(4) Breaking (request):** `CompanyFilter.linkedin_url` moved to a new
  `PeopleCompanyFilter extends CompanyFilter`, used by `PeopleSearchParams` and
  `TamByPeopleParams`. `search.companies` accepts-then-silently-ignores the field — the
  identical failure mode that got `PeopleFilter.linkedin_url` removed one week earlier, so
  it gets the identical treatment rather than staying a documented superset field. Sending
  it to `search.companies` is now a compile error; the two people-side endpoints are
  unaffected. **(5)** The `fair_usage` sweep in `test/models.test.ts` was matching on
  `name.endsWith("Response")`, which silently skipped any endpoint model named otherwise —
  `KeyInfo` is proof those exist. Confirmed the hole by exporting a `/v2` model with no
  `fair_usage` named `BalanceSnapshot`: all 139 tests passed. Inverted to an explicit
  `SUB_MODELS` exemption list (every exported `ZodObject` must be a known nested model or
  carry `fair_usage`), which fails on that probe, and dropped the hand-maintained count of
  20 that the sweep was supposed to have replaced. A second assertion keeps the exemption
  list itself honest by checking each name still resolves to a real export.

- **2026-09-16** — Deduplicated the response/pagination layer after a code-quality audit
  found the "add an endpoint" checklist had become duplicated state that grew with every
  release (the `(r) => r.results` closure went 3 → 5 → 6 → 7 across feature commits, and
  the 9-line `max_results`/`cursor`/`max_items` params tail was byte-identical 7 times).
  Four layers, all behaviour-preserving: **(1)** new internal `types/envelopes.ts` with
  `v2_response(shape)`, which appends the shared `fair_usage` block — 19 copies of the
  same doc comment and 20 hand-written field declarations gone, and the block is now
  impossible to omit. **(2)** `cursor_envelope(item)` / `search_envelope(item)` build the
  six paginated envelopes (the latter adds `total_results`; the `tam_by_*` pair omits it,
  as the API does). Spread rather than `.extend()`ed so each envelope keeps the API's own
  field order — verified the parsed key order still matches the wire exactly. **(3)**
  `make_cursor_page_promise`/`make_offset_page_promise` now constrain `TResponse` to a
  `CursorEnvelope`/`OffsetEnvelope`, which the factories guarantee by construction, so all
  seven call sites drop both accessor closures and their (always inferable) explicit
  generic arguments — a paginated resource method fell from 8 body lines to 3, leaving
  only the per-endpoint path and schema. **(4)** `CursorPaginatedParams` /
  `OffsetPaginatedParams` base interfaces replace the seven repeated tails. Net **−132
  lines**. The `fair_usage` test stopped being a hand-maintained list of 20 names (which
  only checked models someone remembered to add) and became a sweep of the export surface;
  confirmed it bites by temporarily regressing one model off the factory. **Surface
  impact:** the emitted `.d.ts` is unchanged apart from doc comments, a cosmetic
  type-level reordering of `total_results`, the `extends` clauses themselves, and **two
  new exports** — `CursorPaginatedParams`/`OffsetPaginatedParams`, additive and now part
  of the public request vocabulary. `envelopes.ts` is internal, like `models.ts`.
  **Deliberately not done** (considered and rejected): merging `Location`/`HQ` (different
  wire keys); unifying `country_code`'s `string[]` vs `KeywordFilter` split (the API
  genuinely differs per endpoint — faithful mirroring); a `found_envelope(key, model)`
  factory (the payload key varies, so it would be magic hiding a simple shape); merging
  `CursorPage`/`OffsetPage` (genuinely different `has_next_page` logic, 687 lines of tests
  riding on them); collapsing the seven `{include, exclude}` filter interfaces (they are
  the public surface, and `Enum | (string & {})` already makes them mutually assignable —
  the safety is autocomplete-only by design).

- **2026-09-16** — Follow-up spec re-pull, one day after the 2026-09-15 sync. Upstream
  published two changelog entries; the spec delta is tiny and entirely additive.
  **(1)** `Industry` gained a 535th value, **`"Unknown"`** — a sentinel matching companies
  with *no* industry, usable in `include` (adds them to your list) or `exclude` (drops
  them). Before it, reaching those companies meant enumerating every other industry in
  `exclude`, which the 50-entry cap made impossible. Picked up by `pnpm gen:enums:fetch`
  with zero hand-editing; the generator's divergence check passed, confirming upstream
  added it consistently to all inlined copies. Note it lands **after** the alphabetical
  run (upstream appends), which the generator preserves — it mirrors spec order and does
  not sort. **(2)** Range filters now reject `min > max` with a `422` naming the field.
  Previously accepted and silently wrong: `company.revenue` 500'd, every other range
  returned no results. Pure server-side validation, no schema change — documented on
  `RangeFilter` (along with `max: 0` meaning *no upper bound*) because the failure mode
  moved from "empty page" to "thrown `APIStatusError`", which callers may need to handle.
  **(3)** The only other spec diff is `company.industry.include`/`exclude` losing their
  `default: []` — inert here, since the SDK never encodes request defaults (`to_jsonable`
  just drops `undefined`). No endpoints, fields, or constraints changed otherwise;
  verified by a field-and-constraint diff across both spec pulls. Stale `534` counts
  corrected in README/§5/§7.

- **2026-09-15** — Synced against the live spec + docs after the batch of upstream changes
  published on `GET /changelog/` that day. **(1) Two new endpoints.**
  `enrichment.person()` (`POST /v2/enrichment/person`, 1 record on success, free on a miss)
  returns `PersonEnrichmentResponse` = `{found, person, fair_usage}` — the same envelope as
  the reverse lookups, reusing the shared `Person`; named for the spec path, matching the
  `CompanyEnrichmentResponse`/`/v2/enrichment/company` precedent.
  `company.tam_by_people()` (`POST /v2/company/tam-by-people`, cursor-paginated, 1 record
  per result) returns `{company, matched_people}` matches — the people-side twin of
  `tam_by_jobs` (that one sizes accounts on who they're *hiring*, this one on who already
  works there) — and rides the existing `make_cursor_page_promise`, so it inherits the
  null-cursor stop and non-advancing-cursor guard for free.
  **(2) Breaking (response):** `Education.field_of_study` is **removed** — the API folded
  the field of study into `degree` (`"Bachelor of Science, Industrial Engineering"`).
  Guarded by the existing `Education` schema-shape assertion, which is exactly why that
  assertion exists: `blitzObject` would otherwise preserve a stray key and hide the change.
  **(3) Breaking (request):** `PeopleFilter.linkedin_url` **removed**. `/v2/search/people`
  stopped honouring it on 2026-09-11 — a request that still sends it *succeeds* but silently
  returns results for the other criteria, the worst possible failure mode — so the SDK turns
  it into a compile error. The filter survives on `company.tam_by_people`, so it moved to a
  new `TamPeopleFilter extends PeopleFilter` (which also carries `min_per_company`),
  mirroring the `TamJobFilter extends JobFilter` split rather than widening the shared
  filter. `CompanyFilter.linkedin_url` is untouched (still honoured on `search.people` and
  now `tam_by_people`; still ignored by `search.companies`).
  **(4) New response fields**, all additive on the superset models: `Location.postal_code` /
  `street_address` (person locations only), `Experience.job_contract_type` /
  `job_work_arrangement` (loose strings — free-form upstream, deliberately *not* pinned to
  the request-side `EmploymentType`/`WorkArrangement` enums). *(This entry also added
  `Company.slogan`/`revenue`/`employee_growth`; reverted 2026-09-22 — see the entry above,
  they are in neither spec.)* **(5) Semantics-only, documented not enforced:** `headline` is now
  derived as `<job title> | @<employer>`; `profile_picture_url` is always `null` (kept on
  the model, marked `@deprecated`, since the API still returns the key);
  `search.people`/`enrichment.person` return the *whole* career in `experiences[]`
  (*contested for `search.people` since 2026-09-21 — see the entries above*); every
  filter list is capped at 50 entries and `cascade` at 10 steps (documented on the filter
  interfaces, **not** validated client-side — see §9); `waterfall_icp`'s
  `profile_min_connections` server default is `0`, not 200. **(6)** API rate limit is now
  **10 req/s per endpoint** (50 on legacy plans); `DEFAULT_RATE_LIMIT_RPS` stays **5** —
  the published docs describe the SDK default as deliberately half the cap — so only the
  prose in `constants.ts`/README/§2/§9 changed. **(7)** `records_remaining: "unlimited"`
  needed no code change: `MeteredValue` already modelled it. Enums regenerated from the
  live spec: **zero drift**. Also rewrote §3 — the runtime spec now publishes real response
  `properties`, so a sync can diff against schemas instead of examples; the models stay
  hand-written (reasons in §3). Not yet mirrored in `blitz-api-py`.

- **2026-09-02** — Purged "credits" from the SDK's vocabulary; the API no longer uses the
  word (the live spec has **zero** occurrences — endpoints document `Cost: 1 record per
  result (max = max_results)` / `Cost: 0 records`, and usage is reported as
  `records_used`/`records_remaining`). The exported `InsufficientCreditsError` is renamed
  **`FairUsageLimitError`**, shipping **with** a deprecated `InsufficientCreditsError`
  alias bound to the same class object (not a subclass — that would make `instanceof
  InsufficientCreditsError` false for the error actually thrown), so the rename itself is
  **not** breaking; the branch's major bump comes from `KeyInfo.remaining_credits` →
  `records_remaining` instead. `FairUsageLimitError` rather than
  `InsufficientRecordsError` because the API's own `402` body reads *"Fair Use limit
  reached. Upgrade your plan at app.blitz-api.ai/billing…"*, and it pairs with the
  `FairUsage` model; the 402 status mapping, base class, and attributes are unchanged.
  `test/errors.test.ts` now asserts against that real message instead of an invented
  one. Everything else was doc-comment and README prose ("1 credit per result" → "1
  record per result", "credit balance" → "record balance", …). **Deliberately not
  scrubbed:** the `"Credit Intermediation"` industry value in the generated
  `enums.ts`/`enum-source.json` (real API enum data, and those files are never
  hand-edited); the `remaining_credits` literal in the `models.test.ts` shape guard (it
  names the *old API field*, so renaming it would disarm the assertion); and this
  decision log, which records the old names on purpose. **Known drift:** `blitz-api-py`
  still exports `InsufficientCreditsError` — being mirrored separately.
- **2026-09-02** — Synced against the live spec after the upstream changes announced
  on `GET /changelog/`. **(1) Breaking:** `KeyInfo.remaining_credits` →
  **`records_remaining`** (API-side rename on 2026-09-01, aligning key-info with
  `fair_usage.records_remaining` and the `x-records-remaining` header). Guarded by a
  schema-shape assertion, since `blitzObject` would otherwise preserve the old raw key
  and let a value-only test pass. **(2)** Every `/v2` response (and the `402` body)
  now carries a **`fair_usage`** block; modeled once as `FairUsage` in `shared.ts` and
  added as `fair_usage: FairUsage.nullish()` to all 18 envelopes — optional so an older
  deployment's response still parses; a test asserts the field is declared on every
  `/v2` model (`/changelog/`, a top-level array, is exempt). The previously
  private `CreditValue` union became the shared, exported **`MeteredValue`**
  (`number | "unlimited"`), now used by both `KeyInfo` and `FairUsage`. The companion
  `x-credit-*` → `x-records-*` header rename is a no-op here: the SDK reads neither.
  Also fixed a stale `TAM_BY_JOBS` cursor assertion in `models.test.ts` that had been
  failing on `main`. Not yet mirrored in `blitz-api-py`.
- **2026-08-13** — Added `company.tam_by_jobs()` (`POST /v2/company/tam-by-jobs`, cursor-paginated,
  new `client.company` namespace; the streamed item is a `{ company, matched_jobs }` match reusing
  shared `Company`, and the response carries **no `total_results`**; `min_per_company` via
  `TamJobFilter extends JobFilter` so the shared `JobFilter` stays clean; `company` reuses
  `JobCompanyFilter`) and the public `changelog.list()` (`GET /changelog/`, new `client.changelog`
  namespace; not paginated; response is a top-level `blitzList(ChangelogEntry)`; `type` a free-form
  string). Added the SDK's first GET query params: `build_url(baseUrl, path, query?)` + a trailing
  `query?` on `client.request`, with the per-endpoint rate limiter still keyed on the base path.
  Fixed the enum generator to skip the `responses` subtree — the live spec's changelog response
  `type` enum otherwise mapped onto `CompanyType` (`PROPERTY_TO_CLASS["type"]`) and broke
  `gen:enums:fetch`. Mirrored 1:1 in `blitz-api-py`.
- **2026-07-23** — Closed parity gaps found by auditing against the live spec (source of
  truth) field-by-field. **(1)** `KeyInfo.remaining_credits`
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
  design *(reversed 2026-09-22 — the spec does not support the exemption)*. Added a
  regression parse test for `null` lists (top-level + nested).
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
