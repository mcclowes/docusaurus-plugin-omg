export type OmgStatus = {
  id: string
  address: string
  created: string
  relative_time: string
  emoji: string | null
  content: string
  external_url: string | null
}

export type OmgWeblogPost = {
  address: string
  date: number
  type: string
  status: string
  source: string
  title: string
  content: string
  description: string
  location: string | null
  metadata: Record<string, unknown> | null
  output: string
  entry: string
}

export type OmgPaste = {
  title: string
  content: string
  modified_on: number
}

export type OmgApiResponse<T> = {
  request: { status_code: number; success: boolean }
  response: T & { message?: string }
}
