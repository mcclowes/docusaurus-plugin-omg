import type { ComponentType } from 'react'
import type { OmgPaste, OmgStatus, OmgWeblogPost } from './api/types'

export type PasteRef = {
  address: string
  paste: string
}

export type PluginOmgOptions = {
  /**
   * omg.lol addresses to pre-fetch statuses + latest weblog posts for.
   * Each address listed makes its data available to <OmgStatus address="..."> and
   * <OmgWeblogLatest address="..."> at build time.
   */
  addresses?: string[]
  /**
   * Specific pastes to pre-fetch. Pre-declared because the plugin fetches at build time
   * and needs to know what to retrieve before MDX is parsed.
   */
  pastes?: PasteRef[]
  /**
   * Override the omg.lol API base URL. Useful for self-hosted forks or testing.
   * @default 'https://api.omg.lol'
   */
  apiBase?: string
}

export type OmgPluginContent = {
  statuses: Record<string, OmgStatus | null>
  weblogPosts: Record<string, OmgWeblogPost | null>
  pastes: Record<string, OmgPaste | null>
  fetchedAt: string
}

export type OmgStatusProps = { address: string }
export type OmgWeblogLatestProps = { address: string; showContent?: boolean }
export type OmgPasteProps = { address: string; paste: string; language?: string }

export type OmgStatusComponent = ComponentType<OmgStatusProps>
export type OmgWeblogLatestComponent = ComponentType<OmgWeblogLatestProps>
export type OmgPasteComponent = ComponentType<OmgPasteProps>

export const PLUGIN_NAME = 'docusaurus-plugin-omg'

export function pasteKey(address: string, paste: string): string {
  return `${address}/${paste}`
}
