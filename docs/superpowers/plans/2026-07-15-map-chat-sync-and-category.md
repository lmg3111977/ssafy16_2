# LocalHub Category Map and Chat Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제공 JSON의 여섯 범주를 한 번에 하나씩 탐색하고, 챗봇 답변의 지도 가능한 추천을 답변 아래 버튼으로 같은 Leaflet 지도에 표시한다.

**Architecture:** 공통 `MapPlace` 자료형과 순수 정규화 함수를 지도 기능 경계에 두고, 범주 JSON은 명시적인 동적 import로 필요할 때만 로드한다. `App.vue`가 챗봇의 `map-request` 이벤트를 `ExploreView`와 `FestivalMapSection`에 props로 전달하며, 지도 섹션은 탐색 모드 상태를 보존한 채 챗봇 추천 모드로 전환한다.

**Tech Stack:** Vue 3.5, TypeScript 5.9, Vite 8, Leaflet 1.9, Vitest 4

## Global Constraints

- Vue.js 3와 Vite 기반의 단일 SPA 구조를 유지한다.
- 지도는 기존 Leaflet을 사용하며 새 지도 API나 지도 라이브러리를 추가하지 않는다.
- 제공된 서울 JSON을 프론트엔드에서 직접 불러와 처리한다.
- 쇼핑 전체 데이터는 탐색 범주에서 제외하고 챗봇의 소수 쇼핑 추천만 지도에 표시한다.
- 탐색 범주는 한 번에 하나만 선택한다.
- 자치구 필터는 모든 탐색 범주에 적용하고 날짜 필터는 축제·행사에만 적용한다.
- `netlify/functions/chat.mts`, `src/community/api.ts`, `src/components/CommunityBoard.vue`, `tests/community-storage.test.ts`의 기존 미커밋 변경을 되돌리거나 지도 커밋에 포함하지 않는다.
- `.env`, OpenAI 모델 설정, 챗봇 API 응답 계약, 커뮤니티 저장 형식을 변경하지 않는다.

---

## File Map

- `src/features/map/types.ts`: 지도 범주, 원본 JSON, 공통 `MapPlace`, 챗봇 지도 요청 자료형
- `src/features/map/data.ts`: 범주 동적 로더, 정규화, 좌표 검증, 중복 제거, 필터링
- `src/features/map/components/FestivalMap.vue`: `MapPlace[]`를 그리는 Leaflet 렌더러
- `src/features/map/FestivalMapSection.vue`: 범주 선택, 필터, 로딩·오류, 탐색·챗봇 모드
- `src/views/ExploreView.vue`: App의 챗봇 지도 요청을 지도 섹션에 전달
- `src/chatbot/FestivalChatWidget.vue`: 답변 아래 지도 버튼과 `map-request` 이벤트
- `src/App.vue`: 챗봇 요청 상태, 탐색 화면 이동, props/emits 연결
- `tests/map-data.test.ts`: 정규화, 중복 제거, 좌표, 범주, 필터 단위 테스트
- `tests/chat-map-sources.test.ts`: 챗봇 출처의 지도 가능 여부와 정규화 단위 테스트

---

### Task 1: 공통 지도 데이터 계층

**Files:**
- Modify: `src/features/map/types.ts`
- Create: `src/features/map/data.ts`
- Create: `tests/map-data.test.ts`

**Interfaces:**
- Produces: `MapCategory`, `MapPlaceType`, `MapPlace`, `ChatMapRequest`, `MAP_CATEGORIES`
- Produces: `isValidSeoulCoordinate(latitude, longitude): boolean`
- Produces: `normalizeDatasetItems(items, type): MapPlace[]`
- Produces: `normalizeChatSources(sources): MapPlace[]`
- Produces: `filterMapPlaces(places, filters): MapPlace[]`
- Produces: `loadCategoryPlaces(category): Promise<MapPlace[]>`

- [ ] **Step 1: 정규화와 필터의 실패 테스트 작성**

`tests/map-data.test.ts`에 다음 사례를 작성한다.

```ts
import { describe, expect, it } from 'vitest'
import {
  filterMapPlaces,
  isValidSeoulCoordinate,
  MAP_CATEGORIES,
  normalizeChatSources,
  normalizeDatasetItems,
} from '../src/features/map/data'

describe('map data', () => {
  it('keeps one item per content id and removes invalid coordinates', () => {
    const items = [
      { contentid: '1', title: '서울 행사', addr1: '서울특별시 종로구', mapx: '126.98', mapy: '37.57' },
      { contentid: '1', title: '중복 행사', addr1: '서울특별시 종로구', mapx: '126.98', mapy: '37.57' },
      { contentid: '2', title: '잘못된 좌표', mapx: '0', mapy: '0' },
    ]
    expect(normalizeDatasetItems(items, 'festival')).toEqual([
      expect.objectContaining({ id: '1', title: '서울 행사', district: '종로구' }),
    ])
  })

  it('uses title and coordinates when content id is missing', () => {
    const item = { title: '같은 장소', mapx: '126.99', mapy: '37.56' }
    expect(normalizeDatasetItems([item, item], 'attraction')).toHaveLength(1)
  })

  it('accepts Seoul coordinates only', () => {
    expect(isValidSeoulCoordinate(37.5665, 126.978)).toBe(true)
    expect(isValidSeoulCoordinate(35.1796, 129.0756)).toBe(false)
  })

  it('excludes shopping from browse categories', () => {
    expect(MAP_CATEGORIES.map(({ value }) => value)).toEqual([
      'festival', 'attraction', 'culture', 'leisure', 'accommodation', 'course',
    ])
  })

  it('keeps shopping returned by chat', () => {
    expect(normalizeChatSources([{
      contentId: 'shop-1', type: 'shopping', title: '상점', summary: null,
      address: '서울특별시 중구', eventPlace: null, startDate: null, endDate: null,
      playTime: null, fee: null, ageLimit: null, phone: null, imageUrl: null,
      longitude: 126.99, latitude: 37.56, status: 'unknown', programExcerpt: null,
    }])).toEqual([expect.objectContaining({ id: 'shop-1', type: 'shopping' })])
  })

  it('filters every category by district and festivals by overlapping dates', () => {
    const places = normalizeDatasetItems([
      { contentid: '1', title: '종로 행사', addr1: '서울특별시 종로구', mapx: '126.98', mapy: '37.57', eventstartdate: '20260710', eventenddate: '20260720' },
      { contentid: '2', title: '강남 행사', addr1: '서울특별시 강남구', mapx: '127.03', mapy: '37.50', eventstartdate: '20260801', eventenddate: '20260802' },
    ], 'festival')
    expect(filterMapPlaces(places, { district: '종로구', startDate: '2026-07-15', endDate: '2026-07-16' }))
      .toHaveLength(1)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- tests/map-data.test.ts`

Expected: FAIL because `src/features/map/data.ts` and the new interfaces do not exist.

- [ ] **Step 3: 공통 타입 작성**

`src/features/map/types.ts`를 다음 공개 타입 중심으로 교체한다. 원본 필드는 JSON의 실제 키와 일치시킨다.

```ts
import type { LocalHubSource } from '../../../shared/chat-contract'

export type MapPlaceType = Exclude<LocalHubSource['type'], 'community'>
export type MapCategory = Exclude<MapPlaceType, 'shopping'>

export interface RawMapItem {
  contentid?: string | null
  title?: string | null
  addr1?: string | null
  addr2?: string | null
  mapx?: string | number | null
  mapy?: string | number | null
  firstimage?: string | null
  eventstartdate?: string | null
  eventenddate?: string | null
  eventplace?: string | null
  usetimefestival?: string | null
}

export interface RawMapDataset { items: RawMapItem[] }

export interface MapPlace {
  id: string
  type: MapPlaceType
  title: string
  address: string | null
  district: string | null
  latitude: number
  longitude: number
  imageUrl: string | null
  startDate: string | null
  endDate: string | null
  eventPlace: string | null
  fee: string | null
}

export interface ChatMapRequest {
  id: string
  sources: LocalHubSource[]
}
```

- [ ] **Step 4: 최소 정규화·필터·동적 로더 구현**

`src/features/map/data.ts`에 서울 좌표 범위 `37.4..37.75`, `126.7..127.3`, `contentid` 우선 중복 키, 제목·좌표 대체 키, 자치구 추출, 기간 겹침 필터를 구현한다. 로더는 아래처럼 파일별 명시적 import를 사용한다.

```ts
const loaders: Record<MapCategory, () => Promise<{ default: RawMapDataset }>> = {
  festival: () => import('../../../netlify/functions/data/서울_축제공연행사.json'),
  attraction: () => import('../../../netlify/functions/data/서울_관광지.json'),
  culture: () => import('../../../netlify/functions/data/서울_문화시설.json'),
  leisure: () => import('../../../netlify/functions/data/서울_레포츠.json'),
  accommodation: () => import('../../../netlify/functions/data/서울_숙박.json'),
  course: () => import('../../../netlify/functions/data/서울_여행코스.json'),
}

const cache = new Map<MapCategory, MapPlace[]>()

export async function loadCategoryPlaces(category: MapCategory): Promise<MapPlace[]> {
  const cached = cache.get(category)
  if (cached) return cached
  const module = await loaders[category]()
  const places = normalizeDatasetItems(module.default.items, category)
  cache.set(category, places)
  return places
}
```

`normalizeChatSources`는 `community`를 제외하되 `shopping`은 허용하고, 원본 응답의 좌표·제목·주소·기간·행사장·요금을 `MapPlace`로 복사한다.

- [ ] **Step 5: 데이터 테스트 통과 확인**

Run: `npm test -- tests/map-data.test.ts`

Expected: 6 tests PASS.

- [ ] **Step 6: 지도 데이터 계층만 커밋**

```powershell
git add src/features/map/types.ts src/features/map/data.ts tests/map-data.test.ts
git commit -m "feat: add shared category map data"
```

---

### Task 2: 공통 Leaflet 지도 렌더러

**Files:**
- Modify: `src/features/map/components/FestivalMap.vue`
- Modify: `src/features/map/FestivalMapSection.vue`

**Interfaces:**
- Consumes: `MapPlace[]`
- Consumes props: `{ places: MapPlace[]; highlighted?: boolean }`
- Produces: 범주 캔버스 마커, 챗봇 강조 마커, 안전한 팝업, 자동 화면 맞춤

- [ ] **Step 1: 기존 축제 전용 참조를 공통 입력으로 바꾸기**

`FestivalMap.vue`의 props를 다음으로 변경하고 `festival.mapx/mapy` 참조를 제거한다.

```ts
import type { MapPlace } from '../types'

const props = withDefaults(defineProps<{
  places: MapPlace[]
  highlighted?: boolean
}>(), { highlighted: false })
```

- [ ] **Step 2: 캔버스 지도와 유형별 마커 구현**

지도 생성 옵션에 `preferCanvas: true`를 추가한다. 탐색 모드는 `L.circleMarker`를 사용하고 챗봇 모드는 더 큰 반지름과 굵은 테두리를 사용한다.

```ts
const colors: Record<MapPlace['type'], string> = {
  festival: '#d9465f', attraction: '#3165ff', culture: '#7c3aed',
  leisure: '#0f9f77', accommodation: '#ea7c19', shopping: '#d43c93', course: '#2276a5',
}

function createMarker(place: MapPlace): L.CircleMarker {
  return L.circleMarker([place.latitude, place.longitude], {
    radius: props.highlighted ? 10 : 7,
    color: '#ffffff', weight: props.highlighted ? 3 : 2,
    fillColor: colors[place.type], fillOpacity: 0.9,
  })
}
```

팝업은 `type`, `title`, `address`를 항상 표시하고 이미지·기간·행사장·요금은 값이 있을 때만 표시한다. 모든 문자열은 기존 `escapeHtml`을 거친다.

- [ ] **Step 3: 마커 갱신과 화면 맞춤 구현**

`props.places`를 순회해 마커를 그린 뒤 좌표가 있으면 `fitBounds({ padding: [40, 40], maxZoom: 14 })`, 없으면 서울 중심 확대 11을 적용한다. `places`와 `highlighted`를 함께 watch한다.

```ts
watch(
  [() => props.places, () => props.highlighted],
  () => renderMarkers(true),
)
```

- [ ] **Step 4: 타입 검사로 전용 필드 제거 확인**

`FestivalMapSection.vue`의 초기 축제 배열을 `normalizeDatasetItems(festivalData.items, 'festival')`로 변환하고 필터 필드를 `district`, `startDate`, `endDate`로 바꾼 뒤 다음처럼 전달한다.

```vue
<FestivalMap :places="filteredFestivals" />
```

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: 렌더러 변경 커밋**

```powershell
git add src/features/map/components/FestivalMap.vue src/features/map/FestivalMapSection.vue
git commit -m "refactor: render common map places"
```

---

### Task 3: 범주 선택과 탐색·챗봇 지도 모드

**Files:**
- Modify: `src/features/map/FestivalMapSection.vue`
- Modify: `src/views/ExploreView.vue`

**Interfaces:**
- Consumes prop: `chatMapRequest: ChatMapRequest | null`
- Produces UI states: `browse`, `chat`, category loading/error, preserved filters

- [ ] **Step 1: 지도 섹션 상태를 공통 장소 기반으로 교체**

`FestivalMapSection.vue`에 다음 핵심 상태를 둔다.

```ts
const props = defineProps<{ chatMapRequest?: ChatMapRequest | null }>()
const mode = ref<'browse' | 'chat'>('browse')
const selectedCategory = ref<MapCategory>('festival')
const browsePlaces = ref<MapPlace[]>([])
const chatPlaces = ref<MapPlace[]>([])
const categoryLoading = ref(false)
const categoryError = ref('')
```

`selectCategory`는 단일 범주만 설정하고 `loadCategoryPlaces`를 호출한다. 실패 시 기존 `browsePlaces`를 유지하며 `categoryError`에 `지역정보를 불러오지 못했습니다. 다시 시도해 주세요.`를 저장한다.

- [ ] **Step 2: 범주·필터 UI 작성**

`MAP_CATEGORIES` 여섯 항목을 실제 button으로 렌더링하고 `aria-pressed`를 지정한다. 자치구 필터는 모든 탐색 범주에 표시하며 두 날짜 입력은 `selectedCategory === 'festival'`일 때만 표시한다. 범주 버튼을 누르면 `mode = 'browse'`로 돌아간다.

- [ ] **Step 3: 챗봇 모드와 복귀 구현**

`chatMapRequest`를 immediate watch하고 `normalizeChatSources` 결과가 있을 때만 `mode = 'chat'`로 전환한다. 탐색 필터 값은 수정하지 않는다.

```ts
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
    sectionElement.value?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  },
  { immediate: true },
)
```

`기존 지도로 돌아가기`는 `mode = 'browse'`만 변경한다. `FestivalMap`에는 `:places="visiblePlaces"`와 `:highlighted="mode === 'chat'"`를 전달한다.

- [ ] **Step 4: ExploreView 전달 계층 연결**

`ExploreView.vue`가 `ChatMapRequest | null` prop을 받고 그대로 지도 섹션에 전달한다.

```vue
<script setup lang="ts">
import FestivalMapSection from '../features/map/FestivalMapSection.vue'
import type { ChatMapRequest } from '../features/map/types'
defineProps<{ chatMapRequest?: ChatMapRequest | null }>()
</script>
<template><FestivalMapSection :chat-map-request="chatMapRequest" /></template>
```

- [ ] **Step 5: 범주 지도 타입·테스트 확인**

Run: `npm test -- tests/map-data.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: 범주 지도 커밋**

```powershell
git add src/features/map/FestivalMapSection.vue src/views/ExploreView.vue
git commit -m "feat: add single-category map browsing"
```

---

### Task 4: 챗봇 답변 버튼과 App 연결

**Files:**
- Modify: `src/chatbot/FestivalChatWidget.vue`
- Modify: `src/App.vue`
- Create: `tests/chat-map-sources.test.ts`

**Interfaces:**
- FestivalChatWidget emits: `map-request: [sources: LocalHubSource[]]`
- App produces: `ChatMapRequest { id: string; sources: LocalHubSource[] }`
- ExploreView consumes: `chatMapRequest`

- [ ] **Step 1: 챗봇 지도 가능 출처 테스트 작성**

`tests/chat-map-sources.test.ts`에서 `normalizeChatSources`가 커뮤니티·null 좌표·서울 밖 좌표를 제외하고 쇼핑 좌표는 유지하는지 검증한다.

```ts
import { describe, expect, it } from 'vitest'
import { normalizeChatSources } from '../src/features/map/data'
import type { LocalHubSource } from '../shared/chat-contract'

const source = (patch: Partial<LocalHubSource>): LocalHubSource => ({
  contentId: '1', type: 'festival', title: '장소', summary: null, address: null,
  eventPlace: null, startDate: null, endDate: null, playTime: null, fee: null,
  ageLimit: null, phone: null, imageUrl: null, longitude: 126.98, latitude: 37.56,
  status: 'unknown', programExcerpt: null, ...patch,
})

describe('chat map sources', () => {
  it('keeps only mappable recommendations including shopping', () => {
    const places = normalizeChatSources([
      source({ contentId: 'shop', type: 'shopping' }),
      source({ contentId: 'missing', latitude: null }),
      source({ contentId: 'community', type: 'community' }),
    ])
    expect(places.map(({ id, type }) => ({ id, type })))
      .toEqual([{ id: 'shop', type: 'shopping' }])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- tests/chat-map-sources.test.ts`

Expected: PASS after Task 1; this establishes the exact button predicate before UI wiring.

- [ ] **Step 3: 답변 아래 지도 버튼과 이벤트 추가**

`FestivalChatWidget.vue` emits에 다음을 추가한다.

```ts
const emit = defineEmits<{
  open: []
  close: []
  'map-request': [sources: LocalHubSource[]]
}>()

function hasMappableSources(sources?: LocalHubSource[]): boolean {
  return normalizeChatSources(sources ?? []).length > 0
}
```

각 assistant 메시지의 근거 카드 다음에 버튼 하나를 추가한다.

```vue
<button
  v-if="hasMappableSources(message.sources)"
  type="button"
  class="show-on-map-button"
  @click="emit('map-request', message.sources ?? [])"
>
  지도에서 보기
</button>
```

버튼은 기존 파란색 토큰, 최소 44px 터치 높이, 명확한 `:focus-visible` 스타일을 사용한다.

- [ ] **Step 4: App 상태와 탐색 화면 이동 연결**

`App.vue`에 `ChatMapRequest` 상태와 핸들러를 추가한다.

```ts
const chatMapRequest = ref<ChatMapRequest | null>(null)

function showChatRecommendations(sources: LocalHubSource[]): void {
  chatMapRequest.value = { id: createRequestId(), sources }
  navigate('explore')
}

function createRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
```

`ExploreView`에 `:chat-map-request="chatMapRequest"`, `FestivalChatWidget`에 `@map-request="showChatRecommendations"`를 연결한다. `createRequestId`는 `crypto.randomUUID()`를 우선 사용하고 시간·난수 문자열을 대체값으로 사용해 같은 답변 버튼을 반복 클릭해도 watch가 다시 실행되게 한다.

- [ ] **Step 5: 챗봇 지도 테스트와 타입 검사**

Run: `npm test -- tests/chat-map-sources.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: 챗봇 지도 연결 커밋**

```powershell
git add src/chatbot/FestivalChatWidget.vue src/App.vue tests/chat-map-sources.test.ts
git commit -m "feat: show chat recommendations on map"
```

---

### Task 5: 회귀·빌드·브라우저 검증

**Files:**
- Modify only if verification reveals a defect in files already in Tasks 1-4
- Reference: `docs/superpowers/specs/2026-07-15-map-chat-sync-and-category-design.md`

**Interfaces:**
- Verifies the complete category browse and chat-to-map flow.

- [ ] **Step 1: 전체 자동 검증 실행**

Run: `npm run verify`

Expected: Vitest PASS, TypeScript PASS, Vite production build PASS, Netlify Function bundle PASS.

- [ ] **Step 2: 프로덕션 번들 점검**

Run: `Get-ChildItem dist\assets | Sort-Object Length -Descending | Select-Object -First 15 Name,Length`

Expected: 각 동적 JSON 범주가 별도 청크로 생성되고 쇼핑 전체 JSON이 초기 앱 청크에 포함되지 않는다.

- [ ] **Step 3: 데스크톱 브라우저 검증**

Run: `npm run dev -- --host 127.0.0.1`

브라우저에서 다음을 확인한다.

1. 탐색 화면 기본 범주는 축제·행사다.
2. 여섯 버튼 중 하나만 `aria-pressed="true"`다.
3. 관광지·문화시설·레포츠·숙박·여행 코스에서 날짜 필터가 숨겨진다.
4. 자치구 필터와 결과 건수가 실제 마커에 맞는다.
5. `서울 호텔 추천해줘`, 축제 질문, 쇼핑 질문, 복합 질문의 답변 버튼이 올바른 추천을 표시한다.
6. `기존 지도로 돌아가기`가 마지막 범주와 필터를 복원한다.

- [ ] **Step 4: 모바일·접근성 검증**

390×844 뷰포트에서 범주 버튼 가로 스크롤 또는 줄바꿈, 지도 높이, 챗봇 전체 화면, 지도 이동 후 제목 포커스, reduced-motion 동작을 확인한다.

- [ ] **Step 5: 검증 수정이 있을 때만 해당 파일과 테스트 커밋**

```powershell
git add src/App.vue src/chatbot/FestivalChatWidget.vue src/features/map/data.ts src/features/map/types.ts src/features/map/FestivalMapSection.vue src/features/map/components/FestivalMap.vue src/views/ExploreView.vue tests/map-data.test.ts tests/chat-map-sources.test.ts
git commit -m "fix: complete map chat verification"
```

새 결함 수정이 없으면 추가 커밋을 만들지 않는다.
