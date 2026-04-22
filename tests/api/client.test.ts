import { describe, expect, it, vi } from 'vitest'
import { createOmgClient, OmgApiError } from '../../src/api/client'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function makeFetch(handler: (url: string) => Response) {
  return vi.fn(async (url: string) => handler(url))
}

describe('createOmgClient', () => {
  describe('latestStatus', () => {
    it('returns the most recent status', async () => {
      const fetchImpl = makeFetch((url) => {
        expect(url).toBe('https://api.omg.lol/address/adam/statuses/')
        return jsonResponse({
          request: { status_code: 200, success: true },
          response: {
            statuses: [
              {
                id: '1',
                address: 'adam',
                created: '2026-04-22',
                relative_time: 'just now',
                emoji: '🍵',
                content: 'Making tea',
                external_url: null,
              },
            ],
          },
        })
      })
      const client = createOmgClient({ fetchImpl })
      const status = await client.latestStatus('adam')
      expect(status?.content).toBe('Making tea')
      expect(status?.emoji).toBe('🍵')
    })

    it('returns null when there are no statuses', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse({
          request: { status_code: 200, success: true },
          response: { statuses: [] },
        })
      )
      const client = createOmgClient({ fetchImpl })
      expect(await client.latestStatus('empty')).toBeNull()
    })

    it('throws OmgApiError on HTTP error', async () => {
      const fetchImpl = makeFetch(() => new Response('nope', { status: 500 }))
      const client = createOmgClient({ fetchImpl })
      await expect(client.latestStatus('adam')).rejects.toBeInstanceOf(OmgApiError)
    })
  })

  describe('latestWeblogPost', () => {
    it('returns the latest weblog post', async () => {
      const fetchImpl = makeFetch(() =>
        jsonResponse({
          request: { status_code: 200, success: true },
          response: {
            post: {
              address: 'adam',
              date: 1700000000,
              type: 'post',
              status: 'public',
              source: '',
              title: 'Hello',
              content: 'Body',
              description: 'A short description',
              location: null,
              metadata: null,
              output: '<p>Body</p>',
              entry: 'hello',
            },
          },
        })
      )
      const client = createOmgClient({ fetchImpl })
      const post = await client.latestWeblogPost('adam')
      expect(post?.title).toBe('Hello')
      expect(post?.entry).toBe('hello')
    })

    it('returns null on 404', async () => {
      const fetchImpl = makeFetch(() => new Response('missing', { status: 404 }))
      const client = createOmgClient({ fetchImpl })
      expect(await client.latestWeblogPost('adam')).toBeNull()
    })
  })

  describe('paste', () => {
    it('returns paste content', async () => {
      const fetchImpl = makeFetch((url) => {
        expect(url).toBe('https://api.omg.lol/address/adam/pastebin/snippet')
        return jsonResponse({
          request: { status_code: 200, success: true },
          response: { paste: { title: 'Snippet', content: 'echo hi', modified_on: 1 } },
        })
      })
      const client = createOmgClient({ fetchImpl })
      const paste = await client.paste('adam', 'snippet')
      expect(paste?.content).toBe('echo hi')
    })

    it('returns null on 404', async () => {
      const fetchImpl = makeFetch(() => new Response('missing', { status: 404 }))
      const client = createOmgClient({ fetchImpl })
      expect(await client.paste('adam', 'missing')).toBeNull()
    })
  })

  it('caches identical URLs within a client instance', async () => {
    const fetchImpl = makeFetch(() =>
      jsonResponse({
        request: { status_code: 200, success: true },
        response: { statuses: [{ id: '1', address: 'adam', content: 'x' }] },
      })
    )
    const client = createOmgClient({ fetchImpl })
    await client.latestStatus('adam')
    await client.latestStatus('adam')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('respects apiBase override', async () => {
    const fetchImpl = makeFetch((url) => {
      expect(url.startsWith('https://example.test/')).toBe(true)
      return jsonResponse({
        request: { status_code: 200, success: true },
        response: { statuses: [] },
      })
    })
    const client = createOmgClient({ fetchImpl, apiBase: 'https://example.test/' })
    await client.latestStatus('adam')
  })
})
