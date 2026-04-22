import path from 'path'
import type { OmgApiInput, OmgOutputFormat, PluginOmgOptions } from './types'

export type ResolvedOmgApi = {
  id: string
  input: string
  output: string
  format: OmgOutputFormat
}

export type ResolvedOmgOptions = {
  apis: ResolvedOmgApi[]
  outputDir: string
  format: OmgOutputFormat
}

const DEFAULT_OUTPUT_DIR = 'static/api'
const DEFAULT_FORMAT: OmgOutputFormat = 'yaml'
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/
const VALID_FORMATS = new Set<OmgOutputFormat>(['yaml', 'json'])

export function validateOptions(options: PluginOmgOptions = {}): ResolvedOmgOptions {
  const apis = options.apis ?? []
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR
  const format = options.format ?? DEFAULT_FORMAT

  if (!Array.isArray(apis)) {
    throw new TypeError('docusaurus-plugin-omg: `apis` must be an array')
  }

  if (typeof outputDir !== 'string' || outputDir.length === 0) {
    throw new TypeError('docusaurus-plugin-omg: `outputDir` must be a non-empty string')
  }
  if (path.isAbsolute(outputDir)) {
    throw new TypeError('docusaurus-plugin-omg: `outputDir` must be relative to the site root')
  }

  if (!VALID_FORMATS.has(format)) {
    throw new TypeError(`docusaurus-plugin-omg: \`format\` must be 'yaml' or 'json'`)
  }

  const resolved = apis.map((api, index) => resolveApi(api, index, outputDir, format))

  const ids = new Set<string>()
  for (const api of resolved) {
    if (ids.has(api.id)) {
      throw new TypeError(`docusaurus-plugin-omg: duplicate api id "${api.id}"`)
    }
    ids.add(api.id)
  }

  const outputs = new Set<string>()
  for (const api of resolved) {
    const key = path.normalize(api.output)
    if (outputs.has(key)) {
      throw new TypeError(
        `docusaurus-plugin-omg: duplicate output path "${api.output}" — two apis would write to the same file`
      )
    }
    outputs.add(key)
  }

  return { apis: resolved, outputDir, format }
}

function resolveApi(
  api: OmgApiInput,
  index: number,
  outputDir: string,
  defaultFormat: OmgOutputFormat
): ResolvedOmgApi {
  if (!api || typeof api !== 'object') {
    throw new TypeError(`docusaurus-plugin-omg: apis[${index}] must be an object`)
  }
  if (typeof api.id !== 'string' || !ID_PATTERN.test(api.id)) {
    throw new TypeError(
      `docusaurus-plugin-omg: apis[${index}].id must match ${ID_PATTERN} (got ${JSON.stringify(api.id)})`
    )
  }
  if (typeof api.input !== 'string' || api.input.length === 0) {
    throw new TypeError(
      `docusaurus-plugin-omg: apis[${index}].input must be a non-empty string path to the root .omg.md file`
    )
  }
  if (path.isAbsolute(api.input)) {
    throw new TypeError(
      `docusaurus-plugin-omg: apis[${index}].input must be relative to the site root (got absolute path ${JSON.stringify(api.input)})`
    )
  }

  if (api.format !== undefined && typeof api.format !== 'string') {
    throw new TypeError(`docusaurus-plugin-omg: apis[${index}].format must be 'yaml' or 'json'`)
  }
  const format = api.format ?? defaultFormat
  if (!VALID_FORMATS.has(format)) {
    throw new TypeError(`docusaurus-plugin-omg: apis[${index}].format must be 'yaml' or 'json'`)
  }

  if (api.output !== undefined && (typeof api.output !== 'string' || api.output.length === 0)) {
    throw new TypeError(
      `docusaurus-plugin-omg: apis[${index}].output must be a non-empty string when provided`
    )
  }
  if (typeof api.output === 'string' && path.isAbsolute(api.output)) {
    throw new TypeError(
      `docusaurus-plugin-omg: apis[${index}].output must be relative to the site root (got absolute path ${JSON.stringify(api.output)})`
    )
  }
  const output =
    typeof api.output === 'string' && api.output.length > 0
      ? api.output
      : path.join(outputDir, `${api.id}.${format}`)

  return {
    id: api.id,
    input: api.input,
    output,
    format,
  }
}
