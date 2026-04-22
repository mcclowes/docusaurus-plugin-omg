import { describe, expect, it } from 'vitest'
import { validateOptions } from '../src/options'

describe('validateOptions', () => {
  it('applies defaults', () => {
    const opts = validateOptions()
    expect(opts).toEqual({
      addresses: [],
      pastes: [],
      apiBase: 'https://api.omg.lol',
    })
  })

  it('dedupes addresses and pastes', () => {
    const opts = validateOptions({
      addresses: ['adam', 'adam', 'beth'],
      pastes: [
        { address: 'adam', paste: 'x' },
        { address: 'adam', paste: 'x' },
      ],
    })
    expect(opts.addresses).toEqual(['adam', 'beth'])
    expect(opts.pastes).toHaveLength(1)
  })

  it('rejects non-array addresses', () => {
    expect(() => validateOptions({ addresses: 'adam' as unknown as string[] })).toThrow(/array/)
  })

  it('rejects malformed addresses', () => {
    expect(() => validateOptions({ addresses: ['has spaces'] })).toThrow(/invalid address/)
  })

  it('rejects malformed paste entries', () => {
    expect(() =>
      validateOptions({ pastes: [{ address: 'adam', paste: '' }] })
    ).toThrow(/invalid paste/)
  })

  it('rejects non-http apiBase', () => {
    expect(() => validateOptions({ apiBase: 'ftp://x' })).toThrow(/http/)
  })
})
