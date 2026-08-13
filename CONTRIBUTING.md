# Contributing to blitz-api-js

## Local setup

Requires Node.js 20+ (CI tests 20/22/24) and [pnpm](https://pnpm.io) 10+.

```bash
pnpm install
```

## Commands

```bash
pnpm lint              # Biome: lint + format check
pnpm format            # Biome: apply formatting
pnpm typecheck         # tsc --noEmit (strict)
pnpm test              # Vitest + MSW (models, resources, retry, rate-limit, errors)
pnpm gen:enums:fetch   # pull the live OpenAPI spec, de-dup, rewrite enum-source.json + enums.ts
pnpm gen:enums         # re-render src/types/enums.ts from the committed cache (offline)
pnpm gen:enums:check   # enum drift guard, offline (CI runs this)
pnpm build             # tsdown -> dist/ (ESM + CJS + .d.ts/.d.cts)
```

Validate the published package shape before releasing:

```bash
pnpm dlx publint
pnpm dlx @arethetypeswrong/cli --pack
```

## Architecture

- `src/client.ts` — `BlitzAPI`: the `fetch` retry loop, lazy memoized resource
  getters, and the options constructor. The only IO.
- `src/base-client.ts` — pure, IO-free helpers: `to_jsonable`, URL/header
  building, retry math, error mapping, response parsing.
- `src/resources/{account,search,jobs,enrichment,utils}.ts` — one class per API tag
  group; each method calls `client.request(method, path, body, schema)`.
- `src/types/` — Zod response schemas (`*.ts` per group, built on `blitzObject` =
  `z.looseObject`), request filter/param interfaces (`filters.ts`), and the
  **generated** `enums.ts`.
- `src/errors.ts`, `src/rate-limit.ts`, `src/constants.ts`, `src/version.ts`.

Response models are **hand-written**: the OpenAPI spec types request bodies
precisely but its responses are example-only, so a generator can't drive them.
Schemas are derived from the docs' response examples (verified against the public
docs / OpenAPI spec) and use `z.looseObject` so unknown fields are preserved (forward-compat).

The public surface is **snake_case everywhere** (methods, params, response keys)
to match the API and the Python SDK 1:1. Biome's `useNamingConvention` rule is
intentionally not enabled.

## Enums (generated)

The large request enums (notably the 534-value `Industry`) are pulled straight
from the Blitz OpenAPI spec (`https://api.blitz-api.ai/openapi`). The spec inlines
each enum and repeats it across endpoints, request content-types, and
`include`/`exclude` sub-objects, so `scripts/gen-enums.ts` maps each enum to a
name by its owning request property, collapses the identical duplicate
occurrences, and de-dups exact-repeat values. It writes a committed cache,
`openapi/enum-source.json`, and renders `src/types/enums.ts` from it.

To refresh from the API: run `pnpm gen:enums:fetch` (the only command that hits
the network) and commit both files. **Don't hand-edit either** — both are
generated. The drift guard `pnpm gen:enums:check` is **offline**: it re-renders
`enums.ts` from the committed cache and fails if it's stale, so CI never depends
on the network or breaks when upstream changes (a refresh lands as a deliberate
PR). The generator throws rather than silently shrinking output if a mapped enum
goes missing upstream or its duplicate occurrences diverge. Biome ignores the
generated `enums.ts`; `tsc` still type-checks it.

**Release-time sync gate.** The `publish` job in `release.yml` runs
`pnpm gen:enums:fetch` and fails the release if the regenerated
`src/types/enums.ts` differs from what's committed — so no release can ship
enums that are stale vs the live prod spec. (It diffs only the rendered
`enums.ts`, which carries no spec metadata, so a `spec_version`-only bump never
spuriously blocks a release.) If a release fails there, run
`pnpm gen:enums:fetch` locally, commit `src/types/enums.ts` +
`openapi/enum-source.json`, and re-release. (This is the only CI use of the
network; per-PR `ci.yml` stays offline.)

## Releases (automated)

[release-please](https://github.com/googleapis/release-please) (`release-type:
node`) maintains a Release PR from [Conventional
Commits](https://www.conventionalcommits.org/). Merging it bumps `package.json`
and `src/version.ts` (via the `x-release-please-version` marker), updates
`CHANGELOG.md`, tags, and creates a GitHub Release. The `publish` job in
`release.yml` then runs `pnpm build` and `npm publish` using **npm Trusted
Publishing (OIDC)** — no stored token, with automatic provenance.

Use `feat:` / `fix:` commit prefixes; PR titles are linted (`pr-title.yml`)
because squash-merge uses the title as the commit subject.

### One-time human setup (cannot be automated)

The pipeline cannot publish until this is done once:

1. **Bootstrap `0.1.0` manually** — OIDC cannot publish a package's first
   version. Build and publish locally once:
   ```bash
   pnpm build && npm publish --access public
   ```
   (or use a one-time automation token).
2. **Configure the npm trusted publisher** (npmjs.com → the `blitz-api-js`
   package → Settings → Trusted Publishing): GitHub owner `api-blitz`, repo
   `blitz-api-js`, workflow `release.yml`, environment `npm`.
3. **Create a GitHub Environment named `npm`** and restrict it to the `main`
   branch / tags.
4. **Branch protection** on `main`, and enable "Allow GitHub Actions to create
   and approve pull requests" (so release-please can open its PR).
5. `package.json` `repository.url` must exactly match the GitHub repo URL — npm
   verifies it for provenance.

After that, merging the release-please PR publishes automatically.
