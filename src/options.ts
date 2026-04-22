import type { PasteRef, PluginOmgOptions } from './types'

export type ResolvedOmgOptions = {
  addresses: string[]
  pastes: PasteRef[]
  apiBase: string
}

const ADDRESS_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/i

export function validateOptions(options: PluginOmgOptions = {}): ResolvedOmgOptions {
  const addresses = options.addresses ?? []
  const pastes = options.pastes ?? []
  const apiBase = options.apiBase ?? 'https://api.omg.lol'

  if (!Array.isArray(addresses)) {
    throw new TypeError('docusaurus-plugin-omg: `addresses` must be an array of strings')
  }
  for (const a of addresses) {
    if (typeof a !== 'string' || !ADDRESS_PATTERN.test(a)) {
      throw new TypeError(`docusaurus-plugin-omg: invalid address "${a}"`)
    }
  }

  if (!Array.isArray(pastes)) {
    throw new TypeError('docusaurus-plugin-omg: `pastes` must be an array of {address, paste}')
  }
  for (const p of pastes) {
    if (
      !p ||
      typeof p.address !== 'string' ||
      typeof p.paste !== 'string' ||
      !ADDRESS_PATTERN.test(p.address) ||
      p.paste.length === 0
    ) {
      throw new TypeError(
        `docusaurus-plugin-omg: invalid paste entry ${JSON.stringify(p)}; expected {address, paste}`
      )
    }
  }

  if (typeof apiBase !== 'string' || !/^https?:\/\//.test(apiBase)) {
    throw new TypeError('docusaurus-plugin-omg: `apiBase` must be an http(s) URL')
  }

  return {
    addresses: Array.from(new Set(addresses)),
    pastes: dedupePastes(pastes),
    apiBase,
  }
}

function dedupePastes(pastes: PasteRef[]): PasteRef[] {
  const seen = new Set<string>()
  const out: PasteRef[] = []
  for (const p of pastes) {
    const key = `${p.address}/${p.paste}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ address: p.address, paste: p.paste })
  }
  return out
}
