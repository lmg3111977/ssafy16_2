# LocalHub Blue UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved presentation-ready layout while preserving the current blue visual identity and every existing map, community, and chatbot behavior.

**Architecture:** Keep one Vue 3 static SPA and introduce a small hash-backed `home | explore | community` view state. Wrap the existing map and community components in focused views, keep the chatbot mounted globally, and centralize visual values in CSS custom properties. Do not change domain contracts, persistence, API calls, or Function behavior.

**Tech Stack:** Vue.js 3, TypeScript 5.9, Vite 8, Vitest 4, Leaflet 1.9, existing scoped CSS.

## Global Constraints

- Use the existing blue palette: primary `#3165FF`, strong `#2757E6`, ink `#15213A`, page `#F7F9FC`, card `#FFFFFF`.
- Do not install dependencies.
- Do not change `CommunityPost`, localStorage keys, CRUD signatures, or password behavior.
- Do not change chat request/response contracts, OpenAI settings, search behavior, or Netlify Function logic.
- Do not change map filtering or marker logic.
- Preserve all pre-existing uncommitted changes in `netlify/functions/chat.mts`, `src/community/api.ts`, `src/components/CommunityBoard.vue`, and `tests/community-storage.test.ts`.
- Use `frontend-design:frontend-design` at execution time for visual review, after this plan is approved.
- Keep the site deployable as one static Vue SPA with the chatbot mounted once in `App.vue`.

---

### Task 1: Freeze the baseline and add blue design tokens

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/base.css`
- Test: existing `tests/*.test.ts`

**Interfaces:**
- Produces: CSS variables consumed by all later UI tasks.
- Consumes: no new TypeScript interfaces.

- [ ] **Step 1: Record the dirty baseline without changing it**

Run:

```powershell
git status --short
git diff -- netlify/functions/chat.mts src/community/api.ts src/components/CommunityBoard.vue tests/community-storage.test.ts
```

Expected: the known user changes remain visible and unstaged.

- [ ] **Step 2: Run the existing focused logic tests**

Run:

```powershell
npm test -- tests/festival-search.test.ts tests/chat-handler.test.ts tests/community-storage.test.ts
```

Expected: all focused tests pass. If dependencies are unavailable or any test fails, stop and report the baseline instead of changing feature logic.

- [ ] **Step 3: Create the exact token file**

Create `src/styles/tokens.css`:

```css
:root {
  --lh-primary: #3165ff;
  --lh-primary-strong: #2757e6;
  --lh-primary-soft: #edf2ff;
  --lh-ink: #15213a;
  --lh-text: #4a5870;
  --lh-muted: #778196;
  --lh-page: #f7f9fc;
  --lh-card: #ffffff;
  --lh-line: #e4e9f1;
  --lh-success: #1d6f31;
  --lh-danger: #9b2330;
  --lh-radius-sm: 12px;
  --lh-radius-md: 18px;
  --lh-radius-lg: 24px;
  --lh-radius-xl: 32px;
  --lh-shadow-soft: 0 16px 38px rgba(31, 51, 91, 0.08);
  --lh-shadow-float: 0 28px 72px rgba(31, 51, 91, 0.18);
  --lh-content: 1120px;
}
```

- [ ] **Step 4: Import tokens and normalize focus styles**

Add this as the first line of `src/styles/base.css`:

```css
@import './tokens.css';
```

Replace literal root colors with:

```css
:root {
  font-family: Inter, Pretendard, "Noto Sans KR", system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--lh-ink);
  background: var(--lh-page);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background: var(--lh-page);
}

button:focus-visible,
textarea:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 3px solid rgba(49, 101, 255, 0.3);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 5: Verify and commit the token foundation**

Run:

```powershell
npm run typecheck
npm run build
git diff --check
```

Expected: typecheck and build exit 0; diff check prints nothing.

Commit only the token files:

```powershell
git add src/styles/tokens.css src/styles/base.css
git commit -m "style: add LocalHub blue design tokens"
```

---

### Task 2: Build the hash-backed SPA shell

**Files:**
- Create: `src/navigation/view-state.ts`
- Create: `tests/view-state.test.ts`
- Create: `src/layout/SiteHeader.vue`
- Create: `src/views/ExploreView.vue`
- Create: `src/views/CommunityView.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Produces: `AppView`, `parseViewHash(hash)`, `toViewHash(view)`, `SiteHeader` prop `activeView` and event `navigate`.
- Consumes: existing `FestivalMapSection`, `CommunityBoard`, and `FestivalChatWidget`.

- [ ] **Step 1: Write the failing view-state test**

Create `tests/view-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseViewHash, toViewHash } from '../src/navigation/view-state'

describe('LocalHub SPA view state', () => {
  it('supports the three approved views', () => {
    expect(parseViewHash('#home')).toBe('home')
    expect(parseViewHash('#explore')).toBe('explore')
    expect(parseViewHash('#community')).toBe('community')
  })

  it('falls back to home for unknown hashes', () => {
    expect(parseViewHash('')).toBe('home')
    expect(parseViewHash('#unknown')).toBe('home')
  })

  it('serializes views to stable hashes', () => {
    expect(toViewHash('home')).toBe('#home')
    expect(toViewHash('explore')).toBe('#explore')
    expect(toViewHash('community')).toBe('#community')
  })
})
```

- [ ] **Step 2: Run the test and verify red**

Run: `npm test -- tests/view-state.test.ts`

Expected: FAIL because `src/navigation/view-state.ts` does not exist.

- [ ] **Step 3: Implement the minimal view-state contract**

Create `src/navigation/view-state.ts`:

```ts
export type AppView = 'home' | 'explore' | 'community'

const views = new Set<AppView>(['home', 'explore', 'community'])

export function parseViewHash(hash: string): AppView {
  const candidate = hash.replace(/^#/, '') as AppView
  return views.has(candidate) ? candidate : 'home'
}

export function toViewHash(view: AppView): string {
  return `#${view}`
}
```

- [ ] **Step 4: Run the focused test and verify green**

Run: `npm test -- tests/view-state.test.ts`

Expected: 3 tests pass.

- [ ] **Step 5: Create the header interface**

Create `src/layout/SiteHeader.vue` with:

```vue
<script setup lang="ts">
import type { AppView } from '../navigation/view-state'

defineProps<{ activeView: AppView }>()
const emit = defineEmits<{ navigate: [view: AppView] }>()

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
        LocalHub
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
```

Style it with a 72px sticky desktop header, centered pill tabs, `var(--lh-primary-strong)` active state, and a fixed bottom tab bar below 700px. Use `padding-bottom: calc(88px + env(safe-area-inset-bottom))` on the mobile app shell.

- [ ] **Step 6: Add view wrappers and App state**

`ExploreView.vue` renders only `<FestivalMapSection />`; `CommunityView.vue` renders only `<CommunityBoard />`. In `App.vue`, keep `FestivalChatWidget` outside the switched view and use:

```ts
const activeView = ref<AppView>(parseViewHash(window.location.hash))

function navigate(view: AppView): void {
  activeView.value = view
  window.location.hash = toViewHash(view)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleHashChange(): void {
  activeView.value = parseViewHash(window.location.hash)
}

onMounted(() => window.addEventListener('hashchange', handleHashChange))
onBeforeUnmount(() => window.removeEventListener('hashchange', handleHashChange))
```

Render `SiteHeader`, one active view using `v-if`, the existing data-source footer, and exactly one `FestivalChatWidget`.

- [ ] **Step 7: Verify shell behavior and commit**

Run:

```powershell
npm test -- tests/view-state.test.ts
npm run typecheck
npm run build
```

Expected: tests, typecheck, and build pass.

Commit:

```powershell
git add src/navigation src/layout src/views src/App.vue tests/view-state.test.ts
git commit -m "style: add LocalHub SPA presentation shell"
```

---

### Task 3: Implement the blue presentation home view

**Files:**
- Create: `src/views/HomeView.vue`
- Modify: `src/App.vue`
- Modify: `index.html`

**Interfaces:**
- Produces: `HomeView` event `navigate(view: AppView)`.
- Consumes: no feature data mutations; static counts copied from the provided JSON totals.

- [ ] **Step 1: Create the HomeView public interface**

Use:

```vue
<script setup lang="ts">
import type { AppView } from '../navigation/view-state'
const emit = defineEmits<{ navigate: [view: AppView] }>()

const stats = [
  { value: '6,518', label: '서울 지역정보' },
  { value: '201', label: '축제·공연·행사' },
  { value: '7', label: '제공 데이터 유형' },
  { value: '25', label: '서울 자치구' },
]
</script>
```

The template must contain:

- one dark-blue two-column hero with the existing headline;
- `축제 둘러보기` calling `emit('navigate', 'explore')`;
- four stat cards from `stats`;
- three shortcut cards for map, community, and chatbot guidance;
- no nonfunctional form control and no fake data-entry button.

- [ ] **Step 2: Apply exact layout limits**

Use `width: min(var(--lh-content), calc(100% - 40px))`, hero minimum height 520px, `grid-template-columns: 1.08fr .92fr`, 32px radius, and a `linear-gradient(135deg, #172b50, #3165ff)` art panel. Below 800px use one column, 40px horizontal-safe padding, and hide only decorative shapes—not content.

- [ ] **Step 3: Update document metadata**

Change `index.html` title to `LocalHub | 서울 지역정보 커뮤니티` and description to `서울 공공데이터 기반 축제 지도, 익명 커뮤니티, 지역정보 챗봇 서비스`.

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npm run build`

Expected: exit 0 and no chunk-loading error.

Commit:

```powershell
git add src/views/HomeView.vue src/App.vue index.html
git commit -m "style: redesign LocalHub home view"
```

---

### Task 4: Restyle the existing festival map without logic changes

**Files:**
- Modify: `src/features/map/FestivalMapSection.vue`
- Modify: `src/features/map/components/FestivalFilter.vue`
- Modify: `src/features/map/components/FestivalMap.vue`

**Interfaces:**
- Consumes: all existing props, emits, computed filters, marker rendering, and popup data.
- Produces: no new TypeScript interface.

- [ ] **Step 1: Capture the logic-only diff boundary**

Run:

```powershell
git diff --unified=0 -- src/features/map/FestivalMapSection.vue src/features/map/components/FestivalFilter.vue src/features/map/components/FestivalMap.vue
```

Expected: no pre-existing map changes or a recorded list that must be preserved.

- [ ] **Step 2: Recompose the current map blocks without behavior changes**

Keep every current `v-model`, computed property, event, and condition. Preserve the existing `map-feature-header` block without content changes. Insert `<div class="map-feature-workspace">` immediately before the existing `<div class="map-feature-filter-card">`, and close that wrapper immediately after the existing `<div class="map-feature-card">` closing tag. The filter card retains `FestivalFilter`, both date inputs, the conditional reset button, and `isInvalidDateRange`; the map card retains `FestivalMap :festivals="filteredFestivals"` and the current empty-state condition. Do not add a filter, result transformation, event, or data card.

- [ ] **Step 3: Apply token-based map styling**

Use a 320px/1fr desktop grid, 24px gap, white cards, 24px radius, `var(--lh-shadow-soft)`, and 900px single-column breakpoint. Set the map height to 560px desktop and 480px mobile. Change popup badge and marker colors to `var(--lh-primary)` while preserving popup HTML escaping and coordinate validation.

- [ ] **Step 4: Run map and build verification**

Run:

```powershell
npm test -- tests/festival-search.test.ts
npm run typecheck
npm run build
git diff --check
```

Expected: all existing search tests pass; build succeeds.

- [ ] **Step 5: Commit map styling only**

```powershell
git add src/features/map
git commit -m "style: refine LocalHub festival map layout"
```

---

### Task 5: Restyle the current community UI without changing CRUD

**Files:**
- Modify: `src/components/CommunityBoard.vue`
- Test: `tests/community-storage.test.ts`

**Interfaces:**
- Consumes: current localStorage CRUD functions and the current component refs/functions.
- Produces: no new community field, request type, storage key, or event.

- [ ] **Step 1: Run the current community regression test**

Run: `npm test -- tests/community-storage.test.ts`

Expected: all current localStorage tests pass before styling.

- [ ] **Step 2: Preserve the script block byte-for-byte unless a class binding requires a template-only change**

Do not change `storageKey`, refs, computed values, submit/update/delete functions, or `onMounted`. Keep the existing title/content/password fields and inline edit/delete panels.

- [ ] **Step 3: Apply the approved visual hierarchy**

Use:

- section width `min(var(--lh-content), calc(100% - 40px))`;
- desktop columns `minmax(320px, .82fr) minmax(0, 1.18fr)`;
- 24px gap and 24px card radius;
- form card with `border-top: 4px solid var(--lh-primary)`;
- post cards with white background, `var(--lh-line)` border, 18px radius;
- primary buttons `var(--lh-primary)`, secondary buttons `#e7ebf2`, delete confirmation `var(--lh-danger)`;
- edit/delete panels with `var(--lh-primary-soft)` background and 14px radius;
- 900px single-column breakpoint.

Add `type="button"` to non-submit buttons where absent, without changing click handlers.

- [ ] **Step 4: Verify behavior remained unchanged**

Run:

```powershell
npm test -- tests/community-storage.test.ts
npm run typecheck
npm run build
git diff --check
```

Expected: the same community tests pass; typecheck and build succeed.

- [ ] **Step 5: Review the diff for logic changes and commit**

Run: `git diff -- src/components/CommunityBoard.vue`

Expected: changes are confined to template semantics, classes, and CSS; no CRUD function body changed.

Commit:

```powershell
git add src/components/CommunityBoard.vue
git commit -m "style: polish LocalHub community board"
```

---

### Task 6: Align chatbot styling with the blue UI

**Files:**
- Modify: `src/chatbot/FestivalChatWidget.vue`

**Interfaces:**
- Consumes: current props, message state, API call, quick questions, sources, and mobile behavior.
- Produces: no new prop, event, request field, or response field.

- [ ] **Step 1: Record the component behavior boundary**

Run:

```powershell
git diff --unified=0 -- src/chatbot/FestivalChatWidget.vue
rg -n "sendQuestion|askFestivalChat|messages|quickQuestions|apiEndpoint" src/chatbot/FestivalChatWidget.vue
```

Expected: existing behavior locations are recorded before CSS work.

- [ ] **Step 2: Replace only visual literals with tokens**

Use `var(--lh-primary)` for launcher, send button, active status, and user bubbles; `var(--lh-ink)` for header text/background accents; `var(--lh-primary-soft)` for quick questions and source-card badges; `var(--lh-shadow-float)` for the panel. Keep the existing 640px full-screen media query, safe-area values, `Teleport`, and z-index prop.

- [ ] **Step 3: Verify chat logic and build**

Run:

```powershell
npm test -- tests/chat-handler.test.ts tests/festival-search.test.ts
npm run typecheck
npm run build
```

Expected: existing chat/search tests pass and the build succeeds.

- [ ] **Step 4: Confirm no script logic changed and commit**

Run: `git diff -- src/chatbot/FestivalChatWidget.vue`

Expected: only style declarations and non-behavioral class names changed.

Commit:

```powershell
git add src/chatbot/FestivalChatWidget.vue
git commit -m "style: align chatbot with LocalHub blue UI"
```

---

### Task 7: Run full functional and visual verification

**Files:**
- Modify only if verified copy is stale: `docs/VERIFICATION_REPORT.md`

**Interfaces:**
- Consumes: final UI from Tasks 1-6.
- Produces: verification evidence, not new behavior.

- [ ] **Step 1: Run the complete repository verification**

Run:

```powershell
npm run verify
```

Expected: all Vitest suites pass, TypeScript passes, Vite build succeeds, and both Netlify Functions bundle successfully. If a pre-existing concurrent test fails, report it separately and do not edit feature logic to hide it.

- [ ] **Step 2: Check repository scope**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: only planned UI files plus preserved pre-existing user changes are present.

- [ ] **Step 3: Verify desktop UI at 1440×900**

Check these states in the browser:

1. Home hero, four stats, three shortcut cards, and one chatbot launcher.
2. Explore tab: filter panel left, map right, no clipped Leaflet controls.
3. Community tab: writing form left, recent posts right, edit/delete panels readable.
4. Chatbot open: panel fits viewport and source cards wrap long titles.

Expected: no overlap, clipping, horizontal scrollbar, or unreadable contrast.

- [ ] **Step 4: Verify tablet and mobile UI**

At `768×1024`, confirm map and community become one column. At `390×844`, confirm bottom tabs stay visible, content has bottom safe spacing, the launcher does not cover navigation, and the open chatbot fills the screen.

- [ ] **Step 5: Verify accessibility states**

Use keyboard Tab/Enter/Escape where supported. Confirm visible focus on tabs, inputs, buttons, and chatbot controls. Enable reduced motion and confirm hover/scroll movement is removed.

- [ ] **Step 6: Update verification copy only with fresh evidence**

If `docs/VERIFICATION_REPORT.md` claims old asset sizes or test counts, replace those exact values with the output from Step 1. Do not change architecture or feature-scope documentation in this design-only task.

- [ ] **Step 7: Commit verified documentation if it changed**

```powershell
git add docs/VERIFICATION_REPORT.md
git commit -m "docs: record blue UI verification"
```

Skip this commit when the report requires no update.
