<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import chatbotAvatar from './chatbot-avatar.svg'
import { useFestivalChat } from './useFestivalChat'
import type { FestivalSource } from './types'

const props = withDefaults(
  defineProps<{
    apiEndpoint?: string
    brandName?: string
    subtitle?: string
    primaryColor?: string
    defaultOpen?: boolean
    suggestions?: string[]
    avatarSrc?: string
    bottomOffset?: string
    rightOffset?: string
    zIndex?: number
    showAttribution?: boolean
  }>(),
  {
    apiEndpoint: '/api/chat',
    brandName: '서울 축제 AI 상담',
    subtitle: '온라인 · 제공 데이터 기반',
    primaryColor: '#2563eb',
    defaultOpen: false,
    avatarSrc: '',
    bottomOffset: '24px',
    rightOffset: '24px',
    zIndex: 1200,
    showAttribution: true,
    suggestions: () => [
      '오늘 진행 중인 무료 축제 알려줘',
      '7월에 열리는 축제 찾아줘',
      '문학주간 2026 일정과 장소 알려줘',
    ],
  },
)

const emit = defineEmits<{
  opened: []
  closed: []
  sent: [question: string]
}>()

const isOpen = ref(props.defaultOpen)
const messageList = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLTextAreaElement | null>(null)
const launcherButton = ref<HTMLButtonElement | null>(null)
const panelId = 'lh-festival-chat-panel'
const titleId = 'lh-festival-chat-title'

const {
  input,
  messages,
  isSending,
  canSend,
  send,
  reset,
  cancel,
} = useFestivalChat(() => props.apiEndpoint)

const resolvedAvatar = computed(() => props.avatarSrc || chatbotAvatar)

const rootStyle = computed(() => ({
  '--lh-chat-primary': props.primaryColor,
  '--lh-chat-bottom': props.bottomOffset,
  '--lh-chat-right': props.rightOffset,
  '--lh-chat-z-index': String(props.zIndex),
}))

function openChat(): void {
  isOpen.value = true
  emit('opened')
  void nextTick(() => inputElement.value?.focus())
}

function closeChat(): void {
  isOpen.value = false
  emit('closed')
  void nextTick(() => launcherButton.value?.focus())
}

async function submit(): Promise<void> {
  const question = input.value.trim()
  if (!question || isSending.value) return
  emit('sent', question)
  await send()
  await scrollToBottom()
  inputElement.value?.focus()
}

async function submitSuggestion(question: string): Promise<void> {
  emit('sent', question)
  await send(question)
  await scrollToBottom()
  inputElement.value?.focus()
}

function handleInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void submit()
  }
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight
  }
}

function formatCompactDate(value: string | null): string | null {
  if (!value || !/^\d{8}$/.test(value)) return value
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`
}

function formatDateRange(source: FestivalSource): string | null {
  const start = formatCompactDate(source.startDate)
  const end = formatCompactDate(source.endDate)
  if (!start && !end) return null
  if (start === end) return start
  return [start, end].filter(Boolean).join(' ~ ')
}

function statusLabel(status: FestivalSource['status']): string {
  if (status === 'ongoing') return '진행 중'
  if (status === 'upcoming') return '예정'
  if (status === 'ended') return '종료'
  return '일정 미확인'
}

watch(
  () => messages.value.length,
  () => void scrollToBottom(),
)
watch(isSending, () => void scrollToBottom())
onBeforeUnmount(cancel)
</script>

<template>
  <Teleport to="body">
    <div class="lh-chat" :class="{ 'lh-chat--open': isOpen }" :style="rootStyle">
      <Transition name="lh-chat-panel">
        <section
          v-if="isOpen"
          :id="panelId"
          class="lh-chat__panel"
          role="dialog"
          aria-modal="false"
          :aria-labelledby="titleId"
          @keydown.esc.stop="closeChat"
        >
          <header class="lh-chat__header">
            <div class="lh-chat__identity">
              <img class="lh-chat__header-avatar" :src="resolvedAvatar" alt="" />
              <div class="lh-chat__identity-copy">
                <h2 :id="titleId">{{ brandName }}</h2>
                <p>
                  <span class="lh-chat__status-dot" aria-hidden="true" />
                  {{ subtitle }}
                </p>
              </div>
            </div>

            <div class="lh-chat__header-actions">
              <button
                class="lh-chat__icon-button"
                type="button"
                aria-label="대화 초기화"
                title="대화 초기화"
                @click="reset"
              >
                ↻
              </button>
              <button
                class="lh-chat__icon-button"
                type="button"
                aria-label="챗봇 닫기"
                title="챗봇 닫기"
                @click="closeChat"
              >
                ×
              </button>
            </div>
          </header>

          <div ref="messageList" class="lh-chat__messages" role="log" aria-live="polite">
            <article
              v-for="message in messages"
              :key="message.id"
              class="lh-chat__message-row"
              :class="`lh-chat__message-row--${message.role}`"
            >
              <img
                v-if="message.role === 'assistant'"
                class="lh-chat__message-avatar"
                :src="resolvedAvatar"
                alt="상담 챗봇"
              />

              <div class="lh-chat__message-stack">
                <div
                  class="lh-chat__bubble"
                  :class="[
                    `lh-chat__bubble--${message.role}`,
                    { 'lh-chat__bubble--error': message.isError },
                  ]"
                >
                  {{ message.content }}
                </div>

                <span v-if="message.role === 'assistant' && message.mode" class="lh-chat__mode">
                  {{ message.mode === 'llm' ? 'AI 답변' : 'JSON 검색 답변' }}
                </span>

                <p v-if="message.warning" class="lh-chat__warning">
                  {{ message.warning }}
                </p>

                <details v-if="message.sources?.length" class="lh-chat__sources">
                  <summary>근거 데이터 {{ message.sources.length }}건 보기</summary>
                  <div class="lh-chat__source-list">
                    <article
                      v-for="source in message.sources"
                      :key="source.contentId"
                      class="lh-chat__source-card"
                    >
                      <div class="lh-chat__source-heading">
                        <strong>{{ source.title }}</strong>
                        <span :data-status="source.status">{{ statusLabel(source.status) }}</span>
                      </div>
                      <p v-if="formatDateRange(source)">📅 {{ formatDateRange(source) }}</p>
                      <p v-if="source.eventPlace">📍 {{ source.eventPlace }}</p>
                      <p v-else-if="source.address">📍 {{ source.address }}</p>
                      <p v-if="source.fee">💳 {{ source.fee }}</p>
                    </article>
                  </div>
                </details>
              </div>
            </article>

            <div v-if="messages.length === 1" class="lh-chat__suggestions">
              <p>이렇게 질문해 보세요</p>
              <button
                v-for="suggestion in suggestions"
                :key="suggestion"
                type="button"
                :disabled="isSending"
                @click="submitSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>

            <div v-if="isSending" class="lh-chat__message-row lh-chat__message-row--assistant">
              <img class="lh-chat__message-avatar" :src="resolvedAvatar" alt="" />
              <div class="lh-chat__typing" aria-label="답변 작성 중">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <footer class="lh-chat__composer">
            <div class="lh-chat__input-wrap">
              <textarea
                ref="inputElement"
                v-model="input"
                rows="1"
                maxlength="300"
                placeholder="서울 축제 정보를 물어보세요"
                aria-label="챗봇 질문 입력"
                :disabled="isSending"
                @keydown="handleInputKeydown"
              />
              <button
                class="lh-chat__send-button"
                type="button"
                :disabled="!canSend"
                aria-label="메시지 전송"
                @click="submit"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 20.2 21 12 3 3.8 3 10l12 2-12 2v6.2Z" />
                </svg>
              </button>
            </div>
            <p v-if="showAttribution" class="lh-chat__attribution">
              데이터 출처: 한국관광공사 TourAPI 4.0
            </p>
          </footer>
        </section>
      </Transition>

      <Transition name="lh-chat-fab">
        <button
          v-if="!isOpen"
          ref="launcherButton"
          class="lh-chat__fab"
          type="button"
          aria-label="서울 축제 AI 상담 챗봇 열기"
          :aria-controls="panelId"
          :aria-expanded="isOpen"
          title="서울 축제 AI 상담"
          @click="openChat"
        >
          <img :src="resolvedAvatar" alt="" />
          <span>AI</span>
        </button>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped src="./FestivalChatbot.css"></style>
