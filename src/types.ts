export const PLUGIN_NAME = 'docusaurus-plugin-omg'

export type OmgOutputFormat = 'yaml' | 'json'

export type OmgApiInput = {
  /**
   * Identifier for this API. Used as the default output filename if `output`
   * is not set, and surfaced in plugin log messages.
   */
  id: string
  /**
   * Path to the root `.omg.md` file, relative to the Docusaurus site root.
   * The parser walks the containing directory for endpoint and partial files.
   */
  input: string
  /**
   * Output file path, relative to the Docusaurus site root.
   * Defaults to `<outputDir>/<id>.<format>`.
   */
  output?: string
  /**
   * Output format override for this API. Falls back to the plugin-level
   * `format` option when unset.
   */
  format?: OmgOutputFormat
}

export type PluginOmgOptions = {
  /** APIs to compile at build time. */
  apis?: OmgApiInput[]
  /**
   * Directory for compiled specs when an API doesn't specify its own `output`.
   * Resolved relative to the Docusaurus site root.
   * @default 'static/api'
   */
  outputDir?: string
  /**
   * Default output format for APIs that don't specify their own.
   * @default 'yaml'
   */
  format?: OmgOutputFormat
}

export type OmgCompileResult = {
  id: string
  input: string
  output: string
  format: OmgOutputFormat
}

export type OmgPluginContent = {
  results: OmgCompileResult[]
}
