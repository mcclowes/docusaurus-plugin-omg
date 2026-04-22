# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

`docusaurus-plugin-omg` — Docusaurus v3 plugin that compiles [OMG](https://omg.gs/) (OpenAPI Markdown Grammar) source files to OpenAPI 3.1 at build time. The plugin is deliberately thin: it runs the omg-parser + omg-compiler pipeline as part of the Docusaurus build and writes the resulting spec to disk. It does not ship a renderer. Users pair it with `redocusaurus`, `docusaurus-plugin-openapi-docs`, Swagger UI, Redoc, etc.

- Entry: `src/index.ts` re-exports the plugin factory and types.
- Lifecycle: `src/plugin.ts` uses `loadContent()` (reads roots, calls `loadApi` → `compileToOpenApi` → `serialize`, writes files) plus `getPathsToWatch()` for dev mode.
- Options: `src/options.ts` validates + normalises, derives per-api `output` from `id` + `outputDir` + `format`.
- Example site: `examples/sample-site/` has a sample OMG source under `api/todo/` and consumes the plugin via `file:../..`. The parent `dist/` must be built before running the example.

## Stack

- TypeScript, Docusaurus v3 peer
- `omg-parser` + `omg-compiler` (runtime deps)
- Vitest (Node env, no DOM)
- tsup for builds (CJS + ESM + .d.ts)
- Prettier + ESLint flat config
- Node >=20

## Commands

- `npm test` / `test:watch` / `test:coverage`
- `npm run build` / `dev`
- `npm run typecheck`
- `npm run lint` / `lint:fix`
- `npm run format` / `format:check`
- `npm run example:start|build|serve|clear`

## CI / release

- **CI** (`.github/workflows/ci.yml`) runs on push/PR to `main`, matrix Node 20/22, runs build + typecheck + lint + format:check + tests.
- **Release** (`.github/workflows/publish.yml`) triggers when `package.json` lands on `main` (or a `v*` tag is pushed). Uses npm trusted publishing (OIDC, no `NPM_TOKEN`); requires a `Production` GH environment in repo settings. Publishes with provenance + creates a GitHub Release.
- **Version bump** (`.github/workflows/version-bump.yml`) is manually triggered, opens a PR bumping `package.json`. Merging that PR triggers `publish.yml`.
- `husky` + `lint-staged` run prettier + eslint on changed files at commit time via `.husky/pre-commit`.

## Conventions

- TDD where practical; tests live under `tests/` mirroring `src/`. Fixture OMG files under `tests/fixtures/`.
- Concise, well-named functions over comments.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Sentence case in docs.
- Update `CHANGELOG.md` under "Unreleased" for user-facing changes.

## Task tracking

Use GitHub issues for new work. Reference with `Fixes #N` / `Closes #N` in PRs.

## Design notes

- **Build-time only.** The plugin is async at factory time and also runs in `loadContent()` + `getPathsToWatch()`. Compile happens in the factory to guarantee the compiled spec is on disk _before_ any other plugin's `loadContent` runs — this eliminates a race with downstream renderer plugins (`redocusaurus`, `docusaurus-plugin-openapi-docs`) that read from `static/api/` at load time. It also runs in `loadContent` for dev-mode hot-reload triggered by watched file changes. Compile results are published via `setGlobalData` through `contentLoaded`.
- **Hard fail on compile errors.** Per-API parse/compile/write errors throw with a wrapped message identifying the api id. We want the build to fail loudly — the alternative is publishing a stale spec.
- **Stale-output tracking.** The plugin writes `<siteDir>/.omg/manifest.json` listing every file it produced. On the next run, any output present in the manifest but not in the current config is deleted. The manifest lives outside `static/` so it is not copied into the published site.
- **Atomic writes.** Specs are written to `<output>.tmp-<pid>-<ts>` then `rename`d to the final path. An interrupted build can't leave a half-written file for a renderer to parse.
- **Path-traversal guards.** `input`, `output`, and `outputDir` are rejected if they're absolute or resolve outside `siteDir`. Validated at config-time for shape, at factory-time for resolution.
- **Case-sensitive ids.** The `id` regex is `/^[a-z0-9][a-z0-9._-]*$/` (no `/i`) — uppercase ids are rejected to avoid silent collisions on case-insensitive filesystems (macOS APFS, Windows NTFS).
- **Output path convention.** Default `static/api/<id>.yaml` means the compiled file is served at `/api/<id>.yaml` at runtime, so any runtime renderer (Redoc standalone, Swagger UI) can fetch it without extra config.
- **No bundled renderer.** The plugin's one job is compile. Rendering is explicitly the user's choice — keeps the dependency graph small and avoids overlapping with the established OpenAPI-docs plugin ecosystem.
- **Future: remark plugin.** Upstream omg repo has a `remark-omg.ts` that turns inline ` ```omg.* ` code fences into `<OmgBlock>` components (snippet-in-prose use case). Deliberately deferred; tracked as a follow-up.
- **Upstream omg concerns.** Issues whose root cause is in `omg-parser` / `omg-compiler` (caching, include path safety, 0.x API stability) are tracked in `OMG_UPSTREAM_ISSUES.md`, not in this repo's issue tracker.
