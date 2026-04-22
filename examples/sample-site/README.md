# Plugin omg sample site

A minimal Docusaurus site that showcases `docusaurus-plugin-omg` end-to-end.

## Run locally

From the repo root:

```bash
npm install
npm run build           # build the plugin first
npm run example:start   # http://localhost:3000
```

Or directly inside this folder once the parent `dist/` exists:

```bash
cd examples/sample-site
npm install
npm start
```

## What's demonstrated

- Plugin configured in `docusaurus.config.ts` with `addresses: ['adam']`.
- `docs/intro.mdx` uses `<OmgStatus>`, `<OmgWeblogLatest>`, and `<OmgPaste>` inline.
- Build-time fetching: open the network tab — there are no client requests to omg.lol.

## Customize

- Swap `'adam'` for your own omg.lol address.
- Add pastes via the plugin's `pastes` option, then reference them with `<OmgPaste address="..." paste="..." />`.

## Deploy preview

`vercel.json` is configured so `vercel --prod` (or a Vercel project pointed at this subdirectory) will build the plugin from source and then build this site.
