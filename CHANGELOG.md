# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Stale-output cleanup: the plugin now tracks compiled files in `<siteDir>/.omg/manifest.json` and removes outputs from previous runs when an api is renamed or removed.
- Parallel compilation of declared apis via `Promise.all`.
- Atomic writes (write-to-tmp-then-rename) so interrupted builds can't leave half-written specs on disk.
- Path-traversal guards: `input`, `output`, and `outputDir` are rejected if they resolve outside the site directory or are absolute.
- Duplicate-output-path validation: two apis that would write to the same file are rejected at configuration time.
- Snapshot test of the full compiled OpenAPI shape.
- Example-site integration build step in CI.
- Build-time progress logging via `@docusaurus/logger`.

### Changed

- **Breaking (for TypeScript consumers using advanced typings):** the plugin factory is now `async` (returns `Promise<Plugin>`) so that OMG sources are compiled _before_ any other plugin's `loadContent` runs. This removes a race with downstream renderer plugins (`redocusaurus`, `docusaurus-plugin-openapi-docs`) on cold builds. Most consumers using the standard `plugins: [['docusaurus-plugin-omg', opts]]` form need no changes.
- `id` pattern is now case-sensitive (`/^[a-z0-9][a-z0-9._-]*$/`) — uppercase ids are rejected to avoid silent filename collisions on case-insensitive filesystems (macOS APFS, Windows NTFS).
- Input-file existence check replaced with catching `ENOENT` from `omg-parser` (removes a TOCTOU race).
- `mkdir` / `writeFile` errors are now wrapped with the api id, matching the parse/compile error format.
- Peer dependency range tightened to `@docusaurus/core ^3.5.0` and adds `@docusaurus/logger ^3.5.0`.
- Stricter TypeScript (`noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).

### Fixed

- Fresh-clone renderer-plugin race where a downstream plugin's `loadContent` would run before the OMG spec was on disk.
- Case-colliding ids on macOS/Windows silently overwriting each other's output.

## [0.1.1] - 2026-04-22

### Added

- Initial release.
- Docusaurus v3 plugin that compiles [OMG](https://omg.gs/) (OpenAPI Markdown Grammar) sources to OpenAPI 3.1 at build time, via `omg-parser` + `omg-compiler`.
- Options: `apis: [{ id, input, output?, format? }]`, `outputDir` (default `static/api`), `format` (default `yaml`).
- `getPathsToWatch()` integration so `.omg.md` edits trigger rebuilds under `docusaurus start`.
- Build-time errors fail the build with a message identifying the offending api id.

### Note

- `0.1.0` was published accidentally against the wrong upstream service (omg.lol) and should not be used. Install `^0.1.1`.
