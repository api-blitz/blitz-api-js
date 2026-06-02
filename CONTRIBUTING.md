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
pnpm gen:enums         # regenerate src/types/enums.ts from openapi/enum-source.json
pnpm gen:enums:check   # enum drift guard (CI runs this)
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
- `src/resources/{account,search,enrichment,utils}.ts` — one class per API tag
  group; each method calls `client.request(method, path, body, schema)`.
- `src/types/` — Zod response schemas (`*.ts` per group, built on `blitzObject` =
  `z.looseObject`), request filter/param interfaces (`filters.ts`), and the
  **generated** `enums.ts`.
- `src/errors.ts`, `src/rate-limit.ts`, `src/constants.ts`, `src/version.ts`.

Response models are **hand-written**: the OpenAPI spec types request bodies
precisely but its responses are example-only, so a generator can't drive them.
Schemas are derived from the docs' response examples (verified via the Blitz docs
MCP) and use `z.looseObject` so unknown fields are preserved (forward-compat).

The public surface is **snake_case everywhere** (methods, params, response keys)
to match the API and the Python SDK 1:1. Biome's `useNamingConvention` rule is
intentionally not enabled.

## Enums (generated)

The large request enums (notably the 534-value `Industry`) are vendored verbatim
in `openapi/enum-source.json` and turned into `src/types/enums.ts` by
`scripts/gen-enums.ts`. To change a value: edit `openapi/enum-source.json` (keep
it byte-identical to the API), run `pnpm gen:enums`, and commit both files. CI's
drift guard (`pnpm gen:enums:check`) fails if the generated file is stale. Biome
ignores the generated file; `tsc` still type-checks it.

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
