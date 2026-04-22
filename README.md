# docusaurus-plugin-omg

Docusaurus v3 plugin that compiles [OMG](https://omg.gs/) (OpenAPI Markdown Grammar) source files to OpenAPI 3.1 at build time, ready for any OpenAPI renderer.

OMG is a Markdown DSL for writing API specs — roughly 6× shorter than raw OpenAPI YAML. This plugin runs the `omg-parser` + `omg-compiler` pipeline as part of `docusaurus build` / `docusaurus start` and drops the resulting `.yaml` (or `.json`) on disk so a renderer plugin — [`redocusaurus`](https://github.com/rohit-gohri/redocusaurus), [`docusaurus-plugin-openapi-docs`](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs), standalone Swagger UI — can pick it up.

Deliberately thin: no bundled renderer, no opinions about how the spec gets displayed.

## Install

```bash
npm install docusaurus-plugin-omg
```

## Configure

```ts title="docusaurus.config.ts"
import type { PluginOmgOptions } from 'docusaurus-plugin-omg'

const omgOptions: PluginOmgOptions = {
  apis: [
    { id: 'todo', input: 'api/todo/api.omg.md' },
    { id: 'billing', input: 'api/billing/api.omg.md', format: 'json' },
  ],
}

export default {
  plugins: [['docusaurus-plugin-omg', omgOptions]],
}
```

### Options

| Option      | Type               | Default        | Notes                                                        |
| ----------- | ------------------ | -------------- | ------------------------------------------------------------ |
| `apis`      | `OmgApiInput[]`    | `[]`           | APIs to compile.                                             |
| `outputDir` | `string`           | `'static/api'` | Default directory for compiled specs, relative to site root. |
| `format`    | `'yaml' \| 'json'` | `'yaml'`       | Default output format for APIs that don't override it.       |

### `OmgApiInput`

| Field    | Type               | Default                     | Notes                                                                                         |
| -------- | ------------------ | --------------------------- | --------------------------------------------------------------------------------------------- |
| `id`     | `string`           | —                           | Required. Used as the compiled filename when `output` is not set; also surfaced in log lines. |
| `input`  | `string`           | —                           | Required. Path to the root `.omg.md` file, relative to the Docusaurus site root.              |
| `output` | `string`           | `<outputDir>/<id>.<format>` | Output path, relative to the site root.                                                       |
| `format` | `'yaml' \| 'json'` | plugin-level `format`       | Overrides the default for this API only.                                                      |

With the default `outputDir` of `static/api`, the compiled spec lands in your site's `static/` directory and is served at `/api/<id>.yaml` (or `.json`) at runtime. Any renderer can fetch that URL, or a build-time renderer plugin can read the file directly.

## OMG source layout

OMG specs are a root `api.omg.md` plus per-endpoint files in `endpoints/` (and optional `partials/`):

```
api/todo/
  api.omg.md                  # info: name, version, baseUrl, auth, servers
  endpoints/
    list-todos.omg.md         # method, path, body, responses
    create-todo.omg.md
  partials/
    errors.omg.md             # shared response fragments
```

The plugin's `input` points at the root `api.omg.md`; the parser walks the rest.

See the [OMG syntax reference](https://omg.gs/docs/syntax) for the source format.

## When compilation runs

The plugin compiles at two points:

1. **Plugin initialisation** (before any other plugin's `loadContent`). This guarantees the compiled spec exists on disk before renderer plugins like `redocusaurus` or `docusaurus-plugin-openapi-docs` try to read it — you can safely declare the OMG plugin alongside a renderer without worrying about plugin order.
2. **On each `loadContent`** (for hot reload during `docusaurus start`).

Compile errors fail the build loudly with a message identifying the offending api id.

## Watch mode

During `docusaurus start` the plugin reports the parent directory of each `input` via `getPathsToWatch`, so edits to `.omg.md` files trigger a rebuild.

## Stale outputs

The plugin tracks the files it writes in `<siteDir>/.omg/manifest.json`. When you rename or remove an api, the previously-compiled spec is deleted on the next run. Add `.omg/` to your `.gitignore`.

## Handing off to a renderer

### Redocusaurus (Redoc)

```ts
plugins: [
  ['docusaurus-plugin-omg', { apis: [{ id: 'todo', input: 'api/todo/api.omg.md' }] }],
],
presets: [
  ['redocusaurus', {
    specs: [{ id: 'todo', spec: 'static/api/todo.yaml', route: '/api/todo/' }],
  }],
],
```

### docusaurus-plugin-openapi-docs (MDX page per endpoint)

```ts
plugins: [
  ['docusaurus-plugin-omg', { apis: [{ id: 'todo', input: 'api/todo/api.omg.md' }] }],
  ['docusaurus-plugin-openapi-docs', {
    id: 'api',
    docsPluginId: 'classic',
    config: {
      todo: {
        specPath: 'static/api/todo.yaml',
        outputDir: 'docs/api/todo',
        sidebarOptions: { groupPathsBy: 'tag' },
      },
    },
  }],
],
```

Both plugins will pick up the file the OMG plugin just wrote. Run `docusaurus-plugin-openapi-docs`'s `gen-api-docs` script after each change.

## Example site

```bash
npm install
npm run build            # build the plugin once
npm run example:start    # starts examples/sample-site at http://localhost:3000
```

## License

MIT
