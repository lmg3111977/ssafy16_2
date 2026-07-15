import { computed, ref } from 'vue'
import { requestFestivalAnswer } from './api'
import type { ChatMessage } from './types'

const WELCOME_MESSAGE = [
  '\uC548\uB155\uD558\uC138\uC694. LocalHub \uC11C\uC6B8 \uCD95\uC81C \uC548\uB0B4 \uCC57\uBD07\uC785\uB2C8\uB2E4.',
  '\uCD95\uC81C\uBA85, \uC790\uCE58\uAD6C, \uC6D4, \uBB34\uB8CC \uC5EC\uBD80\uB97C \uBB3C\uC5B4\uBCF4\uC138\uC694.',
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
        : '\uC54C \uC218 \uC5C6\uB294 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.'
      error.value = message
      messages.value.push({
        id: createId(),
        role: 'assistant',
        content: `\uC624\uB958: ${message}`,
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
