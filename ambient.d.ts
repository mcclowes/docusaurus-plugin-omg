declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '@docusaurus/useGlobalData' {
  export default function useGlobalData(): {
    [pluginName: string]: {
      [pluginId: string]: unknown
    }
  }
  export function usePluginData(pluginName: string, pluginId?: string): unknown
}

declare module '@docusaurus/useDocusaurusContext' {
  export interface DocusaurusContext {
    siteConfig: {
      title: string
      tagline: string
      url: string
      baseUrl: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  export default function useDocusaurusContext(): DocusaurusContext
}

declare module '@docusaurus/ExecutionEnvironment' {
  const ExecutionEnvironment: {
    canUseDOM: boolean
    canUseEventListeners: boolean
    canUseIntersectionObserver: boolean
    canUseViewport: boolean
  }
  export default ExecutionEnvironment
}

declare module '@theme/OmgStatus' {
  import type { OmgStatusComponent } from 'docusaurus-plugin-omg'
  const OmgStatus: OmgStatusComponent
  export default OmgStatus
}

declare module '@theme/OmgWeblogLatest' {
  import type { OmgWeblogLatestComponent } from 'docusaurus-plugin-omg'
  const OmgWeblogLatest: OmgWeblogLatestComponent
  export default OmgWeblogLatest
}

declare module '@theme/OmgPaste' {
  import type { OmgPasteComponent } from 'docusaurus-plugin-omg'
  const OmgPaste: OmgPasteComponent
  export default OmgPaste
}
