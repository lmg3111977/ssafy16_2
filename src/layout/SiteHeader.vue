<script setup lang="ts">
import type { AppView } from '../navigation/view-state'

defineProps<{ activeView: AppView }>()

const emit = defineEmits<{
  navigate: [view: AppView]
}>()

const items: Array<{ view: AppView; label: string }> = [
  { view: 'home', label: '홈' },
  { view: 'explore', label: '지역 탐색' },
  { view: 'community', label: '커뮤니티' },
]
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner">
      <button class="site-logo" type="button" @click="emit('navigate', 'home')">
        Local<span>Hub</span>
      </button>

      <nav class="site-tabs" aria-label="주요 화면">
        <button
          v-for="item in items"
          :key="item.view"
          type="button"
          class="site-tab"
          :class="{ 'is-active': activeView === item.view }"
          :aria-current="activeView === item.view ? 'page' : undefined"
          @click="emit('navigate', item.view)"
        >
          {{ item.label }}
        </button>
      </nav>

      <span class="site-meta">SEOUL · PUBLIC DATA</span>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 72px;
  border-bottom: 1px solid rgba(34, 57, 99, 0.08);
  background: rgba(247, 249, 252, 0.92);
  backdrop-filter: blur(16px);
}

.site-header__inner {
  display: grid;
  width: min(var(--lh-content), calc(100% - 40px));
  height: 100%;
  margin: 0 auto;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.site-logo {
  justify-self: start;
  padding: 0;
  border: 0;
  color: var(--lh-ink);
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -0.055em;
  background: transparent;
}

.site-logo span {
  color: var(--lh-primary);
}

.site-tabs {
  display: flex;
  gap: 4px;
  padding: 5px;
  border: 1px solid var(--lh-line);
  border-radius: 999px;
  background: var(--lh-card);
  box-shadow: 0 8px 24px rgba(31, 51, 91, 0.05);
}

.site-tab {
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  color: var(--lh-muted);
  font-size: 13px;
  font-weight: 800;
  background: transparent;
  transition: color 0.2s ease, background 0.2s ease;
}

.site-tab.is-active {
  color: #fff;
  background: var(--lh-primary-strong);
}

.site-meta {
  justify-self: end;
  color: #8994a6;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

@media (max-width: 700px) {
  .site-header {
    height: 62px;
  }

  .site-header__inner {
    display: flex;
    justify-content: space-between;
  }

  .site-meta {
    display: none;
  }

  .site-tabs {
    position: fixed;
    right: 14px;
    bottom: max(14px, env(safe-area-inset-bottom));
    left: 14px;
    z-index: 1400;
    justify-content: center;
    box-shadow: var(--lh-shadow-float);
  }

  .site-tab {
    flex: 1;
    min-height: 46px;
    padding: 0 10px;
  }
}
</style>
