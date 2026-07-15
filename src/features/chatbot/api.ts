import type { ChatApiResponse } from './types'

interface ApiErrorBody {
  error?: string
}

export async function requestFestivalAnswer(
  endpoint: string,
  question: string,
  signal?: AbortSignal,
): Promise<ChatApiResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ question }),
    signal,
  })

  const payload = (await response.json().catch(() => ({}))) as
    | ChatApiResponse
    | ApiErrorBody

  if (!response.ok) {
    const message = 'error' in payload && payload.error
      ? payload.error
      : '\uCC57\uBD07 \uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
    throw new Error(message)
  }

  return payload as ChatApiResponse
}
