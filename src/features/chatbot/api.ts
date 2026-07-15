import type {
  ChatApiResponse,
  FestivalChatContext,
  FestivalChatRequest,
} from './types'

interface ApiErrorBody {
  error?: string
}

export async function requestFestivalAnswer(
  endpoint: string,
  question: string,
  context?: FestivalChatContext,
  signal?: AbortSignal,
): Promise<ChatApiResponse> {
  const payload: FestivalChatRequest = {
    question,
    ...(context?.contentIds.length ? { context } : {}),
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  const responseBody = (await response.json().catch(() => ({}))) as
    | ChatApiResponse
    | ApiErrorBody

  if (!response.ok) {
    const message = 'error' in responseBody && responseBody.error
      ? responseBody.error
      : '챗봇 요청을 처리하지 못했습니다.'
    throw new Error(message)
  }

  return responseBody as ChatApiResponse
}
