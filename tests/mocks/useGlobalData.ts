let mockData: unknown = undefined

export function __setPluginData(data: unknown) {
  mockData = data
}

export function __resetPluginData() {
  mockData = undefined
}

export function usePluginData(_pluginName?: string) {
  return mockData
}

export default function useGlobalData() {
  return {}
}
