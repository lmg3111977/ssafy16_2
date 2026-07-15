<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { askFestivalChat, FestivalChatApiError } from './api'
import { readPublicCommunityContext } from './community-context'
import ChatBotIcon from './ChatBotIcon.vue'
import type { ChatContext, ChatMessage, LocalHubSource, LocalHubSourceType } from './types'

interface Props {
  apiEndpoint?: string
  title?: string
  subtitle?: string
  welcomeMessage?: string
  primaryColor?: string
  zIndex?: number
  initiallyOpen?: boolean
  showSources?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  apiEndpoint: '/api/chat',
  title: '서울 LocalHub ChatLLM',
  subtitle: '공공데이터 기반 상담 챗봇',
  welcomeMessage:
    '안녕하세요! 서울 관광지, 문화시설, 숙박, 쇼핑, 여행 코스, 축제·행사와 커뮤니티 이용을 도와드릴게요.',
  primaryColor: '#3165ff',
  zIndex: 1200,
  initiallyOpen: false,
  showSources: true,
})

const emit = defineEmits<{
  open: []
  close: []
}>()

const isOpen = ref(props.initiallyOpen)
const draft = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const lastFailedQuestion = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const messagesRef = ref<HTMLElement | null>(null)
let activeController: AbortController | null = null

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const quickQuestions = [
  '오늘 진행 중인 축제 알려줘',
  '서울 호텔 추천해줘',
  '서울 여행 코스 알려줘',
]

const messages = ref<ChatMessage[]>([
  {
    id: createId(),
    role: 'assistant',
    content: props.welcomeMessage,
    createdAt: new Date(),
    mode: 'search',
  },
])

const widgetStyle = computed(() => ({
  '--chat-primary': props.primaryColor,
  '--chat-z-index': String(props.zIndex),
}))

const remainingCharacters = computed(() => 300 - draft.value.length)
const canSend = computed(
  () => draft.value.trim().length > 0 && !isLoading.value && remainingCharacters.value >= 0,
)

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatDateRange(source: LocalHubSource): string {
  if (!source.startDate && !source.endDate) return '일정 정보 없음'
  if (source.startDate === source.endDate) return source.startDate ?? '일정 정보 없음'
  return `${source.startDate ?? '미정'} ~ ${source.endDate ?? '미정'}`
}

function statusLabel(source: LocalHubSource): string {
  const labels: Record<LocalHubSource['status'], string> = {
    ongoing: '진행 중',
    upcoming: '예정',
    ended: '종료',
    unknown: '일정 미상',
  }
  return labels[source.status]
}

function typeLabel(type: LocalHubSourceType): string {
  const labels: Record<LocalHubSourceType, string> = {
    festival: '축제·행사', attraction: '관광지', culture: '문화시설',
    leisure: '레포츠', accommodation: '숙박', shopping: '쇼핑',
    course: '여행 코스', community: '커뮤니티',
  }
  return labels[type]
}

async function scrollToLatest(): Promise<void> {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

async function focusInput(): Promise<void> {
  await nextTick()
  inputRef.value?.focus()
}

function openWidget(): void {
  isOpen.value = true
  emit('open')
  void focusInput()
}

function closeWidget(): void {
  isOpen.value = false
  emit('close')
}

function toggleWidget(): void {
  if (isOpen.value) closeWidget()
  else openWidget()
}

function createUserMessage(content: string): ChatMessage {
  return {
    id: createId(),
    role: 'user',
    content,
    createdAt: new Date(),
  }
}

function createAssistantMessage(
  content: string,
  sources: LocalHubSource[] = [],
  mode: ChatMessage['mode'] = 'llm',
  warning?: string,
): ChatMessage {
  return {
    id: createId(),
    role: 'assistant',
    content,
    sources,
    mode,
    warning,
    createdAt: new Date(),
  }
}

function buildContext(question: string): ChatContext {
  let recent = messages.value
    .filter((message, index) => !(index === 0 && message.role === 'assistant'))
    .map(({ role, content }) => ({ role, content }))
  if (recent.at(-1)?.role === 'user' && recent.at(-1)?.content === question) {
    recent = recent.slice(0, -1)
  }

  const previousSources = [...messages.value]
    .reverse()
    .find((message) => message.role === 'assistant' && message.sources?.length)
    ?.sources

  return {
    recentMessages: recent.slice(-4),
    sourceIds: previousSources?.slice(0, 5).map((source) => source.contentId) ?? [],
    communityPosts: readPublicCommunityContext('localhub-community-posts'),
  }
}

async function sendQuestion(questionOverride?: string, appendUser = true): Promise<void> {
  const question = (questionOverride ?? draft.value).trim()
  if (!question || isLoading.value) return

  if (question.length > 300) {
    errorMessage.value = '질문은 300자 이하로 입력해 주세요.'
    return
  }

  errorMessage.value = ''
  draft.value = ''
  const context = buildContext(question)
  if (appendUser) messages.value.push(createUserMessage(question))
  isLoading.value = true
  await scrollToLatest()

  activeController?.abort()
  activeController = new AbortController()

  try {
    const result = await askFestivalChat(
      props.apiEndpoint,
      question,
      context,
      15_000,
      activeController.signal,
    )

    messages.value.push(
      createAssistantMessage(
        result.reply,
        result.sources,
        result.meta.mode,
        result.warning,
      ),
    )
    messages.value = messages.value.slice(-50)
    lastFailedQuestion.value = ''
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return

    if (error instanceof FestivalChatApiError) {
      errorMessage.value =
        error.status === 429
          ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
          : error.message
      if (error.code === 'REQUEST_TIMEOUT') lastFailedQuestion.value = question
    } else {
      errorMessage.value = '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      lastFailedQuestion.value = question
    }
  } finally {
    isLoading.value = false
    activeController = null
    await scrollToLatest()
    void focusInput()
  }
}

function retryLastQuestion(): void {
  if (lastFailedQuestion.value) {
    void sendQuestion(lastFailedQuestion.value, false)
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isOpen.value) {
    closeWidget()
    return
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void sendQuestion()
  }
}

watch(
  () => props.welcomeMessage,
  (value) => {
    if (messages.value.length === 1 && messages.value[0]?.role === 'assistant') {
      messages.value[0].content = value
    }
  },
)

onBeforeUnmount(() => {
  activeController?.abort()
})
</script>

<template>
  <Teleport to="body">
    <div class="festival-chat" :style="widgetStyle">
      <Transition name="chat-window">
        <section
          v-if="isOpen"
          id="festival-chat-dialog"
          class="chat-panel"
          role="dialog"
          aria-label="서울 지역정보 상담 챗봇"
          aria-modal="false"
          @keydown="handleKeydown"
        >
          <header class="chat-header">
            <div class="agent-avatar" aria-hidden="true">
              <ChatBotIcon />
              <span class="online-dot" />
            </div>
            <div class="agent-info">
              <strong>{{ title }}</strong>
              <span>{{ subtitle }}</span>
            </div>
            <button
              type="button"
              class="icon-button"
              aria-label="챗봇 창 최소화"
              @click="closeWidget"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14" />
              </svg>
            </button>
          </header>

          <div ref="messagesRef" class="messages" aria-live="polite">
            <article
              v-for="message in messages"
              :key="message.id"
              class="message-row"
              :class="`is-${message.role}`"
            >
              <div v-if="message.role === 'assistant'" class="message-avatar" aria-hidden="true">
                <ChatBotIcon />
              </div>

              <div class="message-stack">
                <div class="message-bubble">
                  <p>{{ message.content }}</p>
                </div>

                <p v-if="message.warning" class="message-warning">
                  {{ message.warning }}
                </p>

                <details
                  v-if="showSources && message.sources?.length"
                  class="sources"
                >
                  <summary>확인한 공공데이터 {{ message.sources.length }}건</summary>
                  <div class="source-list">
                    <article
                      v-for="source in message.sources"
                      :key="source.contentId"
                      class="source-card"
                      :class="{ 'without-image': !source.imageUrl }"
                    >
                      <img
                        v-if="source.imageUrl"
                        :src="source.imageUrl"
                        :alt="`${source.title} 대표 이미지`"
                        loading="lazy"
                      />
                      <div class="source-content">
                        <div class="source-title-row">
                          <strong>{{ source.title }}</strong>
                          <div class="source-badges">
                            <span class="type-badge">{{ typeLabel(source.type) }}</span>
                            <span
                              v-if="source.status !== 'unknown'"
                              :class="`status-${source.status}`"
                            >
                              {{ statusLabel(source) }}
                            </span>
                          </div>
                        </div>
                        <dl>
                          <div v-if="source.startDate || source.endDate">
                            <dt>기간</dt>
                            <dd>{{ formatDateRange(source) }}</dd>
                          </div>
                          <div>
                            <dt>장소</dt>
                            <dd>{{ source.eventPlace || source.address || '정보 없음' }}</dd>
                          </div>
                          <div v-if="source.fee">
                            <dt>요금</dt>
                            <dd>{{ source.fee }}</dd>
                          </div>
                          <div v-if="source.summary">
                            <dt>요약</dt>
                            <dd>{{ source.summary }}</dd>
                          </div>
                        </dl>
                      </div>
                    </article>
                  </div>
                </details>

                <time :datetime="message.createdAt.toISOString()">
                  {{ formatTime(message.createdAt) }}
                </time>
              </div>
            </article>

            <article v-if="isLoading" class="message-row is-assistant">
              <div class="message-avatar" aria-hidden="true">
                <ChatBotIcon />
              </div>
              <div class="typing" aria-label="답변 작성 중">
                <span />
                <span />
                <span />
              </div>
            </article>
          </div>

          <div v-if="messages.length === 1" class="quick-questions">
            <button
              v-for="question in quickQuestions"
              :key="question"
              type="button"
              @click="sendQuestion(question)"
            >
              {{ question }}
            </button>
          </div>

          <div v-if="errorMessage" class="error-message" role="alert">
            <span>{{ errorMessage }}</span>
            <button
              v-if="lastFailedQuestion"
              type="button"
              :disabled="isLoading"
              @click="retryLastQuestion"
            >
              다시 시도
            </button>
          </div>

          <footer class="chat-composer">
            <div class="composer-box">
              <textarea
                ref="inputRef"
                v-model="draft"
                rows="1"
                maxlength="300"
                placeholder="서울 지역 정보를 물어보세요"
                aria-label="챗봇 질문 입력"
                @keydown="handleKeydown"
              />
              <button
                type="button"
                class="send-button"
                :disabled="!canSend"
                aria-label="질문 전송"
                @click="sendQuestion()"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m5 12 14-7-4.5 14-3.2-5.3L5 12Z" />
                  <path d="m11.3 13.7 3.4-3.4" />
                </svg>
              </button>
            </div>
            <div class="composer-meta">
              <span>지역정보 답변은 제공된 서울 데이터만 참고합니다.</span>
              <span :class="{ 'is-over': remainingCharacters < 0 }">
                {{ remainingCharacters }}
              </span>
            </div>
          </footer>
        </section>
      </Transition>

      <div v-if="!isOpen" class="launcher-wrap">
        <span class="launcher-tip">서울 정보가 궁금하신가요?</span>
        <button
          type="button"
          class="chat-launcher"
          aria-label="서울 LocalHub ChatLLM 열기"
          aria-controls="festival-chat-dialog"
          :aria-expanded="isOpen"
          @click="toggleWidget"
        >
          <ChatBotIcon />
          <span class="launcher-notice">1</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.festival-chat {
  --chat-primary: #3165ff;
  --chat-z-index: 1200;
  position: fixed;
  right: max(22px, env(safe-area-inset-right));
  bottom: max(22px, env(safe-area-inset-bottom));
  z-index: var(--chat-z-index);
  color: #172033;
  font-family:
    Inter, Pretendard, "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

.festival-chat button,
.festival-chat textarea {
  margin: 0;
  appearance: none;
  font: inherit;
}

.festival-chat button {
  border: 0;
}

.chat-panel {
  position: absolute;
  right: 0;
  bottom: 82px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto;
  width: min(390px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 126px));
  overflow: hidden;
  border: 1px solid rgba(32, 54, 92, 0.12);
  border-radius: 22px;
  background: #fff;
  box-shadow:
    0 26px 70px rgba(24, 43, 77, 0.2),
    0 8px 24px rgba(24, 43, 77, 0.12);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  padding: 14px 16px;
  color: #fff;
  background:
    radial-gradient(circle at 12% 10%, rgba(255, 255, 255, 0.2), transparent 34%),
    linear-gradient(135deg, var(--chat-primary), #2549c9);
}

.agent-avatar,
.message-avatar {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: var(--chat-primary);
  background: #fff;
}

.agent-avatar {
  width: 44px;
  height: 44px;
  box-shadow: 0 8px 18px rgba(17, 39, 92, 0.18);
}

.agent-avatar svg {
  width: 29px;
  height: 29px;
}

.online-dot {
  position: absolute;
  right: 0;
  bottom: 1px;
  width: 11px;
  height: 11px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #2bd67b;
}

.agent-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.agent-info strong {
  overflow: hidden;
  font-size: 16px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-info span {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-button {
  display: grid;
  width: 38px;
  height: 38px;
  cursor: pointer;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  transition: background 160ms ease;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.22);
}

.icon-button svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 2;
}

.messages {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px 16px 14px;
  background:
    linear-gradient(rgba(247, 249, 253, 0.94), rgba(247, 249, 253, 0.94)),
    radial-gradient(circle at 100% 0%, rgba(49, 101, 255, 0.12), transparent 34%);
  scrollbar-width: thin;
  scrollbar-color: #cbd3e2 transparent;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 16px;
}

.message-row.is-user {
  justify-content: flex-end;
}

.message-avatar {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(49, 101, 255, 0.16);
  box-shadow: 0 4px 12px rgba(34, 56, 98, 0.08);
}

.message-avatar svg {
  width: 21px;
  height: 21px;
}

.message-stack {
  display: flex;
  max-width: 82%;
  flex-direction: column;
  gap: 5px;
}

.is-user .message-stack {
  align-items: flex-end;
}

.message-bubble {
  padding: 11px 13px;
  border-radius: 16px 16px 16px 5px;
  color: #26334d;
  background: #fff;
  box-shadow: 0 5px 16px rgba(38, 55, 90, 0.08);
}

.is-user .message-bubble {
  border-radius: 16px 16px 5px 16px;
  color: #fff;
  background: var(--chat-primary);
  box-shadow: 0 7px 18px color-mix(in srgb, var(--chat-primary) 26%, transparent);
}

.message-bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.58;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-warning {
  margin: 0;
  padding: 7px 9px;
  border: 1px solid #f2d39a;
  border-radius: 10px;
  color: #805600;
  font-size: 10px;
  line-height: 1.45;
  background: #fff8e8;
}

.message-stack time {
  color: #8a96aa;
  font-size: 10px;
}

.sources {
  width: 100%;
  overflow: hidden;
  border: 1px solid #dce3ef;
  border-radius: 13px;
  background: #fff;
}

.sources summary {
  padding: 9px 11px;
  cursor: pointer;
  color: #50617c;
  font-size: 11px;
  font-weight: 700;
  list-style-position: inside;
}

.source-list {
  display: grid;
  gap: 8px;
  padding: 0 8px 8px;
}

.source-card {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 9px;
  overflow: hidden;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  background: #fafbfe;
}

.source-card.without-image {
  grid-template-columns: 1fr;
}

.source-card img {
  width: 62px;
  height: 100%;
  min-height: 82px;
  object-fit: cover;
  background: #e8edf7;
}

.source-content {
  min-width: 0;
  padding: 9px 9px 9px 0;
}

.source-card.without-image .source-content {
  padding-left: 9px;
}

.source-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 7px;
}

.source-title-row strong {
  min-width: 0;
  overflow: hidden;
  color: #27354e;
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-title-row span {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
}

.source-badges {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
}

.source-title-row .type-badge {
  color: #4d5e78;
  background: #e8edf5;
}

.status-ongoing {
  color: #0b7a49;
  background: #dcf8e9;
}

.status-upcoming {
  color: #2859cf;
  background: #e6edff;
}

.status-ended,
.status-unknown {
  color: #6f798a;
  background: #eef1f5;
}

.source-content dl {
  display: grid;
  gap: 4px;
  margin: 7px 0 0;
}

.source-content dl > div {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 5px;
  color: #68748a;
  font-size: 10px;
  line-height: 1.4;
}

.source-content dt {
  font-weight: 700;
}

.source-content dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 58px;
  height: 38px;
  padding: 0 14px;
  border-radius: 16px 16px 16px 5px;
  background: #fff;
  box-shadow: 0 5px 16px rgba(38, 55, 90, 0.08);
}

.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #91a0ba;
  animation: typing-bounce 1.15s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.14s;
}

.typing span:nth-child(3) {
  animation-delay: 0.28s;
}

.quick-questions {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 10px 14px;
  border-top: 1px solid #edf0f5;
  background: #fff;
  scrollbar-width: none;
}

.quick-questions::-webkit-scrollbar {
  display: none;
}

.quick-questions button {
  flex: 0 0 auto;
  padding: 8px 10px;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--chat-primary) 24%, #dfe5ef);
  border-radius: 999px;
  color: #405172;
  font-size: 11px;
  background: #fff;
  transition:
    border-color 150ms ease,
    color 150ms ease,
    background 150ms ease;
}

.quick-questions button:hover {
  border-color: var(--chat-primary);
  color: var(--chat-primary);
  background: color-mix(in srgb, var(--chat-primary) 6%, white);
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  color: #b42318;
  font-size: 11px;
  background: #fff0ee;
}

.error-message button {
  flex: 0 0 auto;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 8px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  background: #b42318;
}

.chat-composer {
  padding: 11px 13px 10px;
  border-top: 1px solid #e9edf4;
  background: #fff;
}

.composer-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 7px 7px 7px 12px;
  border: 1px solid #d8dfeb;
  border-radius: 15px;
  background: #fff;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.composer-box:focus-within {
  border-color: color-mix(in srgb, var(--chat-primary) 62%, #d8dfeb);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--chat-primary) 12%, transparent);
}

.composer-box textarea {
  width: 100%;
  max-height: 92px;
  resize: none;
  border: 0;
  outline: 0;
  color: #26334d;
  font-size: 13px;
  line-height: 1.45;
  background: transparent;
}

.composer-box textarea::placeholder {
  color: #9aa5b6;
}

.send-button {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  cursor: pointer;
  place-items: center;
  border-radius: 11px;
  color: #fff;
  background: var(--chat-primary);
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.send-button svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.composer-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  color: #9aa5b6;
  font-size: 9px;
}

.composer-meta .is-over {
  color: #c42b1c;
  font-weight: 700;
}

.launcher-wrap {
  display: flex;
  align-items: center;
  gap: 11px;
}

.launcher-tip {
  padding: 10px 13px;
  border: 1px solid rgba(32, 54, 92, 0.1);
  border-radius: 13px;
  color: #33435e;
  font-size: 12px;
  font-weight: 700;
  background: #fff;
  box-shadow: 0 8px 24px rgba(29, 48, 83, 0.12);
  animation: tip-enter 420ms 180ms both ease-out;
}

.chat-launcher {
  position: relative;
  display: grid;
  width: 66px;
  height: 66px;
  cursor: pointer;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--chat-primary);
  background: #fff;
  box-shadow:
    0 16px 34px rgba(33, 58, 112, 0.22),
    0 0 0 7px color-mix(in srgb, var(--chat-primary) 11%, transparent);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.chat-launcher:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 20px 40px rgba(33, 58, 112, 0.28),
    0 0 0 8px color-mix(in srgb, var(--chat-primary) 13%, transparent);
}

.chat-launcher svg {
  width: 43px;
  height: 43px;
}

.launcher-notice {
  position: absolute;
  top: -1px;
  right: -1px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  background: #f04438;
}

.chat-window-enter-active,
.chat-window-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: right bottom;
}

.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@keyframes tip-enter {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 640px) {
  .festival-chat {
    inset: 0;
    pointer-events: none;
  }

  .chat-panel,
  .launcher-wrap {
    pointer-events: auto;
  }

  .chat-panel {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .chat-header {
    min-height: calc(72px + env(safe-area-inset-top));
    padding-top: calc(12px + env(safe-area-inset-top));
  }

  .chat-composer {
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
  }

  .launcher-wrap {
    position: fixed;
    right: max(18px, env(safe-area-inset-right));
    bottom: max(18px, env(safe-area-inset-bottom));
  }

  .launcher-tip {
    display: none;
  }

  .chat-launcher {
    width: 62px;
    height: 62px;
  }

  .message-stack {
    max-width: 86%;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
