import fs from 'fs'
import path from 'path'
import { loadApi } from 'omg-parser'
import { compileToOpenApi, serialize } from 'omg-compiler'
import { logger } from '@docusaurus/logger'
import type { LoadContext, Plugin } from '@docusaurus/types'
import { validateOptions, type ResolvedOmgApi } from './options'
import {
  PLUGIN_NAME,
  type OmgCompileResult,
  type OmgPluginContent,
  type PluginOmgOptions,
} from './types'

const MANIFEST_DIR = '.omg'
const MANIFEST_FILENAME = 'manifest.json'

type CompileTarget = ResolvedOmgApi & {
  inputAbs: string
  outputAbs: string
}

type Manifest = {
  version: 1
  outputs: string[]
}

export default async function pluginOmg(
  context: LoadContext,
  options: PluginOmgOptions = {}
): Promise<Plugin<OmgPluginContent>> {
  const resolved = validateOptions(options)
  const { siteDir } = context

  const apis: CompileTarget[] = resolved.apis.map((api) => {
    const inputAbs = resolveWithinSite(siteDir, api.input, `apis[].input (id=${api.id})`)
    const outputAbs = resolveWithinSite(siteDir, api.output, `apis[].output (id=${api.id})`)
    return { ...api, inputAbs, outputAbs }
  })

  const manifestAbs = path.join(siteDir, MANIFEST_DIR, MANIFEST_FILENAME)

  if (apis.length === 0) {
    logger.warn(
      `[${PLUGIN_NAME}] registered with no \`apis\`, nothing to compile. Remove the plugin or add at least one api.`
    )
  }

  await compileAndEmitAll(apis, manifestAbs)

  return {
    name: PLUGIN_NAME,

    async loadContent(): Promise<OmgPluginContent> {
      const results = await compileAndEmitAll(apis, manifestAbs)
      return { results }
    },

    async contentLoaded({ content, actions }) {
      if (content) actions.setGlobalData(content)
    },

    getPathsToWatch() {
      return apis.map((api) => path.dirname(api.inputAbs))
    },
  }
}

async function compileAndEmitAll(
  apis: CompileTarget[],
  manifestAbs: string
): Promise<OmgCompileResult[]> {
  if (apis.length === 0) return []

  const started = Date.now()
  const results = await Promise.all(apis.map(compileApi))
  await cleanupStaleOutputs(apis, manifestAbs)
  await writeManifest(apis, manifestAbs)

  const durationMs = Date.now() - started
  logger.info(
    `[${PLUGIN_NAME}] compiled ${apis.length} ${apis.length === 1 ? 'api' : 'apis'} in ${durationMs}ms`
  )
  return results
}

async function compileApi(api: CompileTarget): Promise<OmgCompileResult> {
  let parsed
  try {
    parsed = loadApi(api.inputAbs, { noCache: true })
  } catch (err) {
    if (isNodeErrorWithCode(err, 'ENOENT')) {
      throw new Error(`[${PLUGIN_NAME}] input not found for api "${api.id}": ${api.inputAbs}`, {
        cause: err,
      })
    }
    throw wrapError(err, `failed to parse api "${api.id}" from ${api.inputAbs}`)
  }

  let spec
  try {
    spec = compileToOpenApi(parsed)
  } catch (err) {
    throw wrapError(err, `failed to compile api "${api.id}"`)
  }

  const body = serialize(spec, api.format)

  try {
    await writeAtomic(api.outputAbs, body)
  } catch (err) {
    throw wrapError(err, `failed to write api "${api.id}" to ${api.outputAbs}`)
  }

  return {
    id: api.id,
    input: api.input,
    output: api.output,
    format: api.format,
  }
}

async function writeAtomic(absPath: string, body: string): Promise<void> {
  const dir = path.dirname(absPath)
  await fs.promises.mkdir(dir, { recursive: true })
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}`
  await fs.promises.writeFile(tmp, body, 'utf8')
  await fs.promises.rename(tmp, absPath)
}

async function cleanupStaleOutputs(apis: CompileTarget[], manifestAbs: string): Promise<void> {
  const previous = await readManifest(manifestAbs)
  if (!previous) return

  const currentOutputs = new Set(apis.map((a) => path.normalize(a.outputAbs)))
  const stale = previous.outputs.filter((p) => !currentOutputs.has(path.normalize(p)))

  for (const p of stale) {
    try {
      await fs.promises.unlink(p)
      logger.info(`[${PLUGIN_NAME}] removed stale output ${p}`)
    } catch (err) {
      if (!isNodeErrorWithCode(err, 'ENOENT')) {
        logger.warn(`[${PLUGIN_NAME}] could not remove stale output ${p}: ${String(err)}`)
      }
    }
  }
}

async function readManifest(manifestAbs: string): Promise<Manifest | null> {
  try {
    const raw = await fs.promises.readFile(manifestAbs, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && parsed.version === 1 && Array.isArray(parsed.outputs)) {
      return parsed as Manifest
    }
    return null
  } catch (err) {
    if (isNodeErrorWithCode(err, 'ENOENT')) return null
    logger.warn(`[${PLUGIN_NAME}] could not read manifest at ${manifestAbs}: ${String(err)}`)
    return null
  }
}

async function writeManifest(apis: CompileTarget[], manifestAbs: string): Promise<void> {
  const manifest: Manifest = {
    version: 1,
    outputs: apis.map((a) => a.outputAbs),
  }
  await fs.promises.mkdir(path.dirname(manifestAbs), { recursive: true })
  await writeAtomic(manifestAbs, JSON.stringify(manifest, null, 2) + '\n')
}

function resolveWithinSite(siteDir: string, relPath: string, fieldLabel: string): string {
  const abs = path.resolve(siteDir, relPath)
  const siteDirResolved = path.resolve(siteDir)
  const relFromSite = path.relative(siteDirResolved, abs)
  if (relFromSite.startsWith('..') || path.isAbsolute(relFromSite)) {
    throw new Error(`[${PLUGIN_NAME}] ${fieldLabel} resolves outside the site directory: ${abs}`)
  }
  return abs
}

function wrapError(err: unknown, prefix: string): Error {
  const cause = err instanceof Error ? err : new Error(String(err))
  return new Error(`[${PLUGIN_NAME}] ${prefix}: ${cause.message}`, { cause })
}

function isNodeErrorWithCode(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === code
  )
}
