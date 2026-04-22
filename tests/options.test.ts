import { describe, expect, it } from 'vitest'
import { validateOptions } from '../src/options'

describe('validateOptions', () => {
  it('applies defaults with no apis', () => {
    const opts = validateOptions()
    expect(opts.apis).toEqual([])
    expect(opts.outputDir).toBe('static/api')
    expect(opts.format).toBe('yaml')
  })

  it('derives output path from id, outputDir and format', () => {
    const opts = validateOptions({
      apis: [{ id: 'todo', input: 'api/todo/api.omg.md' }],
    })
    expect(opts.apis[0]!.output).toMatch(/^static\/api\/todo\.yaml$/)
    expect(opts.apis[0]!.format).toBe('yaml')
  })

  it('respects per-api format override', () => {
    const opts = validateOptions({
      apis: [{ id: 'todo', input: 'api/todo/api.omg.md', format: 'json' }],
    })
    expect(opts.apis[0]!.output).toMatch(/^static\/api\/todo\.json$/)
    expect(opts.apis[0]!.format).toBe('json')
  })

  it('honours plugin-level format default', () => {
    const opts = validateOptions({
      format: 'json',
      apis: [{ id: 'todo', input: 'api/todo/api.omg.md' }],
    })
    expect(opts.apis[0]!.format).toBe('json')
    expect(opts.apis[0]!.output).toMatch(/^static\/api\/todo\.json$/)
  })

  it('uses explicit output path verbatim when provided', () => {
    const opts = validateOptions({
      apis: [{ id: 'todo', input: 'api/todo/api.omg.md', output: 'custom/path.yaml' }],
    })
    expect(opts.apis[0]!.output).toBe('custom/path.yaml')
  })

  it('rejects non-array apis', () => {
    expect(() => validateOptions({ apis: 'nope' as unknown as never })).toThrow(/array/)
  })

  it('rejects apis with invalid id', () => {
    expect(() => validateOptions({ apis: [{ id: 'has spaces', input: 'x.omg.md' }] })).toThrow(
      /id must match/
    )
  })

  it('rejects uppercase ids so filenames collide deterministically', () => {
    expect(() => validateOptions({ apis: [{ id: 'FooBar', input: 'x.omg.md' }] })).toThrow(
      /id must match/
    )
  })

  it('rejects apis with empty input', () => {
    expect(() => validateOptions({ apis: [{ id: 'todo', input: '' }] })).toThrow(/input/)
  })

  it('rejects absolute input paths', () => {
    expect(() =>
      validateOptions({ apis: [{ id: 'todo', input: '/etc/secrets/api.omg.md' }] })
    ).toThrow(/relative to the site root/)
  })

  it('rejects absolute output paths', () => {
    expect(() =>
      validateOptions({
        apis: [{ id: 'todo', input: 'api/todo/api.omg.md', output: '/tmp/out.yaml' }],
      })
    ).toThrow(/relative to the site root/)
  })

  it('rejects absolute outputDir', () => {
    expect(() => validateOptions({ outputDir: '/var/www/api' })).toThrow(
      /relative to the site root/
    )
  })

  it('rejects non-string output', () => {
    expect(() =>
      validateOptions({
        apis: [{ id: 'todo', input: 'x.omg.md', output: 123 as unknown as string }],
      })
    ).toThrow(/output must be a non-empty string/)
  })

  it('rejects unknown format', () => {
    expect(() =>
      validateOptions({
        apis: [{ id: 'todo', input: 'x.omg.md', format: 'toml' as never }],
      })
    ).toThrow(/yaml.*json/)
  })

  it('rejects duplicate ids', () => {
    expect(() =>
      validateOptions({
        apis: [
          { id: 'todo', input: 'a.omg.md' },
          { id: 'todo', input: 'b.omg.md' },
        ],
      })
    ).toThrow(/duplicate api id/)
  })

  it('rejects two apis that would write to the same output path', () => {
    expect(() =>
      validateOptions({
        apis: [
          { id: 'one', input: 'a.omg.md', output: 'static/api/shared.yaml' },
          { id: 'two', input: 'b.omg.md', output: 'static/api/shared.yaml' },
        ],
      })
    ).toThrow(/duplicate output path/)
  })
})
