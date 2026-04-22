import path from 'path'
import { fileURLToPath } from 'url'
import type { LoadContext, Plugin } from '@docusaurus/types'
import { createOmgClient, type ClientOptions } from './api/client'
import { validateOptions } from './options'
import { PLUGIN_NAME, pasteKey, type OmgPluginContent, type PluginOmgOptions } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type InternalPluginDeps = {
  clientFactory?: (opts: ClientOptions) => ReturnType<typeof createOmgClient>
}

export default function pluginOmg(
  _context: LoadContext,
  options: PluginOmgOptions = {},
  deps: InternalPluginDeps = {}
): Plugin<OmgPluginContent> {
  const resolved = validateOptions(options)
  const factory = deps.clientFactory ?? createOmgClient

  return {
    name: PLUGIN_NAME,

    async loadContent(): Promise<OmgPluginContent> {
      const client = factory({ apiBase: resolved.apiBase })

      const statusEntries = await Promise.all(
        resolved.addresses.map(async (address) => {
          const status = await safe(() => client.latestStatus(address), `status for ${address}`)
          return [address, status] as const
        })
      )

      const weblogEntries = await Promise.all(
        resolved.addresses.map(async (address) => {
          const post = await safe(
            () => client.latestWeblogPost(address),
            `weblog for ${address}`
          )
          return [address, post] as const
        })
      )

      const pasteEntries = await Promise.all(
        resolved.pastes.map(async ({ address, paste }) => {
          const data = await safe(
            () => client.paste(address, paste),
            `paste ${address}/${paste}`
          )
          return [pasteKey(address, paste), data] as const
        })
      )

      return {
        statuses: Object.fromEntries(statusEntries),
        weblogPosts: Object.fromEntries(weblogEntries),
        pastes: Object.fromEntries(pasteEntries),
        fetchedAt: new Date().toISOString(),
      }
    },

    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content)
    },

    getThemePath() {
      return path.join(__dirname, 'theme')
    },

    getTypeScriptThemePath() {
      return path.resolve(__dirname, '..', 'src', 'theme')
    },
  }
}

async function safe<T>(fn: () => Promise<T | null>, label: string): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[docusaurus-plugin-omg] failed to fetch ${label}: ${msg}`)
    return null
  }
}
