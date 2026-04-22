import { describe, expect, it, vi } from 'vitest'
import pluginOmg from '../src/plugin'
import type { LoadContext } from '@docusaurus/types'
import type { OmgPaste, OmgStatus, OmgWeblogPost } from '../src/api/types'

const fakeContext = {} as LoadContext

function makeClient(
  overrides: Partial<{
    latestStatus: (a: string) => Promise<OmgStatus | null>
    latestWeblogPost: (a: string) => Promise<OmgWeblogPost | null>
    paste: (a: string, p: string) => Promise<OmgPaste | null>
  }> = {}
) {
  return {
    latestStatus: overrides.latestStatus ?? vi.fn(async () => null),
    latestWeblogPost: overrides.latestWeblogPost ?? vi.fn(async () => null),
    paste: overrides.paste ?? vi.fn(async () => null),
  }
}

describe('pluginOmg', () => {
  it('has the expected name', () => {
    const plugin = pluginOmg(fakeContext, {})
    expect(plugin.name).toBe('docusaurus-plugin-omg')
  })

  it('fetches statuses, weblog posts, and pastes for declared inputs', async () => {
    const client = makeClient({
      latestStatus: vi.fn(async (address: string) => ({
        id: '1',
        address,
        created: 'now',
        relative_time: '1m',
        emoji: '🍵',
        content: 'tea',
        external_url: null,
      })),
      latestWeblogPost: vi.fn(async (address: string) => ({
        address,
        date: 1,
        type: 'post',
        status: 'public',
        source: '',
        title: 'hi',
        content: '',
        description: '',
        location: null,
        metadata: null,
        output: '',
        entry: 'hi',
      })),
      paste: vi.fn(async () => ({ title: 'p', content: 'c', modified_on: 1 })),
    })

    const plugin = pluginOmg(
      fakeContext,
      {
        addresses: ['adam', 'beth'],
        pastes: [{ address: 'adam', paste: 'snippet' }],
      },
      { clientFactory: () => client }
    )

    const content = await plugin.loadContent!()
    expect(client.latestStatus).toHaveBeenCalledTimes(2)
    expect(client.latestWeblogPost).toHaveBeenCalledTimes(2)
    expect(client.paste).toHaveBeenCalledWith('adam', 'snippet')
    expect(content?.statuses.adam?.content).toBe('tea')
    expect(content?.weblogPosts.beth?.title).toBe('hi')
    expect(content?.pastes['adam/snippet']?.content).toBe('c')
    expect(typeof content?.fetchedAt).toBe('string')
  })

  it('swallows per-fetch errors and records null for that entry', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const client = makeClient({
      latestStatus: vi.fn(async () => {
        throw new Error('boom')
      }),
    })

    const plugin = pluginOmg(fakeContext, { addresses: ['adam'] }, { clientFactory: () => client })

    const content = await plugin.loadContent!()
    expect(content?.statuses.adam).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('contentLoaded sets global data', async () => {
    const setGlobalData = vi.fn()
    const plugin = pluginOmg(fakeContext, {}, { clientFactory: () => makeClient() })
    const content = await plugin.loadContent!()

    await plugin.contentLoaded!({
      content,
      actions: { setGlobalData } as never,
    } as never)

    expect(setGlobalData).toHaveBeenCalledWith(content)
  })

  it('rejects invalid options at construction time', () => {
    expect(() => pluginOmg(fakeContext, { addresses: ['has spaces'] })).toThrow(/invalid address/)
  })
})
