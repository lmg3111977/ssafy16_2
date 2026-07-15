import { computed, ref } from 'vue'
import { requestFestivalAnswer } from './api'
import type {
  ChatMessage,
  FestivalChatContext,
} from './types'

const WELCOME_MESSAGE = [
  '안녕하세요. LocalHub 서울 축제 안내 챗봇입니다.',
  '축제명, 자치구, 월, 무료 여부를 물어보세요.',
].join('\n')

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: createId(),
    role: 'assistant',
    content: WELCOME_MESSAGE,
    createdAt: Date.now(),
  }
}

function getLatestFestivalContext(
  currentMessages: readonly ChatMessage[],
): FestivalChatContext | undefined {
  const latestGroundedAnswer = [...currentMessages]
    .reverse()
    .find(
      (message) =>
        message.role === 'assistant' &&
        Boolean(message.sources?.length),
    )

  const contentIds = [...new Set(
    latestGroundedAnswer?.sources
      ?.map((source) => source.contentId.trim())
      .filter(Boolean) ?? [],
  )].slice(0, 5)

  return contentIds.length > 0 ? { contentIds } : undefined
}

export function useFestivalChat(getEndpoint: () => string) {
  const input = ref('')
  const messages = ref<ChatMessage[]>([createWelcomeMessage()])
  const isSending = ref(false)
  const error = ref('')
  let activeController: AbortController | null = null

  const canSend = computed(
    () => input.value.trim().length > 0 && !isSending.value,
  )

  async function send(questionOverride?: string): Promise<void> {
    const question = (questionOverride ?? input.value).trim()
    if (!question || isSending.value) return

    const context = getLatestFestivalContext(messages.value)

    error.value = ''
    input.value = ''
    messages.value.push({
      id: createId(),
      role: 'user',
      content: question,
      createdAt: Date.now(),
    })

    isSending.value = true
    activeController = new AbortController()

    try {
      const result = await requestFestivalAnswer(
        getEndpoint(),
        question,
        context,
        activeController.signal,
      )

      messages.value.push({
        id: createId(),
        role: 'assistant',
        content: result.reply,
        createdAt: Date.now(),
        sources: result.sources,
        mode: result.meta.llmUsed ? 'llm' : 'search',
        warning: result.meta.warning,
      })

      if (messages.value.length > 31) {
        messages.value = [messages.value[0], ...messages.value.slice(-30)]
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return

      const message = caught instanceof Error
        ? caught.message
        : '알 수 없는 오류가 발생했습니다.'
      error.value = message
      messages.value.push({
        id: createId(),
        role: 'assistant',
        content: `오류: ${message}`,
        createdAt: Date.now(),
        mode: 'search',
        isError: true,
      })
    } finally {
      isSending.value = false
      activeController = null
    }
  }

  function reset(): void {
    activeController?.abort()
    activeController = null
    messages.value = [createWelcomeMessage()]
    input.value = ''
    error.value = ''
    isSending.value = false
  }

  function cancel(): void {
    activeController?.abort()
  }

  return {
    input,
    messages,
    isSending,
    error,
    canSend,
    send,
    reset,
    cancel,
  }
}
