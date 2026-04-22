# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-22

### Added

- Initial release.
- Build-time fetching of omg.lol statuses, latest weblog posts, and pastes.
- Three theme components: `<OmgStatus>`, `<OmgWeblogLatest>`, `<OmgPaste>`.
- `apiBase` option for self-hosted forks or testing.
- Per-fetch error isolation (one failed lookup doesn't break the whole build).
- TypeScript types exported from package root.
