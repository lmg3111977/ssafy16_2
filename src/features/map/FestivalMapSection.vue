<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import FestivalFilter from './components/FestivalFilter.vue'
import FestivalMap from './components/FestivalMap.vue'
import {
  filterMapPlaces,
  listDistricts,
  loadCategoryPlaces,
  MAP_CATEGORIES,
  normalizeChatSources,
} from './data'
import type { ChatMapRequest, MapCategory, MapPlace } from './types'

const props = defineProps<{
  chatMapRequest?: ChatMapRequest | null
}>()

const sectionElement = ref<HTMLElement | null>(null)
const sectionHeading = ref<HTMLElement | null>(null)
const mode = ref<'browse' | 'chat'>('browse')
const selectedCategory = ref<MapCategory>('festival')
const categoryPlaces = ref<MapPlace[]>([])
const chatPlaces = ref<MapPlace[]>([])
const categoryLoading = ref(false)
const categoryError = ref('')
const selectedDistrict = ref('전체')
const selectedStartDate = ref('')
const selectedEndDate = ref('')
let latestLoad = 0

const selectedCategoryLabel = computed(() => (
  MAP_CATEGORIES.find(({ value }) => value === selectedCategory.value)?.label ?? '지역정보'
))

const districts = computed(() => listDistricts(categoryPlaces.value))

const isInvalidDateRange = computed(() => Boolean(
  selectedCategory.value === 'festival' &&
  selectedStartDate.value &&
  selectedEndDate.value &&
  selectedStartDate.value > selectedEndDate.value,
))

const hasActiveFilter = computed(() => (
  selectedDistrict.value !== '전체' ||
  (selectedCategory.value === 'festival' && (
    selectedStartDate.value !== '' || selectedEndDate.value !== ''
  ))
))

const filteredPlaces = computed(() => {
  if (isInvalidDateRange.value) return []
  return filterMapPlaces(categoryPlaces.value, {
    district: selectedDistrict.value,
    startDate: selectedStartDate.value,
    endDate: selectedEndDate.value,
  })
})

const visiblePlaces = computed(() => (
  mode.value === 'chat' ? chatPlaces.value : filteredPlaces.value
))

const resultLabel = computed(() => (
  mode.value === 'chat' ? '챗봇 추천 결과' : `${selectedCategoryLabel.value} 검색 결과`
))

async function selectCategory(category: MapCategory): Promise<void> {
  const loadId = ++latestLoad
  selectedCategory.value = category
  mode.value = 'browse'
  categoryLoading.value = true
  categoryError.value = ''

  try {
    const places = await loadCategoryPlaces(category)
    if (loadId === latestLoad) categoryPlaces.value = places
  } catch {
    if (loadId === latestLoad) {
      categoryError.value = '지역정보를 불러오지 못했습니다. 다시 시도해 주세요.'
    }
  } finally {
    if (loadId === latestLoad) categoryLoading.value = false
  }
}

function resetFilters(): void {
  selectedDistrict.value = '전체'
  selectedStartDate.value = ''
  selectedEndDate.value = ''
}

function returnToBrowse(): void {
  mode.value = 'browse'
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

watch(
  () => props.chatMapRequest,
  async (request) => {
    if (!request) return
    const places = normalizeChatSources(request.sources)
    if (!places.length) return

    chatPlaces.value = places
    mode.value = 'chat'
    await nextTick()
    sectionHeading.value?.focus({ preventScroll: true })
    sectionElement.value?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  },
  { immediate: true },
)

onMounted(() => {
  void selectCategory(selectedCategory.value)
})
</script>

<template>
  <section
    id="festivals"
    ref="sectionElement"
    class="map-feature-section"
  >
    <!-- 제목 영역 -->
    <header class="map-feature-header">
      <div class="map-feature-heading">
        <span class="map-feature-kicker">
          Seoul Festival Map
        </span>

        <h2 ref="sectionHeading" tabindex="-1">
          서울의 지역정보를
          <strong>범주별로 찾아보세요.</strong>
        </h2>

        <p>
          범주 하나를 선택하면 중복을 제외한 장소를 지도에 표시합니다.
        </p>
      </div>

      <div class="map-feature-result">
        <span>{{ resultLabel }}</span>

        <strong>
          {{ visiblePlaces.length }}
          <small>개</small>
        </strong>

        <p>
          {{ mode === 'chat' ? '현재 답변의 추천 장소' : `전체 ${categoryPlaces.length}개 장소` }}
        </p>
      </div>
    </header>

    <div class="map-category-bar" aria-label="지도 범주 선택">
      <button
        v-for="category in MAP_CATEGORIES"
        :key="category.value"
        type="button"
        :aria-pressed="mode === 'browse' && selectedCategory === category.value"
        @click="selectCategory(category.value)"
      >
        {{ category.label }}
      </button>
    </div>

    <div v-if="mode === 'chat'" class="chat-map-notice">
      <div>
        <strong>챗봇 추천 장소를 표시하고 있습니다.</strong>
        <span>질문 영역에 맞는 추천 {{ chatPlaces.length }}개</span>
      </div>
      <button type="button" @click="returnToBrowse">기존 지도로 돌아가기</button>
    </div>

    <div
      class="map-feature-workspace"
      :class="{ 'is-chat-mode': mode === 'chat' }"
    >
      <!-- 필터 영역 -->
      <div v-if="mode === 'browse'" class="map-feature-filter-card">
      <div class="map-feature-filter-header">
        <div>
          <span>{{ selectedCategoryLabel }} 검색 조건</span>

          <strong>
            지역과 기간을 선택해 주세요.
          </strong>
        </div>

        <button
          v-if="hasActiveFilter"
          type="button"
          class="map-feature-reset"
          @click="resetFilters"
        >
          필터 초기화
        </button>
      </div>

      <div class="map-feature-filter-grid">
        <!-- 자치구 필터 -->
        <FestivalFilter
          v-model="selectedDistrict"
          :districts="districts"
        />

        <!-- 시작일 필터 -->
        <div v-if="selectedCategory === 'festival'" class="map-feature-date-field">
          <label for="festival-start-date">
            시작일
          </label>

          <div class="map-feature-date-input">
            <span aria-hidden="true">
              📅
            </span>

            <input
              id="festival-start-date"
              v-model="selectedStartDate"
              type="date"
              :max="selectedEndDate || undefined"
            />
          </div>
        </div>

        <!-- 종료일 필터 -->
        <div v-if="selectedCategory === 'festival'" class="map-feature-date-field">
          <label for="festival-end-date">
            종료일
          </label>

          <div class="map-feature-date-input">
            <span aria-hidden="true">
              📅
            </span>

            <input
              id="festival-end-date"
              v-model="selectedEndDate"
              type="date"
              :min="selectedStartDate || undefined"
            />
          </div>
        </div>
      </div>

      <p
        v-if="isInvalidDateRange"
        class="map-feature-error"
      >
        종료일은 시작일보다 빠를 수 없습니다.
      </p>
      <p v-if="categoryLoading" class="map-feature-status" role="status">
        지역정보를 불러오는 중입니다.
      </p>
      <div v-if="categoryError" class="map-feature-load-error" role="alert">
        <span>{{ categoryError }}</span>
        <button type="button" @click="selectCategory(selectedCategory)">다시 시도</button>
      </div>
      </div>

      <!-- 지도 영역 -->
      <div class="map-feature-card">
      <div class="map-feature-card-header">
        <div>
          <span class="map-feature-live-dot"></span>
          {{ mode === 'chat' ? '챗봇 추천 위치' : `${selectedCategoryLabel} 위치` }}
        </div>

        <span>
          마커를 누르면 상세 정보를 확인할 수 있습니다.
        </span>
      </div>

      <div class="map-feature-area">
        <FestivalMap
          :places="visiblePlaces"
          :highlighted="mode === 'chat'"
        />

        <!-- 검색 결과가 없을 때 -->
        <div
          v-if="!categoryLoading && visiblePlaces.length === 0"
          class="map-feature-empty"
        >
          <span aria-hidden="true">
            🗺️
          </span>

          <strong>
            표시할 장소가 없습니다.
          </strong>

          <p>
            범주나 검색 조건을 다시 선택해 주세요.
          </p>
        </div>
      </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.map-feature-section {
  width: min(var(--lh-content), calc(100% - 40px));
  margin: 0 auto;
  padding: 76px 0 90px;
}

/* 제목 영역 */

.map-feature-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 40px;

  margin-bottom: 28px;
}

.map-feature-kicker {
  color: var(--lh-primary);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.map-feature-heading h2 {
  margin: 10px 0 12px;

  color: var(--lh-ink);
  font-size: 36px;
  line-height: 1.25;
  letter-spacing: -0.04em;
}

.map-feature-heading h2 strong {
  color: var(--lh-primary);
}

.map-feature-heading p {
  margin: 0;

  color: var(--lh-muted);
  font-size: 15px;
  line-height: 1.7;
}

/* 검색 결과 카드 */

.map-feature-result {
  flex: 0 0 185px;
  padding: 18px 20px;

  border: 1px solid var(--lh-line);
  border-radius: 18px;
  background: var(--lh-card);

  box-shadow:
    0 16px 42px rgba(31, 51, 91, 0.08);
}

.map-feature-result > span {
  color: #7c879a;
  font-size: 12px;
  font-weight: 700;
}

.map-feature-result strong {
  display: block;
  margin: 6px 0 5px;

  color: var(--lh-primary);
  font-size: 30px;
  line-height: 1;
}

.map-feature-result small {
  font-size: 14px;
}

.map-feature-result p {
  margin: 0;

  color: #8a94a6;
  font-size: 11px;
}

.map-feature-workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  align-items: start;
  gap: 24px;
}

.map-feature-workspace.is-chat-mode {
  grid-template-columns: 1fr;
}

.map-category-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 18px;
  padding: 4px;
  scrollbar-width: thin;
}

.map-category-bar button,
.chat-map-notice button,
.map-feature-load-error button {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--lh-line);
  border-radius: 999px;
  color: var(--lh-muted);
  background: var(--lh-card);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
}

.map-category-bar button[aria-pressed='true'] {
  border-color: var(--lh-primary);
  color: #fff;
  background: var(--lh-primary);
}

.map-category-bar button:focus-visible,
.chat-map-notice button:focus-visible,
.map-feature-load-error button:focus-visible {
  outline: 3px solid rgba(49, 101, 255, 0.25);
  outline-offset: 2px;
}

.chat-map-notice {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 18px;
  padding: 16px 18px;
  border: 1px solid #cad6ff;
  border-radius: 16px;
  background: #edf2ff;
}

.chat-map-notice div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-map-notice strong { color: var(--lh-ink); }
.chat-map-notice span,
.map-feature-status { color: var(--lh-muted); font-size: 12px; }

.chat-map-notice button,
.map-feature-load-error button {
  color: var(--lh-primary-strong);
  border-color: #cad6ff;
}

.map-feature-load-error {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  color: #9b2330;
  font-size: 13px;
}

/* 필터 카드 */

.map-feature-filter-card {
  padding: 22px;

  border: 1px solid var(--lh-line);
  border-radius: var(--lh-radius-lg);
  background: var(--lh-card);

  box-shadow:
    0 14px 36px rgba(31, 51, 91, 0.06);
}

.map-feature-filter-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  margin-bottom: 20px;
}

.map-feature-filter-header > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.map-feature-filter-header span {
  color: #3165ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.map-feature-filter-header strong {
  color: #172033;
  font-size: 16px;
}

.map-feature-filter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

/* 날짜 입력 */

.map-feature-date-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-feature-date-field label {
  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.map-feature-date-input {
  position: relative;
}

.map-feature-date-input > span {
  position: absolute;
  top: 50%;
  left: 14px;

  transform: translateY(-50%);
  pointer-events: none;
}

.map-feature-date-input input {
  width: 100%;
  height: 48px;
  padding: 0 14px 0 42px;

  color: #172033;
  border: 1px solid #dfe5ef;
  border-radius: 12px;
  background: #ffffff;

  font: inherit;

  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.map-feature-date-input input:hover {
  border-color: #8aa5ff;
}

.map-feature-date-input input:focus {
  border-color: #3165ff;
  outline: none;

  box-shadow:
    0 0 0 4px rgba(49, 101, 255, 0.1);
}

/* 초기화 버튼 */

.map-feature-reset {
  padding: 9px 13px;

  color: #2757e6;
  border: 1px solid #cad6ff;
  border-radius: 10px;
  background: #edf2ff;

  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.map-feature-reset:hover {
  border-color: #8aa5ff;
  background: #e3eaff;
}

/* 오류 메시지 */

.map-feature-error {
  margin: 14px 0 0;

  color: #d73955;
  font-size: 13px;
}

/* 지도 카드 */

.map-feature-card {
  padding: 12px;

  border: 1px solid var(--lh-line);
  border-radius: var(--lh-radius-lg);
  background: var(--lh-card);

  box-shadow:
    0 22px 55px rgba(31, 51, 91, 0.12);
}

.map-feature-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  height: 44px;
  padding: 0 8px 10px;

  color: #7c879a;
  font-size: 12px;
}

.map-feature-card-header > div {
  display: flex;
  align-items: center;
  gap: 9px;

  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.map-feature-live-dot {
  width: 9px;
  height: 9px;

  border-radius: 50%;
  background: #3165ff;

  box-shadow:
    0 0 0 5px rgba(49, 101, 255, 0.12);
}

.map-feature-area {
  position: relative;
}

/* 검색 결과 없음 */

.map-feature-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 500;

  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 270px;
  padding: 25px;

  border: 1px solid #dfe5ef;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);

  transform: translate(-50%, -50%);

  box-shadow:
    0 16px 40px rgba(31, 51, 91, 0.14);
}

.map-feature-empty > span {
  margin-bottom: 9px;
  font-size: 34px;
}

.map-feature-empty strong {
  color: #172033;
}

.map-feature-empty p {
  margin: 6px 0 0;

  color: #7c879a;
  font-size: 13px;
}

/* 모바일 */

@media (max-width: 800px) {
  .map-feature-section {
    width: min(100% - 24px, var(--lh-content));
    padding: 46px 0 64px;
  }

  .map-feature-workspace {
    grid-template-columns: 1fr;
  }

  .map-feature-header {
    align-items: stretch;
    flex-direction: column;
  }

  .map-feature-result {
    flex: auto;
  }

  .map-feature-filter-grid {
    grid-template-columns: 1fr;
  }

  .map-feature-heading h2 {
    font-size: 30px;
  }

  .map-feature-card-header > span {
    display: none;
  }
}
</style>
