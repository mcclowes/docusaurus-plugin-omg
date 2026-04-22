---
id: intro
title: docusaurus-plugin-omg demo
sidebar_position: 1
---

# docusaurus-plugin-omg demo

This example site uses [docusaurus-plugin-omg](https://github.com/mcclowes/docusaurus-plugin-omg)
to compile an [OMG](https://omg.gs/) spec to OpenAPI 3.1 at build time.

## Source

The OMG source lives under [`api/todo/`](https://github.com/mcclowes/docusaurus-plugin-omg/tree/main/examples/sample-site/api/todo):

```
api/todo/
  api.omg.md                         # root: name, version, baseUrl
  endpoints/
    list-todos.omg.md                # GET /todos
    create-todo.omg.md               # POST /todos
```

## Plugin config

```ts title="docusaurus.config.ts"
import type { PluginOmgOptions } from 'docusaurus-plugin-omg'

const omgOptions: PluginOmgOptions = {
  apis: [{ id: 'todo', input: 'api/todo/api.omg.md' }],
}

export default {
  plugins: [['docusaurus-plugin-omg', omgOptions]],
}
```

## Output

After `docusaurus build` the compiled spec lives at
[`/api/todo.yaml`](/api/todo.yaml). Same URL in `docusaurus start`.

## Rendering

The plugin is deliberately thin: it does not ship an API-docs UI. Point any
OpenAPI renderer at the compiled file. Popular choices:

- [`redocusaurus`](https://github.com/rohit-gohri/redocusaurus) — Redoc inside Docusaurus.
- [`docusaurus-plugin-openapi-docs`](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs) — MDX page per endpoint with try-it-out.
- Standalone [Swagger UI](https://swagger.io/tools/swagger-ui/) or [Redoc](https://github.com/Redocly/redoc).
