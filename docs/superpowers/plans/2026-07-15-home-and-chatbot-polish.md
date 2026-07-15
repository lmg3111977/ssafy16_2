# Home and Chatbot Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home statistics with four representative categories, add a chatbot return-to-start control, and display concise chatbot sentences on separate lines.

**Architecture:** Keep the home change inside its existing static `stats` array. Keep chatbot reset behavior local to `FestivalChatWidget.vue`, where the request controller and all conversation refs already live. Normalize generated answer sentences in the server function so the existing `white-space: pre-wrap` client rendering displays one sentence per line without a new renderer.

**Tech Stack:** Vue 3 Composition API, TypeScript 5.9, Vitest 4, Netlify Functions, CSS

## Global Constraints

- Show `783 관광지`, `201 축제·행사`, `566 문화시설`, and `423 숙박` in that order.
- Preserve the current home card layout, responsive behavior, and styling.
- Show `↺ 처음으로` only after conversation has started.
- Reset to the welcome message and the existing three quick questions while keeping the widget open.
- Put each chatbot answer sentence on a new line with no blank line between sentences.
- Preserve the existing maximum three-sentence and 420-character limits.
- Do not add a Markdown renderer or any new dependency.

---

### Task 1: Home representative categories

**Files:**
- Create: `tests/home-stats-ui.test.ts`
- Modify: `src/views/HomeView.vue:8-13`

**Interfaces:**
- Consumes: the existing `stats: Array<{ value: string; label: string }>` template contract.
- Produces: four static category records rendered by the existing `v-for`.

- [ ] **Step 1: Write the failing source contract test**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')

describe('home representative category stats', () => {
  it('shows the approved categories and source record counts in order', () => {
    const expected = [
      "{ value: '783', label: '관광지' }",
      "{ value: '201', label: '축제·행사' }",
      "{ value: '566', label: '문화시설' }",
      "{ value: '423', label: '숙박' }",
    ]
    const indexes = expected.map((entry) => source.indexOf(entry))

    expect(indexes.every((index) => index >= 0)).toBe(true)
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right))
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/home-stats-ui.test.ts`

Expected: FAIL because the current source still contains the aggregate statistics.

- [ ] **Step 3: Replace only the home `stats` entries**

```ts
const stats = [
  { value: '783', label: '관광지' },
  { value: '201', label: '축제·행사' },
  { value: '566', label: '문화시설' },
  { value: '423', label: '숙박' },
]
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- tests/home-stats-ui.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the independently working home change**

```powershell
git add -- src/views/HomeView.vue tests/home-stats-ui.test.ts
git commit -m "feat: show representative home categories"
```

### Task 2: Chatbot return-to-start control

**Files:**
- Create: `tests/chat-reset-ui.test.ts`
- Modify: `src/chatbot/FestivalChatWidget.vue:40-68, 276-490, 810-840`

**Interfaces:**
- Consumes: `props.welcomeMessage`, `quickQuestions`, `activeController`, `messages`, `draft`, `isLoading`, `errorMessage`, and `lastFailedQuestion`.
- Produces: `resetConversation(): Promise<void>` and a conditional `↺ 처음으로` footer button.

- [ ] **Step 1: Write the failing source contract test**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('../src/chatbot/FestivalChatWidget.vue', import.meta.url),
  'utf8',
)

describe('chatbot return-to-start control', () => {
  it('restores the welcome state and exposes the control only after conversation starts', () => {
    expect(source).toContain('function resetConversation()')
    expect(source).toContain('activeController?.abort()')
    expect(source).toContain('content: props.welcomeMessage')
    expect(source).toContain('v-if="messages.length > 1"')
    expect(source).toContain('@click="resetConversation"')
    expect(source).toContain('↺ 처음으로')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/chat-reset-ui.test.ts`

Expected: FAIL because the reset function and button do not exist.

- [ ] **Step 3: Add a reusable welcome message creator and reset function**

```ts
function createWelcomeMessage(): ChatMessage {
  return {
    id: createId(),
    role: 'assistant',
    content: props.welcomeMessage,
    createdAt: new Date(),
    mode: 'search',
  }
}

const messages = ref<ChatMessage[]>([createWelcomeMessage()])

async function resetConversation(): Promise<void> {
  activeController?.abort()
  activeController = null
  messages.value = [createWelcomeMessage()]
  draft.value = ''
  isLoading.value = false
  errorMessage.value = ''
  lastFailedQuestion.value = ''
  await focusInput()
}
```

- [ ] **Step 4: Add the conditional footer control and scoped styling**

```vue
<button
  v-if="messages.length > 1"
  type="button"
  class="reset-chat-button"
  @click="resetConversation"
>
  ↺ 처음으로
</button>
```

```css
.reset-chat-button {
  padding: 0;
  border: 0;
  color: var(--chat-primary);
  font: inherit;
  font-weight: 800;
  background: transparent;
  cursor: pointer;
}
```

Place the button as the first child of `.composer-meta`; keep the existing notice and remaining-character display unchanged.

- [ ] **Step 5: Run the focused test and type checker**

Run: `npm test -- tests/chat-reset-ui.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 6: Commit the independently working reset control**

```powershell
git add -- src/chatbot/FestivalChatWidget.vue tests/chat-reset-ui.test.ts
git commit -m "feat: add chatbot return-to-start control"
```

### Task 3: Sentence line breaks in chatbot replies

**Files:**
- Modify: `tests/chat-handler.test.ts:139-157`
- Modify: `netlify/functions/chat.mts:131-150`
- Modify: `netlify/functions/_shared/festival-answer.ts:20-54`

**Interfaces:**
- Consumes: raw model text and fallback source records.
- Produces: reply strings containing a single `\n` between sentences or result entries; the existing `.message-bubble p { white-space: pre-wrap; }` displays those line breaks.

- [ ] **Step 1: Change the concise-reply expectation to require single line breaks**

```ts
expect(makeReplyConcise(reply)).toBe(
  '시장 세 곳을 확인했습니다.\n주소는 근거 카드에서 볼 수 있습니다.\n세부 품목은 제공되지 않습니다.',
)
expect(makeReplyConcise('한 문장입니다.')).toBe('한 문장입니다.')
expect(makeReplyConcise('가'.repeat(500)).length).toBeLessThanOrEqual(420)
```

Add a fallback assertion to the existing API-key-free test:

```ts
expect(body.reply).not.toContain('\n\n')
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/chat-handler.test.ts`

Expected: FAIL because `makeReplyConcise` currently joins sentences with spaces and multi-result fallback answers use blank lines.

- [ ] **Step 3: Preserve one newline between concise model sentences**

In `makeReplyConcise`, replace the final join operation:

```ts
.join('\n')
```

Keep marker removal, the three-part slice, and the 420-character truncation unchanged.

- [ ] **Step 4: Remove blank lines from multi-result fallback answers**

Change the multi-result return in `festival-answer.ts` to:

```ts
return `조건에 맞는 서울 지역 정보 ${sources.length}건을 찾았습니다.\n${list.join('\n')}`
```

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `npm test -- tests/chat-handler.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the independently working formatting change**

```powershell
git add -- netlify/functions/chat.mts netlify/functions/_shared/festival-answer.ts tests/chat-handler.test.ts
git commit -m "feat: format chatbot replies with line breaks"
```

### Task 4: Full verification

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: all three completed tasks.
- Produces: evidence that tests, type checking, production build, and Netlify function bundling still pass.

- [ ] **Step 1: Run the project verification command**

Run: `npm run verify`

Expected: all Vitest tests pass, `vue-tsc` exits with code 0, Vite creates `dist`, and Netlify bundles the functions without errors.

- [ ] **Step 2: Review the final diff and working tree**

Run: `git diff HEAD~3 --check`

Expected: exit code 0 with no whitespace errors.

Run: `git status --short`

Expected: only the pre-existing untracked `tmp/` entry remains.
