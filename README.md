# docusaurus-plugin-omg

Embed [omg.lol](https://omg.lol/) content in your Docusaurus site — statuses, weblog posts, and pastes — fetched at build time and rendered as static HTML.

No auth, no client-side fetches, no CORS. Just three React components you drop into MDX.

## Install

```bash
npm install docusaurus-plugin-omg
```

## Configure

Add the plugin to `docusaurus.config.js` (or `.ts`) and pre-declare the addresses and pastes you want available:

```js
plugins: [
  [
    'docusaurus-plugin-omg',
    {
      addresses: ['adam'],
      pastes: [{ address: 'adam', paste: 'my-snippet' }],
    },
  ],
]
```

| Option      | Type                   | Default               | Notes                                             |
| ----------- | ---------------------- | --------------------- | ------------------------------------------------- |
| `addresses` | `string[]`             | `[]`                  | omg.lol addresses to fetch latest status + weblog |
| `pastes`    | `{ address, paste }[]` | `[]`                  | Specific pastes to fetch                          |
| `apiBase`   | `string`               | `https://api.omg.lol` | Override for testing or self-hosted forks         |

The plugin pre-fetches at build time because Docusaurus is a static site — it needs to know what to retrieve before MDX is parsed.

## Use

Three theme components are available in any `.md` / `.mdx` file:

```mdx
import OmgStatus from '@theme/OmgStatus'
import OmgWeblogLatest from '@theme/OmgWeblogLatest'
import OmgPaste from '@theme/OmgPaste'

<OmgStatus address="adam" />

<OmgWeblogLatest address="adam" />

<OmgPaste address="adam" paste="my-snippet" language="bash" />
```

### `<OmgStatus address="..." />`

Renders the most recent status from `https://address.status.lol/`, with emoji, content, author handle, and relative time. Renders an unobtrusive empty state if no status exists.

### `<OmgWeblogLatest address="..." showContent={false} />`

Renders the latest weblog post: title, byline, date, and description. Pass `showContent` to also render the post body.

### `<OmgPaste address="..." paste="..." language="..." />`

Renders a paste as a `<pre><code>` block. Pass `language` to opt into Docusaurus's built-in Prism syntax highlighting.

## A note on freshness

Content is fetched once per build. If a status changes, your page won't update until the site rebuilds. Trigger a rebuild from your host (Vercel, Netlify, GH Actions) on a schedule if you want it fresher.

A future release may add an optional client-side refresh.

## Development

```bash
npm install
npm test            # vitest
npm run build       # tsup → dist/
npm run example:start
```

The bundled example site under `examples/docusaurus-v3/` consumes the built `dist/` via a local path.

## License

MIT
