import type {
  FestivalChatErrorBody,
  FestivalChatRequest,
  FestivalChatResponse,
} from '../../shared/chat-contract'

export class FestivalChatApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'FestivalChatApiError'
    this.status = status
    this.code = code
  }
}

export async function askFestivalChat(
  endpoint: string,
  question: string,
  signal?: AbortSignal,
): Promise<FestivalChatResponse> {
  const payload: FestivalChatRequest = { question }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    let body: FestivalChatErrorBody = {}

    try {
      body = (await response.json()) as FestivalChatErrorBody
    } catch {
      // JSON 오류 응답이 아니면 아래 기본 문구를 사용한다.
    }

    throw new FestivalChatApiError(
      body.error ?? '챗봇 서버에 요청하지 못했습니다.',
      response.status,
      body.code,
    )
  }

  return (await response.json()) as FestivalChatResponse
}
