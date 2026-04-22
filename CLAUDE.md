# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

`docusaurus-plugin-omg` — Docusaurus v3 plugin that embeds [omg.lol](https://omg.lol/) content (statuses, weblog posts, pastes) in MDX. Fetches at build time using the public, unauthenticated omg.lol API.

- Entry: `src/index.ts` re-exports the plugin factory and types.
- Lifecycle: `src/plugin.ts` uses `loadContent()` → `setGlobalData()` → `getThemePath()`.
- API client: `src/api/client.ts` (typed, in-memory cache, swallows 404s as `null`).
- Theme components: `src/theme/{OmgStatus,OmgWeblogLatest,OmgPaste}/`.
- Example site: `examples/docusaurus-v3/`, consumes built `dist/` via local path.

## Stack

- TypeScript, React 18 peer, Docusaurus v3 peer
- Vitest + Testing Library
- tsup for builds (CJS + ESM + .d.ts)
- Prettier + ESLint flat config
- Node >=18

## Commands

- `npm test` / `test:watch` / `test:coverage`
- `npm run build` / `dev`
- `npm run typecheck`
- `npm run lint` / `lint:fix`
- `npm run example:start|build|serve|clear`

## Conventions

- TDD where practical; tests live under `tests/` mirroring `src/`.
- Concise, well-named functions over comments.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Sentence case in docs.
- Update `CHANGELOG.md` under "Unreleased" for user-facing changes.

## Task tracking

Use GitHub issues for new work. Reference with `Fixes #N` / `Closes #N` in PRs.

## Shared docs site

User-facing changes here should also propagate to `~/Development/docusaurus/docusaurus-plugins-docs/docs/omg/` (separate repo).

After a change a consumer can observe (new option, new component, changed default, renamed export, breaking behavior), update both:

- `README.md` here (canonical reference)
- `docs/omg/getting-started.md` and `docs/omg/configuration.md` in `docusaurus-plugins-docs`

Internal refactors and test-only changes don't need docs-site updates.

## Design notes

- **Build-time only by design.** The plugin uses `loadContent()` and `setGlobalData()`. There is no client-side fetching. A future hybrid mode is tracked separately.
- **Pre-declared addresses/pastes.** The plugin can't scan MDX for component usage before MDX is parsed, so the user lists what to fetch in plugin options.
- **Failure-soft.** Per-fetch errors warn and store `null`; one bad address doesn't break the build.
- **Untyped omg.lol API surface.** Response shapes are inferred from omg.lol docs and may need updating if upstream changes.
