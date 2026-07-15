# LocalHub Full-Scope Chatbot Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the chatbot to all provided Seoul project data and public community context while reducing search, reasoning, and output latency.

**Architecture:** Keep Vue 3 -> `/api/chat` -> Netlify Function -> OpenAI Responses API. Route each question before retrieval, search only relevant providers, normalize all evidence into one source contract, and pass at most five candidates to `gpt-5.6-luna`. Permit project-related casual conversation without retrieval and use deterministic fallback only when OpenAI is unavailable.

**Tech Stack:** Vue.js 3, TypeScript 5.9, Vite 8, Vitest 4, Netlify Functions, OpenAI Node SDK 6, static TourAPI JSON.

## Global Constraints

- Keep `OPENAI_API_KEY` server-only; never introduce a `VITE_` API key.
- Keep Netlify Functions as the only OpenAI caller.
- Do not install new dependencies.
- Do not modify `src/community/api.ts` or `tests/community-storage.test.mjs`; they contain concurrent user work.
- Never send community passwords or password hashes to `/api/chat`.
- Use only the seven provided JSON types; do not invent restaurant support.
- Normal supported questions use the LLM; fallback is only for missing key, timeout, or OpenAI failure.
- Default to `gpt-5.6-luna`, `reasoning.effort: "none"`, `max_output_tokens: 800`.
- Client timeout is 15 seconds; OpenAI timeout is 12 seconds with at most one retry.

---

### Task 1: Define the unified chat contract and query router

**Files:**
- Modify: `shared/chat-contract.ts`
- Create: `netlify/functions/_shared/query-router.ts`
- Create: `tests/query-router.test.ts`

**Interfaces:**
- Produces: `LocalHubSourceType`, `LocalHubSource`, `ChatContext`, `ChatRoute`, `routeChatQuestion(question)`.
- Consumes: no earlier task interfaces.

- [ ] **Step 1: Write failing router tests**

Add cases asserting:

```ts
expect(routeChatQuestion('9월에 열리는 축제 알려줘').kind).toBe('project-data')
expect(routeChatQuestion('호텔 추천해줘').sourceTypes).toEqual(['accommodation'])
expect(routeChatQuestion('안녕, 오늘도 도와줄 수 있어?').kind).toBe('project-chat')
expect(routeChatQuestion('주식 종목 추천해줘').kind).toBe('out-of-scope')
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm test -- tests/query-router.test.ts`

Expected: FAIL because `query-router.ts` does not exist.

- [ ] **Step 3: Add unified contracts**

Define these exact public shapes in `shared/chat-contract.ts`:

```ts
export type LocalHubSourceType =
  | 'festival' | 'attraction' | 'culture' | 'leisure'
  | 'accommodation' | 'shopping' | 'course' | 'community'

export interface LocalHubSource {
  contentId: string
  type: LocalHubSourceType
  title: string
  summary: string | null
  address: string | null
  eventPlace: string | null
  startDate: string | null
  endDate: string | null
  fee: string | null
  phone: string | null
  imageUrl: string | null
  longitude: number | null
  latitude: number | null
  status: 'ongoing' | 'upcoming' | 'ended' | 'unknown'
}

export interface ChatContext {
  recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  sourceIds?: string[]
  communityPosts?: Array<{
    id: string
    title: string
    content: string
    createdAt: string
  }>
}
```

Change `FestivalChatRequest` to include optional `context`, change response `sources` to `LocalHubSource[]`, and keep `export type FestivalSource = LocalHubSource` as a compatibility alias.

- [ ] **Step 4: Implement deterministic routing**

Create `routeChatQuestion(question)` returning:

```ts
export type ChatRoute =
  | { kind: 'project-data'; sourceTypes: LocalHubSourceType[] }
  | { kind: 'project-chat'; sourceTypes: [] }
  | { kind: 'out-of-scope'; sourceTypes: [] }
```

Use explicit type keywords first, project-casual phrases second, high-risk or clearly unrelated keywords third, and default ambiguous Seoul travel questions to `project-data` with the seven static source types.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/query-router.test.ts`

Expected: PASS.

Commit:

```bash
git add shared/chat-contract.ts netlify/functions/_shared/query-router.ts tests/query-router.test.ts
git commit -m "feat: add chatbot query routing contract"
```

---

### Task 2: Build provider-scoped unified search

**Files:**
- Create: `netlify/functions/_shared/localhub-data.ts`
- Create: `netlify/functions/_shared/localhub-search.ts`
- Modify: `netlify/functions/_shared/festival-search.ts`
- Modify: `netlify/functions/_shared/festival-answer.ts`
- Create: `tests/localhub-search.test.ts`
- Modify: `tests/festival-search.test.ts`

**Interfaces:**
- Consumes: `LocalHubSource`, `LocalHubSourceType`, `routeChatQuestion()`.
- Produces: `searchLocalHub(question, { sourceTypes, communityPosts, limit, today })`.

- [ ] **Step 1: Add failing natural-language and provider tests**

Cover these exact behaviors:

```ts
expect(searchLocalHub('9월에 축제', festivalOptions).length).toBeGreaterThan(0)
expect(searchLocalHub('무료인 축제', festivalOptions).every(x => /무료|0원/.test(x.fee ?? ''))).toBe(true)
expect(searchLocalHub('종로구에서 열리는 축제', festivalOptions).length).toBeGreaterThan(0)
expect(searchLocalHub('2026년 9월 축제', festivalOptions).length).toBeGreaterThan(0)
expect(searchLocalHub('호텔 추천', accommodationOptions).every(x => x.type === 'accommodation')).toBe(true)
expect(searchLocalHub('서울 여행 코스', courseOptions).every(x => x.type === 'course')).toBe(true)
```

Add a mixed-provider assertion that caps each provider before global ranking so shopping results cannot occupy all five positions.

- [ ] **Step 2: Run search tests and verify red**

Run: `npm test -- tests/festival-search.test.ts tests/localhub-search.test.ts`

Expected: FAIL on 조사/date expressions and missing unified search module.

- [ ] **Step 3: Create lazy normalized provider indexes**

Import the seven provided JSON files in `localhub-data.ts`. Map each raw item to a compact internal index containing normalized title, address, content type, coordinates, image, phone, and original identifiers. Cache the normalized array per provider in module-level `Map<LocalHubSourceType, IndexedSource[]>` so warm invocations reuse it.

- [ ] **Step 4: Fix Korean intent normalization**

In `festival-search.ts`, separate date/filter tokens from lexical terms. Recognize `YYYY년 M월`, `M월에`, `내일`, `이번 주`, and `다음 달`. Strip particles only from recognized district and intent tokens; do not remove arbitrary final characters from proper nouns.

- [ ] **Step 5: Implement provider-scoped ranking**

Implement `searchLocalHub()` so it searches only requested providers, takes at most three candidates from each provider, merges them, sorts by lexical and intent score, and returns at most five sources. Convert public community posts directly to `LocalHubSource` without passwords.

- [ ] **Step 6: Generalize deterministic fallback answers**

Update `festival-answer.ts` to describe mixed `LocalHubSource` results using title, type label, address, dates, and fee when present. For project-chat fallback, return a short greeting and supported-domain reminder.

- [ ] **Step 7: Run search regression and commit**

Run: `npm test -- tests/festival-search.test.ts tests/localhub-search.test.ts`

Expected: PASS for existing seven festival tests and new unified tests.

Commit:

```bash
git add netlify/functions/_shared tests/festival-search.test.ts tests/localhub-search.test.ts
git commit -m "feat: add provider scoped LocalHub search"
```

---

### Task 3: Optimize and harden the Netlify chat Function

**Files:**
- Modify: `netlify/functions/chat.mts`
- Modify: `tests/chat-handler.test.ts`

**Interfaces:**
- Consumes: `routeChatQuestion()`, `searchLocalHub()`, `ChatContext`.
- Produces: validated `/api/chat` responses for project data, casual chat, out-of-scope, fallback, timeout, and LLM modes.

- [ ] **Step 1: Add failing Function tests**

Add tests for invalid context roles, more than four recent messages, more than five source IDs, community password-field removal, out-of-scope response without OpenAI, and project-chat routing with no sources. Inject an OpenAI request function into an exported `createChatHandler()` so timeout and failure behavior can be tested without a real API key.

- [ ] **Step 2: Run Function tests and verify red**

Run: `npm test -- tests/chat-handler.test.ts`

Expected: FAIL because context validation and handler injection do not exist.

- [ ] **Step 3: Validate and sanitize request context**

Reject malformed roles and oversized arrays with `INVALID_CONTEXT`. Trim recent message content to 300 characters, retain at most four messages, source IDs to five, community posts to twenty, title to 100 characters, and content to 500 characters. Construct new public objects so unknown fields such as `password` cannot cross the boundary.

- [ ] **Step 4: Route before retrieval**

- `out-of-scope`: return a concise supported-scope reply without OpenAI.
- `project-chat`: skip JSON retrieval and call OpenAI with recent messages.
- `project-data`: search only routed providers, then call OpenAI with at most five sources.

- [ ] **Step 5: Apply latency settings**

Construct the client with:

```ts
new OpenAI({ apiKey, timeout: 12_000, maxRetries: 1 })
```

Call Responses API with:

```ts
{
  model,
  store: false,
  reasoning: { effort: 'none' },
  max_output_tokens: 800,
  instructions,
  input,
}
```

Keep the model configurable through `OPENAI_MODEL`, but do not add browser-visible configuration.

- [ ] **Step 6: Run Function regression and commit**

Run: `npm test -- tests/chat-handler.test.ts`

Expected: PASS with no paid OpenAI call.

Commit:

```bash
git add netlify/functions/chat.mts tests/chat-handler.test.ts
git commit -m "feat: optimize chatbot Function routing"
```

---

### Task 4: Add safe browser context, timeout, retry, and generic evidence cards

**Files:**
- Create: `src/chatbot/community-context.ts`
- Modify: `src/chatbot/api.ts`
- Modify: `src/chatbot/FestivalChatWidget.vue`
- Modify: `src/chatbot/types.ts`
- Create: `tests/chat-api.test.ts`
- Create: `tests/chat-community-context.test.ts`

**Interfaces:**
- Consumes: `ChatContext`, `LocalHubSource`.
- Produces: `readPublicCommunityContext(storageKey)`, 15-second `askFestivalChat()`, retryable widget state.

- [ ] **Step 1: Add failing API and community-context tests**

Use fake timers and an in-memory Storage implementation to verify:

```ts
await expect(askFestivalChat('/api/chat', '질문', undefined, 10)).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' })
expect(readPublicCommunityContext('localhub-community-posts')[0]).not.toHaveProperty('password')
```

Also assert at most twenty public posts and content truncation to 500 characters.

- [ ] **Step 2: Run focused tests and verify red**

Run: `npm test -- tests/chat-api.test.ts tests/chat-community-context.test.ts`

Expected: FAIL because timeout and public-context helpers do not exist.

- [ ] **Step 3: Implement safe community snapshot reading**

Read `localStorage` defensively, accept only array entries with string `id`, `title`, and `content`, create new public objects, and never spread stored objects. Return an empty array for unavailable or malformed storage.

- [ ] **Step 4: Implement the 15-second client timeout**

Extend `askFestivalChat(endpoint, question, context?, timeoutMs = 15_000, signal?)`. Combine the caller signal with an internal `AbortController`, clear the timer in `finally`, and throw `FestivalChatApiError('응답 시간이 초과되었습니다.', 408, 'REQUEST_TIMEOUT')` only when the internal timer caused the abort.

- [ ] **Step 5: Send bounded conversation context**

In the widget, build context from the last four user/assistant messages, last answer source IDs, and `readPublicCommunityContext('localhub-community-posts')`. Do not include the welcome message when it is the only assistant message.

- [ ] **Step 6: Add retry and generic cards**

Store `lastFailedQuestion`, show a `다시 시도` button for timeout/network errors, and clear it on success. Render source type labels and optional common fields instead of assuming every source is a festival. Cap rendered messages at fifty after each completed turn.

- [ ] **Step 7: Run client tests and commit**

Run: `npm test -- tests/chat-api.test.ts tests/chat-community-context.test.ts`

Expected: PASS.

Commit only chatbot files; leave concurrent community files unstaged:

```bash
git add src/chatbot tests/chat-api.test.ts tests/chat-community-context.test.ts
git commit -m "feat: add chatbot timeout retry and context"
```

---

### Task 5: Align docs and run full verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/VERIFICATION_REPORT.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: final verified behavior from Tasks 1-4.
- Produces: accurate setup, supported-scope, limits, and verification documentation.

- [ ] **Step 1: Update configuration and scope documentation**

Document the seven supported data types, missing restaurant data, project-related casual conversation, 15-second client timeout, 12-second OpenAI timeout, `reasoning.effort: none`, and 800 output-token cap. Keep only `OPENAI_API_KEY`, `OPENAI_MODEL`, and `CHATBOT_FORCE_FALLBACK` in `.env.example`.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run verify
```

Expected: all Vitest files pass, TypeScript succeeds, Vite production build succeeds, and Netlify Functions bundle succeeds.

- [ ] **Step 3: Inspect Function bundle size**

Run:

```bash
npm run bundle:functions
```

Record the chat Function artifact size in `docs/VERIFICATION_REPORT.md`. If the expanded artifact or cold-start test is materially worse, retain provider routing but move raw JSON to explicit `included_files` and load only routed files at runtime before changing memory settings.

- [ ] **Step 4: Review git scope and commit**

Run:

```bash
git status --short
git diff --check
```

Confirm `src/community/api.ts` and `tests/community-storage.test.mjs` remain unstaged.

Commit:

```bash
git add README.md docs/ARCHITECTURE.md docs/VERIFICATION_REPORT.md .env.example
git commit -m "docs: document full scope chatbot behavior"
```
