import type { OmgApiResponse, OmgPaste, OmgStatus, OmgWeblogPost } from './types'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type ClientOptions = {
  apiBase?: string
  fetchImpl?: FetchLike
}

const DEFAULT_API_BASE = 'https://api.omg.lol'

export class OmgApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message)
    this.name = 'OmgApiError'
  }
}

export function createOmgClient(options: ClientOptions = {}) {
  const apiBase = (options.apiBase ?? DEFAULT_API_BASE).replace(/\/+$/, '')
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init))
  const cache = new Map<string, unknown>()

  async function get<T>(path: string): Promise<T> {
    const url = `${apiBase}${path}`
    if (cache.has(url)) return cache.get(url) as T

    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      throw new OmgApiError(`omg.lol API ${res.status} for ${url}`, res.status, url)
    }
    const body = (await res.json()) as OmgApiResponse<T>
    if (!body?.request?.success) {
      throw new OmgApiError(
        body?.response?.message ?? `omg.lol API returned unsuccessful response for ${url}`,
        body?.request?.status_code,
        url
      )
    }
    cache.set(url, body.response)
    return body.response
  }

  return {
    async latestStatus(address: string): Promise<OmgStatus | null> {
      const data = await get<{ statuses: OmgStatus[] }>(
        `/address/${encodeURIComponent(address)}/statuses/`
      )
      return data.statuses?.[0] ?? null
    },

    async latestWeblogPost(address: string): Promise<OmgWeblogPost | null> {
      try {
        const data = await get<{ post: OmgWeblogPost }>(
          `/address/${encodeURIComponent(address)}/weblog/post/latest`
        )
        return data.post ?? null
      } catch (err) {
        if (err instanceof OmgApiError && err.status === 404) return null
        throw err
      }
    },

    async paste(address: string, paste: string): Promise<OmgPaste | null> {
      try {
        const data = await get<{ paste: OmgPaste }>(
          `/address/${encodeURIComponent(address)}/pastebin/${encodeURIComponent(paste)}`
        )
        return data.paste ?? null
      } catch (err) {
        if (err instanceof OmgApiError && err.status === 404) return null
        throw err
      }
    },
  }
}

export type OmgClient = ReturnType<typeof createOmgClient>
