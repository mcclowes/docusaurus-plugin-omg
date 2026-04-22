# Contributing

Thanks for your interest in contributing to `docusaurus-plugin-omg`.

## Development setup

```bash
git clone https://github.com/mcclowes/docusaurus-plugin-omg.git
cd docusaurus-plugin-omg
npm install
npm run build
```

## Available scripts

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `npm run build`         | Build the plugin (tsup → `dist/`) |
| `npm run dev`           | Watch mode                        |
| `npm run typecheck`     | TypeScript type-checking          |
| `npm run lint`          | ESLint                            |
| `npm run lint:fix`      | ESLint with auto-fix              |
| `npm run format`        | Prettier                          |
| `npm run format:check`  | Prettier check (used in CI)       |
| `npm test`              | Run tests                         |
| `npm run test:watch`    | Run tests in watch mode           |
| `npm run example:start` | Start the bundled example site    |
| `npm run example:build` | Build the bundled example site    |

## Testing locally

To preview the plugin against a real Docusaurus site, use the bundled example:

```bash
npm run build               # build the plugin first
npm run example:start       # starts examples/sample-site at http://localhost:3000
```

The example site consumes the plugin via `file:../..`, so it picks up your local changes after each `npm run build`.

To test it in another Docusaurus site:

```bash
# from your site directory
npm install ../path/to/docusaurus-plugin-omg
```

## Making changes

1. Create a branch:
   ```bash
   git checkout -b feature/your-change
   ```
2. Write or update tests alongside the code (vitest, under `tests/`).
3. Run the full local CI flow:
   ```bash
   npm run format
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
4. Update `CHANGELOG.md` under "Unreleased" for any user-facing change.
5. Update `README.md` if the public API changes.
6. Update the shared docs site under `~/Development/docusaurus/docusaurus-plugins-docs/docs/omg/` for consumer-observable changes.
7. Commit with a Conventional Commit message (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
8. Open a PR. CI runs on Node 18/20/22 and gates merge.

## Releasing

Releases are automated via GitHub Actions:

1. Run the **Version bump** workflow (Actions tab → `Version bump` → `Run workflow`) and choose `patch`, `minor`, or `major`.
2. Review and merge the bot-opened version-bump PR.
3. The **Release** workflow runs on the merge, tags the commit, publishes to npm with provenance, and creates a GitHub Release.

Pre-release versions (`-alpha`, `-beta`, `-rc`) are published under the `next` dist-tag.

The Release workflow runs in a `Production` GitHub Environment. npm publishing uses [trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers) — no `NPM_TOKEN` secret is required, but the npm package must be configured for trusted publishing in the npm registry settings.

## Pull request guidelines

- Keep PRs focused on a single change.
- Include tests for new functionality.
- Update documentation as needed.
- Update `CHANGELOG.md`.
- Ensure CI passes.

## Reporting issues

When reporting bugs, please include:

- Plugin version
- Docusaurus version
- Node version
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
