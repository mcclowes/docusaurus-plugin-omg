import fs from 'fs'
import os from 'os'
import path from 'path'
import { parse as parseYaml } from 'yaml'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LoadContext } from '@docusaurus/types'
import pluginOmg from '../src/plugin'

const FIXTURE_SRC = path.resolve(__dirname, 'fixtures/sample-api')
const MANIFEST_REL = '.omg/manifest.json'

function makeContext(siteDir: string): LoadContext {
  return { siteDir } as LoadContext
}

describe('pluginOmg', () => {
  let siteDir: string

  beforeEach(() => {
    siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omg-plugin-'))
    fs.cpSync(FIXTURE_SRC, path.join(siteDir, 'api/sample'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(siteDir, { recursive: true, force: true })
  })

  it('has the expected name', async () => {
    const plugin = await pluginOmg(makeContext(siteDir), {})
    expect(plugin.name).toBe('docusaurus-plugin-omg')
  })

  it('compiles a declared api at factory time (before loadContent)', async () => {
    await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md' }],
    })
    // File exists on disk immediately after factory, without calling loadContent.
    const outPath = path.resolve(siteDir, 'static/api/sample.yaml')
    expect(fs.existsSync(outPath)).toBe(true)
    const written = fs.readFileSync(outPath, 'utf8')
    expect(written).toMatch(/^openapi: ["']?3\.1\.0["']?/m)
    expect(written).toContain('Sample API')
    expect(written).toContain('/health')
  })

  it('loadContent returns compile results', async () => {
    const plugin = await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md' }],
    })
    const content = await plugin.loadContent!()
    expect(content?.results).toHaveLength(1)
    expect(content!.results[0]!).toEqual({
      id: 'sample',
      input: 'api/sample/api.omg.md',
      output: path.join('static/api', 'sample.yaml'),
      format: 'yaml',
    })
  })

  it('writes JSON when format is json', async () => {
    const plugin = await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md', format: 'json' }],
    })
    const content = await plugin.loadContent!()
    const outPath = path.resolve(siteDir, content!.results[0]!.output)
    const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'))
    expect(parsed.openapi).toBe('3.1.0')
    expect(parsed.info.title).toBe('Sample API')
  })

  it('matches a stable OpenAPI shape snapshot', async () => {
    const plugin = await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md' }],
    })
    const content = await plugin.loadContent!()
    const yaml = fs.readFileSync(path.resolve(siteDir, content!.results[0]!.output), 'utf8')
    const spec = parseYaml(yaml)
    expect(spec).toMatchSnapshot()
  })

  it('respects an explicit output path', async () => {
    const plugin = await pluginOmg(makeContext(siteDir), {
      apis: [
        {
          id: 'sample',
          input: 'api/sample/api.omg.md',
          output: 'static/custom/openapi.yaml',
        },
      ],
    })
    const content = await plugin.loadContent!()
    expect(content!.results[0]!.output).toBe('static/custom/openapi.yaml')
    expect(fs.existsSync(path.join(siteDir, 'static/custom/openapi.yaml'))).toBe(true)
  })

  it('compiles multiple apis in parallel', async () => {
    fs.cpSync(FIXTURE_SRC, path.join(siteDir, 'api/other'), { recursive: true })
    const plugin = await pluginOmg(makeContext(siteDir), {
      apis: [
        { id: 'sample', input: 'api/sample/api.omg.md' },
        { id: 'other', input: 'api/other/api.omg.md' },
      ],
    })
    const content = await plugin.loadContent!()
    expect(content!.results).toHaveLength(2)
    expect(fs.existsSync(path.join(siteDir, 'static/api/sample.yaml'))).toBe(true)
    expect(fs.existsSync(path.join(siteDir, 'static/api/other.yaml'))).toBe(true)
  })

  it('removes stale outputs when an api is renamed', async () => {
    await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md' }],
    })
    expect(fs.existsSync(path.join(siteDir, 'static/api/sample.yaml'))).toBe(true)

    fs.cpSync(path.join(siteDir, 'api/sample'), path.join(siteDir, 'api/renamed'), {
      recursive: true,
    })
    await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'renamed', input: 'api/renamed/api.omg.md' }],
    })

    expect(fs.existsSync(path.join(siteDir, 'static/api/renamed.yaml'))).toBe(true)
    expect(fs.existsSync(path.join(siteDir, 'static/api/sample.yaml'))).toBe(false)
  })

  it('writes a manifest listing produced outputs', async () => {
    await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md' }],
    })
    const manifestPath = path.join(siteDir, MANIFEST_REL)
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    expect(manifest.version).toBe(1)
    expect(manifest.outputs).toHaveLength(1)
    expect(manifest.outputs[0]).toBe(path.resolve(siteDir, 'static/api/sample.yaml'))
  })

  it('throws at factory time when the input file is missing', async () => {
    await expect(
      pluginOmg(makeContext(siteDir), {
        apis: [{ id: 'missing', input: 'api/does-not-exist/api.omg.md' }],
      })
    ).rejects.toThrow(/input not found/)
  })

  it('rejects input paths that escape the site directory', async () => {
    await expect(
      pluginOmg(makeContext(siteDir), {
        apis: [{ id: 'escape', input: '../outside/api.omg.md' }],
      })
    ).rejects.toThrow(/outside the site directory/)
  })

  it('rejects output paths that escape the site directory', async () => {
    await expect(
      pluginOmg(makeContext(siteDir), {
        apis: [
          {
            id: 'escape',
            input: 'api/sample/api.omg.md',
            output: '../outside.yaml',
          },
        ],
      })
    ).rejects.toThrow(/outside the site directory/)
  })

  it('getPathsToWatch returns parent dir of each input', async () => {
    const plugin = await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md' }],
    })
    const watched = plugin.getPathsToWatch!()
    expect(watched).toEqual([path.resolve(siteDir, 'api/sample')])
  })

  it('rejects invalid options at construction time', async () => {
    await expect(
      pluginOmg(makeContext(siteDir), { apis: [{ id: 'has spaces', input: 'x.omg.md' }] })
    ).rejects.toThrow(/id must match/)
  })

  it('writes files atomically (no leftover tmp files)', async () => {
    await pluginOmg(makeContext(siteDir), {
      apis: [{ id: 'sample', input: 'api/sample/api.omg.md' }],
    })
    const entries = fs.readdirSync(path.join(siteDir, 'static/api'))
    expect(entries.some((e) => e.includes('.tmp-'))).toBe(false)
  })
})
