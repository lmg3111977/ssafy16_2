<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { FestivalChatWidget } from './chatbot'
import SiteHeader from './layout/SiteHeader.vue'
import { parseViewHash, toViewHash } from './navigation/view-state'
import type { AppView } from './navigation/view-state'
import CommunityView from './views/CommunityView.vue'
import ExploreView from './views/ExploreView.vue'
import HomeView from './views/HomeView.vue'
import type { ChatMapRequest } from './features/map/types'
import type { LocalHubSource } from '../shared/chat-contract'

const activeView = ref<AppView>(
  typeof window === 'undefined' ? 'home' : parseViewHash(window.location.hash),
)

const previewChatOpen =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('chat') === 'open'

const chatMapRequest = ref<ChatMapRequest | null>(null)

function createRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function showChatRecommendations(sources: LocalHubSource[]): void {
  chatMapRequest.value = {
    id: createRequestId(),
    sources,
  }
  navigate('explore')
}

function navigate(view: AppView): void {
  activeView.value = view
  if (window.location.hash !== toViewHash(view)) {
    window.location.hash = toViewHash(view)
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleHashChange(): void {
  activeView.value = parseViewHash(window.location.hash)
}

onMounted(() => {
  window.addEventListener('hashchange', handleHashChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', handleHashChange)
})
</script>

<template>
  <div class="app-shell">
    <SiteHeader :active-view="activeView" @navigate="navigate" />

    <main>
      <HomeView v-if="activeView === 'home'" @navigate="navigate" />
      <ExploreView
        v-else-if="activeView === 'explore'"
        :chat-map-request="chatMapRequest"
      />
      <CommunityView v-else />
    </main>

    <footer class="data-footer">
      <p>
        이 서비스는 한국관광공사 Tour API(TourAPI 4.0)의 데이터를 활용하였습니다.
        <a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noreferrer">
          출처: 한국관광공사
        </a>
        · 라이선스: 공공누리 제3유형
      </p>
    </footer>
  </div>

  <FestivalChatWidget
    title="서울 축제 ChatLLM"
    subtitle="공공데이터 기반 상담 챗봇"
    primary-color="#3165ff"
    :initially-open="previewChatOpen"
    @map-request="showChatRecommendations"
  />
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  color: var(--lh-ink);
  background:
    radial-gradient(circle at 92% 4%, rgba(49, 101, 255, 0.1), transparent 24%),
    var(--lh-page);
}

.data-footer {
  width: min(var(--lh-content), calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 46px;
  border-top: 1px solid var(--lh-line);
  color: var(--lh-muted);
  font-size: 12px;
  line-height: 1.7;
}

.data-footer p { margin: 0; }
.data-footer a { color: var(--lh-primary-strong); font-weight: 800; }

@media (max-width: 700px) {
  .app-shell { padding-bottom: calc(88px + env(safe-area-inset-bottom)); }
}
</style>
