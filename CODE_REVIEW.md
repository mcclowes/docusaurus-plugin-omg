# Code review — docusaurus-plugin-omg

Principal-engineer onboarding pass, **2026-04-22**, against `main` (commit `be6ae6d`).

Scope: all production code under `src/`, the test suite, CI, release pipeline, example site, and public documentation.

## Tl;dr

This is a small, readable plugin that does one thing. That is its best quality. Under the hood it is a first draft shipped as a `0.1.x` release. The three files in `src/` are correct for the happy path, but the plugin's model of its own lifecycle is naive. It treats "compile OMG → write file" as a pure synchronous step, when in reality it is:

- Disk-writing side effects in `loadContent` (a conceptually pure hook).
- Outputs that survive across runs but are never tracked, so stale files accumulate.
- Serial compilation of independent APIs.
- No ordering guarantee with downstream plugins that read the compiled output.
- Zero output-path safety checks.
- An ID regex that silently allows case-colliding duplicates on case-insensitive filesystems.

The code around this — tests, CI, release — looks grown-up from a distance (matrix builds, OIDC publishing, Husky, flat ESLint config) but the test suite is thin and asserts on substrings rather than shapes. CI never exercises the example site end-to-end, which is the only thing that would catch the lifecycle bugs listed above.

Net: it works for the demo, it will bite the first user with two APIs, a renamed ID, or a renderer plugin that depends on the compiled file existing at load time.

---

## 1. Architecture

### 1.1. `loadContent` is the wrong lifecycle hook for file writes

`src/plugin.ts:30-36` performs `fs.writeFile` inside `loadContent`. Docusaurus treats `loadContent` as the content-gathering phase — in dev mode it can be called repeatedly (config reload, cache invalidation, plugin orchestration). Each call writes the same file to disk. That is mostly harmless, but it reveals the architectural confusion: this plugin is not loading content, it is producing a build artifact.

Idiomatic options:

- `postBuild` for production builds (single deterministic pass after all content is gathered).
- A dev-server middleware or `configureWebpack` hook for `docusaurus start`, so edits to `.omg.md` trigger hot updates without repeated disk writes.
- Or keep `loadContent`, but return the compiled string as content and serve it via a virtual route so `static/` is not touched at all.

As written, the plugin abuses `loadContent` for its side effects, then returns a `content` object that nothing consumes.

**Teaching point:** when a framework gives you named lifecycle hooks, spend an afternoon reading what each one is _intended_ for. Misusing a hook rarely fails loudly — it just makes the plugin awkward to reason about and hostile to extension.

### 1.2. No ordering contract with downstream renderer plugins

The README recommends pairing with `redocusaurus` and `docusaurus-plugin-openapi-docs`, both of which read `specPath: 'static/api/todo.yaml'` at **plugin load time**. Docusaurus runs plugin `loadContent` calls concurrently (via `Promise.all`) with no ordering guarantee. This means on a cold build the renderer plugin may call `readFile` on a path this plugin has not yet written. The example site masks this because the file already exists on disk from a prior run — but a fresh clone, fresh `build/`, fresh renderer install will race.

Fixes in priority order:

1. Move writes to `postBuild` for production, so the generated file is guaranteed before the renderer plugin's own `postBuild` runs — though this still races if the renderer reads at `loadContent`.
2. Document an explicit precondition: "run once with the OMG plugin alone to seed `static/api/`, then add the renderer." This is a user-hostile hack.
3. Ship a companion API that the renderer plugin imports synchronously (i.e. do the compile at config-load time, before any plugin's `loadContent` runs). This is the real fix and matches what `docusaurus-plugin-content-docs` does for sidebars.

None of this is hypothetical. The README's recommended usage pattern will race on a cold build. There are no tests for multi-plugin integration.

### 1.3. `contentLoaded` is not defined, so `OmgPluginContent` is dead weight

`OmgCompileResult` and `OmgPluginContent` are returned from `loadContent` and thrown on the floor. The plugin does not define `contentLoaded`, nor does it create routes, nor does it expose global data. Delete the types, return `void`, and stop pretending the results matter — or actually use them (e.g. emit them via `setGlobalData` so user code can read "what specs got built").

Either direction is fine. The current middle ground is cargo-culting the Docusaurus plugin template.

---

## 2. Correctness and edge cases

Each of these is a real bug, not a stylistic preference.

### 2.1. ID regex is case-insensitive but duplicate detection is case-sensitive

`src/options.ts:19` uses `/^[a-z0-9][a-z0-9._-]*$/i`. The `i` flag accepts `Foo` and `foo` as valid. Line 42-47 puts both into a `Set<string>` keyed by the exact string, so `[{id: 'foo'}, {id: 'Foo'}]` passes validation. On macOS (default APFS case-insensitive) and Windows (default NTFS case-insensitive), both APIs then write to the same filename and silently overwrite each other.

**Fix:** drop the `i` flag, or lowercase the id before the duplicate check, or both. The ID is also used as a filename — case-sensitivity should not be a legal variation.

### 2.2. No output-path collision check

Two APIs with different `id`s but the same explicit `output` silently clobber each other. `validateOptions` checks duplicate `id`s; it does not check duplicate `output` paths. Given that `output` is a user-supplied string, this is easy to hit with a config mistake.

```ts
apis: [
  { id: 'public', input: 'a.omg.md', output: 'static/api/spec.yaml' },
  { id: 'private', input: 'b.omg.md', output: 'static/api/spec.yaml' }, // second one wins, first silently lost
]
```

**Fix:** same pattern as the id check — a `Set<string>` over the resolved output paths.

### 2.3. No path-traversal guard on `output` or `input`

`src/plugin.ts:23-25`: `path.resolve(siteDir, api.output)` — `path.resolve` treats an absolute path as absolute. So `output: '/etc/evil.yaml'` escapes `siteDir`. `..` segments likewise (`output: '../../../../etc/evil.yaml'` resolves outside siteDir).

For a dev tool invoked against trusted config, this is usually labelled "the user shot themselves in the foot." But:

- CI pipelines sometimes run plugin configs generated from semi-trusted sources.
- A user's typo can destroy a file outside the project.
- It costs three lines to prevent.

**Fix:**

```ts
const outputAbs = path.resolve(siteDir, api.output)
if (!outputAbs.startsWith(siteDir + path.sep)) {
  throw new TypeError(`output for api "${api.id}" escapes siteDir`)
}
```

Same for `input` — though the OMG parser may legitimately need to read siblings, so the policy is softer there.

### 2.4. Stale outputs from renamed or removed APIs

Rename `id: 'todo'` to `id: 'tasks'` and the plugin happily writes `static/api/tasks.yaml` — but `static/api/todo.yaml` is still there from the previous run, gets copied into `build/`, and is served at `/api/todo.yaml` alongside the new one. Docusaurus's `static/` directory is not owned by this plugin; the plugin has no record of what it wrote previously.

This is the classic "generators that do not track their own output" bug. The plugin needs a manifest — e.g. `static/api/.omg-manifest.json` listing the files this plugin produced in the last run — and on each run it should diff: new files written, old files removed.

Without this, the plugin is additive-only. Ids and outputs accumulate as cruft forever.

### 2.5. TOCTOU check in `compileApi`

`src/plugin.ts:50-52`:

```ts
if (!fs.existsSync(api.inputAbs)) {
  throw new Error(`[${PLUGIN_NAME}] input not found for api "${api.id}": ${api.inputAbs}`)
}
```

This is a check-then-use race. The file can disappear between the check and `loadApi(api.inputAbs, ...)` on line 56. The extra stat also costs a syscall for the 99% case where the file exists.

**Fix:** remove the `existsSync` entirely. Let `loadApi` throw, then branch on `err.code === 'ENOENT'` in the catch to produce the friendly "input not found" message.

### 2.6. Writes are not atomic

`fs.promises.writeFile(api.outputAbs, body, 'utf8')` on line 70: if the process is SIGINT'd mid-write, the compiled file is half-written and subsequent renderer plugin reads get malformed YAML. The fix is the textbook one — write to `<output>.tmp` and `rename` to final path:

```ts
const tmp = `${api.outputAbs}.tmp-${process.pid}`
await fs.promises.writeFile(tmp, body, 'utf8')
await fs.promises.rename(tmp, api.outputAbs)
```

`rename` is atomic on POSIX and on NTFS within the same volume.

### 2.7. Sequential compile loop where parallel is free

`src/plugin.ts:31-34`:

```ts
for (const api of apis) {
  results.push(await compileApi(api))
}
```

Each `compileApi` is independent — no shared state, no filesystem conflicts between distinct output paths. A user with five APIs pays 5× the latency for no reason. Use `Promise.all(apis.map(compileApi))`.

The parser is synchronous (`loadApi` is sync) so CPU is serialised anyway, but the awaited `fs.promises.writeFile` calls _can_ overlap across APIs. Small win on multi-API setups.

### 2.8. `wrapError` wraps parse/compile but not I/O

`compileApi` uses `wrapError` around `loadApi` and `compileToOpenApi` but not around the `mkdir` / `writeFile`. So a permissions error gives the user a raw `EACCES: permission denied, mkdir '/some/abs/path'` with no hint about which `api.id` caused it. The pattern should be uniform:

```ts
try {
  await fs.promises.mkdir(path.dirname(api.outputAbs), { recursive: true })
  await fs.promises.writeFile(api.outputAbs, body, 'utf8')
} catch (err) {
  throw wrapError(err, `failed to write api "${api.id}" to ${api.outputAbs}`)
}
```

### 2.9. `wrapError` uses non-idiomatic `cause` assignment

```ts
wrapped.cause = cause
```

Modern Node exposes `cause` via the constructor: `new Error(msg, { cause })`. The assignment form works (any prop is writable) but loses engine support for correctly printing the chain in `--enable-source-maps` stack traces under certain Node versions. Cheap fix.

### 2.10. `noCache: true` on every parse

`loadApi(api.inputAbs, { noCache: true })` on line 56. Passing `noCache` on every rebuild defeats any caching the parser has, so incremental rebuilds in `docusaurus start` re-parse the entire OMG tree on every file change. Fine for the sample fixture (two files); painful for a real API with dozens of endpoints.

At minimum, expose this as a plugin option. Better: only set `noCache` when the watched paths have actually changed since last compile.

### 2.11. `getPathsToWatch` returns only the direct parent of each input

`src/plugin.ts:38-40`: watches `path.dirname(api.inputAbs)`, i.e. the directory containing `api.omg.md`. The OMG source layout in the README nests endpoints and partials _under_ that directory, so a shallow watch at the parent works because Docusaurus recursively watches. Good.

However, if a user organises their API with shared partials one level up (e.g. `api/shared/errors.omg.md` referenced from `api/todo/api.omg.md`), changes to `shared/` will not trigger rebuilds. There is no way for a user to supply additional watch paths. Consider `watchPaths?: string[]` as a per-api escape hatch.

### 2.12. ID can start with `-` or `_`? No — but can contain them all

`/^[a-z0-9][a-z0-9._-]*$/i` — first char must be alphanumeric, rest can include `.`, `_`, `-`. This means `my.api.v2` is legal. As a filename this is fine. As a JavaScript identifier (e.g. if it were ever used as a key) it is not. Currently unused as an identifier, so OK. Flag for future change.

### 2.13. Non-strings in option fields silently coerce

`api.output && api.output.length > 0`: if `api.output` is a non-string truthy value (a number, an array), `.length` may be `undefined` (number) or a count (array), and neither is a valid path. The code does not `typeof` check `output` or `format` at the top of `resolveApi`. TypeScript users are safe; JS users are not.

### 2.14. Empty `apis: []` is legal but useless

The plugin accepts zero APIs and does nothing. No warning. Either log a warning ("plugin-omg registered with no apis, nothing to do") or reject it as misconfiguration. Silent no-op is a trap for the user who mistyped `apis` as `apiList`.

### 2.15. `path.resolve(siteDir, api.input/output)` is computed once at factory time

`src/plugin.ts:21-25` resolves paths eagerly in the plugin factory. If `siteDir` or the config mutated between factory construction and `loadContent`, results are stale. In practice Docusaurus does not mutate `siteDir`. Keep in mind for future refactors.

---

## 3. Testing

The suite has 17 tests. They pass. But:

### 3.1. Only asserts substrings, not shape

`tests/plugin.test.ts:44-46`:

```ts
expect(written).toMatch(/^openapi: ["']?3\.1\.0["']?/m)
expect(written).toContain('Sample API')
expect(written).toContain('/health')
```

This tells you the compiled output contains a few expected strings. It tells you nothing about:

- Correct OpenAPI structure (e.g. `paths['/health'].get.responses['200'].content['application/json'].schema` is well-formed).
- Field order / determinism (important for generated diffs).
- No accidentally-leaked internal compiler state.

**Better:** a JSON snapshot of the full spec object. Vitest's `toMatchSnapshot` or `toMatchFileSnapshot` makes regressions from `omg-compiler` upgrades immediately visible.

### 3.2. No coverage of the error paths that matter

Tests covered:

- Missing input file.
- Invalid id.
- Invalid format.
- Duplicate ids.

Tests not covered:

- Parser throws on malformed OMG (would hit the `wrapError(err, 'failed to parse api')` branch).
- Compiler throws on semantically-invalid OMG (the `failed to compile api` branch).
- `mkdir` fails (EACCES, ENOSPC).
- `writeFile` fails mid-write.
- Two apis with the same resolved output path.
- Two apis with case-collided ids (`foo` and `Foo`).
- Absolute or `..`-escaping paths in `input`/`output`.
- `apis: []` (empty).
- Re-running the plugin when an old stale output already exists (the rename-id scenario).
- Multiple apis compiled in parallel (verifies the correctness of the `Promise.all` I recommended above).
- Unicode in ids and paths.

The options tests are reasonable. The plugin tests are 80% happy path.

### 3.3. No integration test of the example site

CI runs `npm test` but never `npm run example:build`. The single real-world smoke test of the entire plugin — rebuild the example site and check the file shows up — is missing. Add a minimal `example:build` step to CI. It's the only test that catches the lifecycle bugs described in section 1.

### 3.4. `plugin.loadContent!()` non-null assertion

Every test uses `plugin.loadContent!()`. That `!` silently passes once `loadContent` becomes optional or renamed in a future Docusaurus release. Replace with an explicit `expect(plugin.loadContent).toBeDefined()` at the top of each describe block, or narrow the type once and reuse.

### 3.5. No coverage gates

`test:coverage` exists as a script but CI does not invoke it. Vitest has no coverage config. There is no floor on coverage in CI. This is a "we said we believe in testing" signal without a "we enforce it" follow-through.

### 3.6. Test fixture sample is minimal

`tests/fixtures/sample-api/` has one endpoint with one response. Parser bugs in handling partials, path templates, request bodies, nested schemas, shared components — none are exercised. At least one "realistic" fixture (many endpoints, partials, auth, servers) would catch 10× more regressions.

---

## 4. Security and safety

This is a build-time tool run in a trusted environment. Threat model is small. Nonetheless:

### 4.1. Arbitrary path writes via `output`

Covered in 2.3. A malicious or careless `output` writes anywhere on disk the Docusaurus process can write. Validate.

### 4.2. Arbitrary path reads via OMG parser

If the OMG syntax supports any sort of `include:` directive, the parser may read arbitrary paths. This plugin applies no sandbox. That is a property of `omg-parser`, not this plugin, but this plugin's documentation should note it as a caveat for users who let untrusted contributors write OMG.

### 4.3. Error messages leak absolute paths

`failed to parse api "todo" from /Users/realname/projects/secret-client/api/todo/api.omg.md` — fine for a local dev tool, awkward in a CI log exposed publicly. Low priority. Strip to paths relative to `siteDir` in error messages.

### 4.4. Release workflow trust boundaries

`.github/workflows/publish.yml`:

- Triggers on `push` to `main` where `package.json` changed **and** on `v*` tag push. The tag push is produced _by the release job itself_ (`git push origin ${{ steps.version.outputs.tag }}`). This is a self-triggering pattern; the "already published" check at line ~40 is the only thing preventing double-publish. That check works, but it's defensive engineering against your own workflow.
- Production GH environment requires a reviewer — good.
- OIDC trusted publishing — excellent, no NPM_TOKEN in the vault.
- `npm ci --ignore-scripts` — correct, prevents supply-chain scripts running at install time.
- However, release does not re-run `typecheck` / `lint` / `format:check`. CI on the merge PR covered it, but release trusts that no post-merge commit slipped in.

Small improvements:

- Add a comment in the workflow explaining _why_ both triggers exist and why the check-then-skip is there. It looks circular to a new engineer.
- Re-run typecheck/lint in release. They cost seconds; they catch the "merged a hotfix directly without CI" case.

### 4.5. `prepublishOnly` runs twice

`prepublishOnly: "npm run build && npm test"` runs on `npm publish`. The release workflow already ran `npm run build && npm test` explicitly. So on every release, build+test runs twice. Wastes ~30s per release. Either remove `prepublishOnly`, or remove the redundant steps from the workflow.

---

## 5. Public API design

### 5.1. Options validation errors are human-friendly, but the exception type is generic

All validation errors are `TypeError`s with a `docusaurus-plugin-omg:` prefix. Fine. A bespoke `OmgPluginOptionsError extends Error` subclass with a `code` property would let consumers branch on failure type. Minor — but the ergonomic gain compounds if the plugin grows.

### 5.2. No programmatic access to "what would be compiled"

A user who wants to hook into the result (to, say, feed it to a renderer programmatically) has no API. The plugin could export a helper:

```ts
export async function compileOmgApi(
  input: string,
  opts?: { format?: 'yaml' | 'json' }
): Promise<string>
```

…which is the core of `compileApi` without the disk write. That one function, publicly exported, would cover the "I want to do something exotic" escape hatch and cost nothing.

### 5.3. `format` type could be a stricter enum

`type OmgOutputFormat = 'yaml' | 'json'` is fine. If you ever want to add `'yml'` as an alias, or gate a feature on format, a discriminated union of format-specific output types would carry more weight. Premature today.

### 5.4. No logging at all

A user running `docusaurus build` sees nothing from this plugin. Compare to first-party Docusaurus plugins that log progress via `@docusaurus/logger`. A single line — "compiled 2 APIs (todo, billing) in 340ms" — is the difference between a plugin that feels present and one that feels broken. ESLint already allows `console.warn` and `console.error`; import the Docusaurus logger instead and use `logger.info`.

### 5.5. `OmgPluginContent` is public but meaningless

If you don't use the return value of `loadContent`, don't export the type. Either wire it into `setGlobalData` / `contentLoaded` so user code can consume compiled results, or delete `OmgPluginContent` and `OmgCompileResult` from `src/types.ts` and the `index.ts` re-export.

---

## 6. TypeScript hygiene

### 6.1. `tsconfig.json` could be stricter

`strict: true` is on. Missing, for a library:

- `noUncheckedIndexedAccess` — catches `arr[i]` being treated as defined when it might be `undefined`.
- `exactOptionalPropertyTypes` — distinguishes `{ x?: string }` from `{ x: string | undefined }`; matters for option types.
- `noImplicitOverride` — forces explicit `override` keywords.
- `noFallthroughCasesInSwitch` — trivial to add.
- `noImplicitReturns` — catches accidental `undefined` returns.

Turn them on, fix the few things that break, ship it.

### 6.2. Non-null assertions in tests

Covered in 3.4.

### 6.3. `Plugin<OmgPluginContent>` generic is unused

Since `contentLoaded` is not defined, the generic carries no type information. `Plugin<void>` or omitting it works and clarifies intent.

### 6.4. `rootDir: "."` in tsconfig with `noEmit: true` is harmless noise

tsup does the emit. The `rootDir` setting has no effect when `noEmit: true`. Either delete it or set `rootDir: "src"` and `noEmit: false` if you intend `tsc` to emit (you don't).

---

## 7. Dependencies and versioning

### 7.1. `peerDependencies: { @docusaurus/core: "^3.0.0" }` is optimistic

`^3.0.0` spans major-feature and breaking-change versions inside the 3.x line. Pin to whatever minor you have actually tested against (`^3.5.0`?). Widening later is free; narrowing later breaks existing installs.

### 7.2. `omg-parser` / `omg-compiler` at `^0.2.0`

Pre-1.0 packages with `^0.2.0` semantics allow only `0.2.x`. Safe. But the plugin API to the parser/compiler is used without any adapter layer, so a `0.3.0` release anywhere upstream immediately breaks this plugin. A 5-line adapter module between this plugin and the upstream packages would let you absorb small upstream API changes without touching the plugin core.

### 7.3. `@docusaurus/types` not declared as `peerDependenciesMeta` optional

`@docusaurus/types` is types-only and therefore optional at runtime. Declare it as such:

```json
"peerDependenciesMeta": {
  "@docusaurus/types": { "optional": true }
}
```

### 7.4. `CHANGELOG.md` is not in the published tarball

`package.json` `files: ["dist", "README.md", "LICENSE"]`. No `CHANGELOG.md`. Consumers on npm cannot see the changelog locally. Include it.

### 7.5. tsup `shims: true` is overkill

`shims: true` in `tsup.config.ts` injects polyfills for `import.meta.url` etc. in the CJS build. For a Docusaurus build-time plugin that never touches `import.meta.url`, this is dead code in the CJS bundle. Try `shims: false` and verify the CJS build still works.

---

## 8. Documentation

### 8.1. README is tidy but misses operational details

Missing:

- Plugin ordering warning for use with `docusaurus-plugin-openapi-docs` (the race in 1.2).
- What happens when you rename an `id` (the stale-output issue in 2.4) — until fixed, document the workaround.
- Error output behaviour (build fails loudly, link to the offending api id).
- Caching / incremental behaviour (currently: none).
- Node version requirement surfaced only in `engines`, not in README.

### 8.2. `CONTRIBUTING.md` promises a "full local CI flow" that is not enforced

The checklist asks contributors to run format/lint/typecheck/test/build locally. CI runs the same steps. Husky + lint-staged runs prettier + eslint on commit. Consider adding a `pre-push` hook running `npm test` to catch "I committed without testing" in the loop where it's still cheap, not in CI.

### 8.3. No architectural doc

A one-page `ARCHITECTURE.md` explaining:

- The two lifecycle hooks used and why.
- The output path convention and why `static/` was chosen.
- The design decision to fail loud on compile errors.
- The explicit non-goals (no renderer, no remark plugin yet).

…would prevent a future contributor re-litigating every decision in CLAUDE.md every few months.

### 8.4. `CLAUDE.md` is excellent

Credit where due — the CLAUDE.md file captures the design intent more clearly than most professional codebases manage. Keep that discipline as the plugin grows.

---

## 9. Example site and repo hygiene

### 9.1. Uncommitted state in examples

`git status` shows `examples/sample-site/api/` and `examples/sample-site/static/` as untracked. `examples/sample-site/build/api/todo.yaml` exists on disk (via the `build/` directory, which _is_ gitignored). The source of truth for the demo (`api/todo/api.omg.md`) should be committed so a fresh clone can `npm run example:start` successfully. `static/api/todo.yaml` should be gitignored because it is generated.

Right now, a fresh clone runs the example and produces the generated output, which is then left as an untracked file forever. Fix via:

- Commit `examples/sample-site/api/` (source).
- Add `examples/sample-site/static/api/` to `.gitignore` (generated).

### 9.2. `.prettierignore` excludes `.claude`

Fine, but undocumented. `.claude` is Anthropic-tooling output and should remain out of the published package. Also ensure it's in `.gitignore` — it is, via `.cache`-adjacent omissions, but explicit is better.

---

## 10. Minor nits

- `src/types.ts:1` exports `PLUGIN_NAME` as a constant. Fine, but 90% of consumers will never need it. Consider not re-exporting via `index.ts`.
- `path.join(outputDir, ...)` inside `resolveApi` returns an OS-native path. On Windows, that produces `static\\api\\todo.yaml` which then gets written to disk using a backslashed path. Docusaurus serves from `static/` by unix convention — confirm this works on Windows before claiming cross-platform support. (It probably does; `path.resolve` normalises.)
- ESLint warns on `no-console` but allows `warn` and `error`. The code uses neither. Consider using `@docusaurus/logger` and removing the rule entirely.
- `tsconfig.json` `"jsx": "react-jsx"` — there is no React code any more. Remove.
- `tsconfig.json` `"allowJs": true` — there is no JS code. Remove.
- `tsconfig.json` `"resolveJsonModule": true` — no JSON imports. Remove.
- `tsup.config.ts` has `format: ['cjs', 'esm']`. Docusaurus v3 is ESM-first and plugins written for Docusaurus v3 commonly ship ESM only. Double bundle is fine but questions are fair: is CJS load ever actually exercised?

---

## 11. What's good

It's short. You can read the entire plugin in ten minutes and understand it. This matters more than anything on the list above — the problems here are addressable precisely because the surface area is small.

Also good:

- Options validation is clear, unit-tested, and fails early.
- Error wrapping in `compileApi` (parse/compile only — not I/O) identifies the offending api id.
- CI matrix (Node 20, 22) is appropriate for engines `>=20`.
- OIDC trusted publishing (no `NPM_TOKEN` in the repo secrets) is 2026 best practice.
- Husky + lint-staged works as intended.
- The decision _not_ to ship a renderer and _not_ to do inline OMG code fences yet is correct. Scope discipline is rare and valuable.

---

## 12. Priority list for the team

Ordered by bang-per-buck.

### Must fix before 1.0

1. **ID case collision** (2.1). Drop the `i` flag. One-line change.
2. **Output path collision** (2.2). Add a `Set` check. One-line addition.
3. **Stale output tracking** (2.4). Manifest file + diff on run. ~40 lines.
4. **Plugin ordering with renderer plugins** (1.2). Either document the workaround loudly or move to a lifecycle hook that actually works. The current README recommendation is broken on cold builds.
5. **Sequential → parallel compile** (2.7). Swap `for ... await` for `Promise.all`. One-line change.
6. **Integration test of example site** (3.3). Add `npm run example:build` to CI. One-line CI change.

### Should fix soon

7. **Path-traversal guard** (2.3).
8. **TOCTOU on existsSync** (2.5).
9. **Atomic writes** (2.6).
10. **`writeFile` / `mkdir` error wrapping** (2.8).
11. **Snapshot test of compiled OpenAPI** (3.1).
12. **Tighten peer dep range** (7.1).
13. **Include `CHANGELOG.md` in published tarball** (7.4).

### Nice to have

14. Expose `compileOmgApi` helper (5.2).
15. Log build progress (5.4).
16. Strict TS flags (6.1).
17. Delete dead `OmgPluginContent` or actually use it (5.5).
18. Delete `shims`, `allowJs`, `jsx`, `resolveJsonModule`, unused `rootDir` from configs (10).
19. Configure coverage reporting and gate CI (3.5).

---

## 13. For the more junior members of the team

A few patterns worth internalising from this review:

**1. "It works for one test case" is not the bar.** The plugin passes 17 tests and works for the sample site. That said nothing about the five real bugs (case collision, output collision, stale files, ordering race, TOCTOU) because none of them are reachable in the fixture. Before calling something done, actively try to break it: two of the thing, one-renamed, one-absolute-path, one-unicode. If you can't think of how to break it, you're not done thinking.

**2. Side effects belong in hooks designed for side effects.** A good heuristic: if the hook name sounds like a getter (`loadContent`, `resolveOptions`, `getPathsToWatch`), it should be free of side effects. If it sounds like an action (`postBuild`, `onExit`), that's where side effects live. Abusing a "loader" hook to write files works until it doesn't — at which point you discover the framework runs it three times and you've multiplied your side effects.

**3. Generators must track their outputs.** Any tool that produces files needs to know what files it produced last time. Without that ledger, you can only add; you can never remove or rename cleanly. A one-file manifest is all it takes.

**4. Atomic writes are free insurance.** `write-tmp-then-rename` is a two-line change that turns a class of "half-written file on SIGINT" bugs into nonexistent bugs. Do it habitually when the output is read by another process.

**5. Test shapes, not substrings.** `expect(yaml).toContain('Sample API')` passes when the YAML is `{"whatever": "Sample API"}` — i.e. when the spec is wrong in a way that still contains the title. Snapshot tests on parsed objects (not strings) catch real regressions for free. Every time you reach for `.toContain`, ask whether `toMatchObject` or `toMatchSnapshot` is more appropriate.

**6. Race conditions don't fail loudly.** The renderer-plugin ordering race described in 1.2 has worked for the author 100% of the time because the sample site always has a prior build. The first user with a fresh clone will file a bug titled "ENOENT on todo.yaml, plugin seems broken." Races fail statistically, which means they fail in production, not in review. Spot them at design time.

**7. If the public API shape can't be summarised in one sentence, it's too big.** `OmgPluginContent` is exported, unused, and documented — three kinds of weight for zero value. The smaller the public surface, the fewer things you can accidentally commit to maintaining across versions.

Good code is the code that is honest about what it does and doesn't do. This codebase is close — it just needs to finish being honest.
