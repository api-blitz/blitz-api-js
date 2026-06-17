# blitz-api-js

[![npm version](https://img.shields.io/npm/v/blitz-api-js.svg)](https://www.npmjs.com/package/blitz-api-js)
[![types included](https://img.shields.io/npm/types/blitz-api-js.svg)](https://www.npmjs.com/package/blitz-api-js)
[![CI](https://github.com/api-blitz/blitz-api-js/actions/workflows/ci.yml/badge.svg)](https://github.com/api-blitz/blitz-api-js/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/blitz-api-js.svg)](./LICENSE)

The typed TypeScript SDK for the [Blitz API](https://blitz-api.ai) — B2B data,
search, and enrichment.

- **Fully typed** — Zod-validated response models with inferred TypeScript types
  and editor autocomplete; ships `.d.ts` (ESM) and `.d.cts` (CJS).
- **Async, `fetch`-based** — a single `BlitzAPI` class; every method returns a
  `Promise`. Works on Node 20+ and any runtime with a global `fetch`.
- **Resilient** — built-in client-side rate limiting, retries with backoff on
  `429`/`5xx`/network errors, and a typed exception hierarchy.
- **Forward-compatible** — fields the API adds later are preserved, never dropped
  or rejected.
- **1:1 with the API** — request and response field names are **snake_case**,
  exactly matching [docs.blitz-api.ai](https://docs.blitz-api.ai).

> Create and manage API keys at [app.blitz-api.ai](https://app.blitz-api.ai).

> **Billing.** Blitz bills **per result**. A bare `for await` over a search
> streams every match up to the server-side limit (people: 50k results), which can be a
> lot of credits. Bound spend with **`max_items`** (a client-side total cap, never sent
> on the wire) — details in [Pagination](#pagination).

## Contents

- [Installation](#installation)
- [Quickstart](#quickstart)
- [Example: find, enrich, collect](#example-find-enrich-collect)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Pagination](#pagination)
- [Configuration](#configuration)
- [Error handling](#error-handling)
- [Forward compatibility](#forward-compatibility)
- [Development](#development)

## Installation

```bash
npm install blitz-api-js
# or: pnpm add blitz-api-js   /   yarn add blitz-api-js   /   bun add blitz-api-js
```

Requires Node.js 20+. Ships both ESM and CommonJS builds.

## Quickstart

```ts
import { BlitzAPI } from "blitz-api-js";

// api_key defaults to the BLITZ_API_KEY environment variable.
const client = new BlitzAPI();

// Health-check the key before a batch job.
const info = await client.account.key_info();
console.log(info.valid, info.remaining_credits, info.max_requests_per_seconds);

// LinkedIn profile URL -> verified work email.
const email = await client.enrichment.email({
  person_linkedin_url: "https://www.linkedin.com/in/example-person",
});
if (email.found) console.log(email.email);

// Search people with typed, autocompleted filters (snake_case, 1:1 with the API).
// List methods are paginated; iterate one page's items via `.data` (or stream
// every page with `for await` — see Pagination below).
const page = await client.search.people({
  company: { industry: { include: ["Software Development"] } },
  people: { job_level: ["VP"] },
  max_results: 10,
});
for (const person of page.data) {
  console.log(person.full_name, person.headline);
}
```

CommonJS works too:

```js
const { BlitzAPI } = require("blitz-api-js");
```

## Example: find, enrich, collect

A complete flow — find people, enrich each one's verified work email, collect the
contacts. `max_items` caps the total fetched so the run can't surprise you with credits.

```ts
import { BlitzAPI } from "blitz-api-js";

const client = new BlitzAPI(); // reads BLITZ_API_KEY

// 1. Find up to 25 VPs at software companies (snake_case filters, 1:1 with the API).
const leads = await client.search
  .people({
    company: { industry: { include: ["Software Development"] } },
    people: { job_level: ["VP"] },
    max_results: 25,
    max_items: 25, // client-side total cap — bounds credit spend
  })
  .collect();

// 2. Enrich each lead's verified work email from their LinkedIn profile URL.
const contacts: { name?: string | null; email?: string | null }[] = [];
for (const person of leads) {
  if (!person.linkedin_url) continue;
  const result = await client.enrichment.email({
    person_linkedin_url: person.linkedin_url,
  });
  if (result.found) {
    contacts.push({ name: person.full_name, email: result.email });
  }
}

console.log(`Collected ${contacts.length} contacts`);
```

What comes back is typed and snake_case. A `person` from the search above (fields are a
**superset** — only what the profile has is populated, and unknown fields the API adds
later are preserved, typed as `unknown`):

```ts
{
  full_name: "Jordan Lee",
  headline: "VP of Engineering at Acme",
  linkedin_url: "https://www.linkedin.com/in/example-person",
  location: { city: "San Francisco", state_code: "CA", country_code: "US", continent: "North America" },
  experiences: [
    { job_title: "VP of Engineering", company_name: "Acme", job_is_current: true },
  ],
  // first_name, last_name, skills, education, certifications, … also present
}
```

And `enrichment.email(...)` returns:

```ts
{
  found: true,
  email: "jordan@acme.com",
  all_emails: [{ email: "jordan@acme.com", email_domain: "acme.com" }],
}
```

## Authentication

Pass the key explicitly or via the `BLITZ_API_KEY` environment variable:

```ts
const explicit = new BlitzAPI({ api_key: "sk_..." }); // explicit
const fromEnv = new BlitzAPI();                        // reads BLITZ_API_KEY
```

The key is sent in the `x-api-key` header. Never expose it in client-side code —
always call the API from your backend.

## Endpoints

All methods are grouped into four namespaces:

| Namespace | Methods |
| --- | --- |
| `client.account` | `key_info()` |
| `client.search` | `people()`, `companies()`, `employee_finder()`, `waterfall_icp()` |
| `client.enrichment` | `email()`, `phone()`, `email_to_person()`, `phone_to_person()`, `company()`, `domain_to_linkedin()`, `linkedin_to_domain()` |
| `client.utils` | `current_date()`, `company_employment_distribution()`, `company_department_distribution()` |

Each method takes a single options object (snake_case keys) and returns a typed,
Zod-validated response (also snake_case). Enum-backed filter fields (e.g.
`industry`, `job_level`, `continent`) accept either a known value — autocompleted
from a union like `Industry` — or any raw string, so a value missing from the
vendored taxonomy never blocks you.

```ts
import { INDUSTRY } from "blitz-api-js"; // the full value array (534 industries)
import type { CompanyFilter, Industry } from "blitz-api-js";
```

The three search list methods — `people`, `companies`, `employee_finder` — return a
paginated `PagePromise` instead of a plain response (see [Pagination](#pagination)).
`waterfall_icp` and the `enrichment`/`utils`/`account` methods return their response
directly.

## Pagination

`search.people` and `search.companies` are **cursor**-paginated; `search.employee_finder`
is **page**-paginated. Each returns a `PagePromise` you can either `await` for the first
page or `for await` to stream every item across all pages — each page is fetched on
demand, through the client's rate limiter.

> **`max_results` is the page size, not a total.** It's "results per page" (1–50), and
> the API **bills 1 credit per result returned**. A bare `for await` streams *every*
> match up to the server-side limit (people: 50k results / 1k pages; employee finder:
> 10k), which can be a lot of credits. To bound it, pass **`max_items`** (a client-side
> total cap — never sent on the wire), `break` out of the loop, or drive pages manually.

```ts
// Stream up to max_items results across pages, then stop fetching:
for await (const person of client.search.people({ company: {/* … */}, max_results: 50, max_items: 200 })) {
  console.log(person.full_name);
}

// Or collect into an array (also honors max_items):
const people = await client.search.people({ max_results: 50, max_items: 200 }).collect();

// Or take the first page and drive pagination manually (uncapped — your loop, your call):
const page = await client.search.companies({ max_results: 25 });
page.data; // Company[] — items on this page
page.response.total_results; // the full parsed response (snake_case, 1:1 with the API)
if (page.has_next_page()) {
  const next = await page.get_next_page();
}

// Or iterate page-by-page:
const first = await client.search.employee_finder({ company_linkedin_url: "…", max_results: 50 });
for await (const p of first.iter_pages()) {
  console.log(`page ${p.response.page}/${p.response.total_pages} — ${p.data.length} items`);
}
```

`max_items` caps how many items `for await` / `collect()` yield and stops fetching once
reached; it bounds the total fetched to within one page (`≈ ceil(max_items / max_results)
* max_results`), so tune `max_results` too for tight spend control. Auto-pagination
otherwise stops when the API signals the end (`cursor: null`, or `page` beyond
`total_pages`). `search.waterfall_icp` returns a single ranked result set and is not
paginated.

## Configuration

```ts
const client = new BlitzAPI({
  api_key: undefined, // falls back to BLITZ_API_KEY
  base_url: "https://api.blitz-api.ai",
  timeout: 30, // default per-request timeout, seconds (via AbortSignal.timeout)
  max_retries: 3, // retries on 429 / 5xx / pre-response network errors
  rate_limit_rps: 5, // client-side token bucket; null to disable
  fetch: undefined, // custom fetch implementation (tests / runtimes)
});

// Override the timeout for a single call — pass an options object as the last
// argument to any method (it never appears on the wire):
await client.enrichment.email({ person_linkedin_url: "…" }, { timeout: 5 });
```

The client-side rate limiter is a token bucket: it admits at most `rate_limit_rps`
requests per second so a single client instance stays under the API's limit (5 req/s
by default; check your key's limit via
`(await client.account.key_info()).max_requests_per_seconds`). Across multiple
processes you may still hit `429` — the retry path handles that.

## Error handling

```ts
import {
  APIConnectionError,
  APIResponseValidationError,
  APIStatusError,
  APITimeoutError,
  AuthenticationError,
  BlitzError,
  InsufficientCreditsError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "blitz-api-js";

try {
  await client.enrichment.email({ person_linkedin_url: "..." });
} catch (err) {
  if (err instanceof InsufficientCreditsError) {
    // 402 — out of credits
  } else if (err instanceof AuthenticationError) {
    // 401 — bad key
  } else if (err instanceof APIResponseValidationError) {
    // 2xx, but the body wasn't valid JSON or didn't match the schema (err.cause has details)
  } else if (err instanceof APIStatusError) {
    console.log(err.status_code, err.message, err.body, err.request_id);
  } else if (err instanceof BlitzError) {
    // base class for everything this SDK raises
  }
}
```

`429` and `5xx` are retried automatically (with backoff + jitter) up to
`max_retries`; `401`/`402`/`404` throw immediately. A **pre-response** network
error (DNS failure, connection refused) is retried, then surfaces as
`APIConnectionError`. **Timeouts are not retried** — with `fetch` we can't tell
whether the request already reached the (per-result-billed) server, so a timeout
surfaces immediately as `APITimeoutError` rather than risk a double charge. Raise
the per-call `timeout` for genuinely slow endpoints instead.

## Forward compatibility

Response objects keep their snake_case wire keys and **preserve unknown fields** —
if the API adds a property before this SDK models it, the value is still present on
the parsed object (typed as `unknown`). Known fields stay precisely typed.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, the test/type/lint
commands, the enum code generator, and the automated release process.

## License

[MIT](LICENSE)
