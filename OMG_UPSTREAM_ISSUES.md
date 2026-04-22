# Upstream OMG issues

Issues surfaced during the code review whose root cause lives in the upstream
[`omg-parser`](https://github.com/omg-gs/omg) / `omg-compiler` packages rather than
in this plugin. Kept here so they are tracked but not conflated with plugin work.

Status: **not yet filed upstream.** Each entry below needs a minimal reproducer
before it becomes an upstream bug report.

---

## 1. `loadApi({ noCache: true })` is the only cache-safe option

**Where:** `src/plugin.ts:85` — `loadApi(api.inputAbs, { noCache: true })`.

**Symptom:** to guarantee rebuilds pick up changes to any file in the OMG source
tree, we have to disable the parser's cache on every call. For large OMG
specs this re-parses the entire tree on every watch rebuild.

**What's needed upstream:**

- A documented invalidation API that accepts a changed-file list, e.g.
  `loadApi(root, { invalidate: [changedPath] })`, so incremental rebuilds are
  cheap.
- Or a published invariant: "the parser's cache is keyed on mtime of the root
  plus every transitively-included file, and is safe to leave on across calls."

**Workaround here:** none. We eat the re-parse cost. Fine for small specs.

---

## 2. OMG includes and path safety (if applicable)

**Status:** unverified. I did not confirm whether OMG source files can reference
sibling or arbitrary filesystem paths (`include: ../../secret.md`-style).

**If they can:** `omg-parser` is the place to enforce a read-sandbox (e.g. reject
includes that resolve outside the spec root, the way most template engines do).
This plugin passes `inputAbs` directly to `loadApi` and applies no sandbox of
its own — we trust the parser.

**What's needed upstream:**

- An explicit statement in `omg-parser`'s README of the filesystem boundary it
  honours.
- If the boundary is "anywhere the process can read," expose an option to tighten
  it (`readRoot: string`).

**Workaround here:** document the trust boundary in this plugin's README (not
yet done — add once upstream position is clear).

---

## 3. Pre-1.0 API surface: `loadApi`, `compileToOpenApi`, `serialize`

**Where:** `src/plugin.ts:3-4` — direct imports of three top-level functions.

**Symptom:** `omg-parser ^0.2.0` and `omg-compiler ^0.2.0` are pinned to 0.2.x.
Any 0.3.0 release anywhere upstream is a breaking change for us. We have no
adapter layer. A downstream user on `omg-parser@0.3.0` installed via hoisting
would fail at runtime.

**What's needed upstream:**

- A 1.0 release with a documented public surface.
- Until then, a clear deprecation policy for the three functions this plugin
  depends on.

**Workaround here (if pain persists):** introduce `src/omg-adapter.ts` that
centralises all calls into the parser and compiler, so future breaking changes
cost one file instead of scattered edits.

---

## 4. Return shape of `compileToOpenApi` is not documented as stable

**Symptom:** our tests now assert the full OpenAPI shape via snapshot, so any
drift in the compiler's output shows up as a test diff. That's good for this
plugin but is load-bearing on the compiler's behaviour being reproducible.

**What's needed upstream:**

- A published guarantee of determinism: given the same OMG source, same compiler
  version, the emitted OpenAPI object is byte-identical (modulo the YAML
  serialiser's whitespace policy).

---

## 5. `serialize(spec, format)` accepts `'yaml' | 'json'` — but is that documented?

**Where:** `src/plugin.ts:102`.

**Status:** tested, works. Not checked against upstream docs. If the public
`serialize` signature is `serialize(spec, options?: SerializeOptions)` with a
different shape in a future minor, we break.

**What's needed upstream:**

- A TypeScript-exported signature for `serialize` that this plugin can consume
  without string literals.

---

## Not upstream issues (worth mentioning so they're not miscategorised)

Everything in `CODE_REVIEW.md`'s section 2 (correctness and edge cases) is a
plugin issue, not an OMG issue. They have been addressed in the current
`Unreleased` changeset:

- Case-sensitive id validation.
- Output collision detection.
- Path-traversal guards.
- Manifest-based stale-output cleanup.
- Atomic writes.
- Parallel compile.
- No TOCTOU.
- Uniform error wrapping.
- Factory-time compile for ordering determinism with other plugins.
