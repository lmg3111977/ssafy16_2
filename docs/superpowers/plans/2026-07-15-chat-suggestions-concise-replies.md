# Chat Suggestions and Concise Replies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return three answerable, clickable follow-up questions when the chatbot cannot answer and keep generated replies concise.

**Architecture:** Add a deterministic suggestion helper that preserves supported location qualifiers without making another OpenAI request. Extend the shared response contract, attach suggestions only to out-of-scope and zero-result responses, and render them as buttons in the Vue widget. Tighten generation instructions and remove verbose follow-up menus from generated text.

**Tech Stack:** Vue.js 3, TypeScript 5.9, Vitest 4, Netlify Functions, OpenAI Responses API

## Global Constraints

- Do not add dependencies.
- Preserve existing uncommitted community changes.
- Preserve `reasoning.effort: "minimal"` for `gpt-5-mini` compatibility.
- Suggestions must be generated without an additional OpenAI request.
- Return exactly three suggestions only for out-of-scope or zero-result data questions.
- Keep normal LLM replies to three sentences and remove verbose follow-up menus.

---

### Task 1: Deterministic suggestion generator and response contract

**Files:**
- Create: `netlify/functions/_shared/chat-suggestions.ts`
- Modify: `shared/chat-contract.ts`
- Create: `tests/chat-suggestions.test.ts`

**Interfaces:**
- Produces: `createChatSuggestions(question: string): [string, string, string]`
- Produces: optional `FestivalChatResponse.suggestions?: string[]`

- [ ] **Step 1: Write failing tests**

Test that `강남구 음식점 추천해줘` returns three questions beginning with `강남구`, excludes `음식점`, and includes supported 관광지·쇼핑·숙박 categories. Test that `주식 종목 추천해줘` returns the three stable default questions.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/chat-suggestions.test.ts`

Expected: FAIL because `chat-suggestions.ts` does not exist.

- [ ] **Step 3: Implement the helper and contract**

Use the 25 Seoul district names already established by the search code. Return district-specific templates when a district is present; otherwise return:

```ts
[
  '오늘 진행 중인 서울 축제 알려줘',
  '서울 여행 코스 추천해줘',
  '서울 호텔 추천해줘',
]
```

Add `suggestions?: string[]` to `FestivalChatResponse`.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/chat-suggestions.test.ts && npm run typecheck`

Commit the helper, contract, and focused test.

---

### Task 2: Function fallback behavior and concise generated replies

**Files:**
- Modify: `netlify/functions/chat.mts`
- Modify: `tests/chat-handler.test.ts`

**Interfaces:**
- Consumes: `createChatSuggestions(question)`
- Produces: short out-of-scope and zero-result responses with `suggestions`
- Produces: `makeReplyConcise(reply: string): string`

- [ ] **Step 1: Write failing Function tests**

Assert that an out-of-scope request makes zero generator calls and returns three suggestions. Assert that an unmatched Seoul data question returns three suggestions without calling the generator. Assert that a generated reply containing `원하시면 다음 중 선택해 주세요` removes that follow-up menu and stays within 420 characters.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/chat-handler.test.ts`

Expected: FAIL because responses do not contain suggestions and generated replies are not compacted.

- [ ] **Step 3: Implement minimal Function behavior**

For `out-of-scope`, return one support sentence plus `createChatSuggestions(question)`. For `project-data` with zero sources, return one clarification sentence plus suggestions before checking the API key. Export and apply `makeReplyConcise()` only to LLM output; remove text from follow-up markers such as `원하시면`, `다음 중`, and `원하시는`, then cap the result at 420 characters. Add generation instructions requiring no more than three sentences and forbidding repeated limitation menus.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- tests/chat-handler.test.ts && npm run typecheck`

Commit only the Function and its tests, while retaining the existing model compatibility setting.

---

### Task 3: Clickable recommendation buttons and full verification

**Files:**
- Create: `src/chatbot/suggestions.ts`
- Modify: `src/chatbot/types.ts`
- Modify: `src/chatbot/FestivalChatWidget.vue`
- Create: `tests/chat-suggestions-ui.test.ts`

**Interfaces:**
- Consumes: `FestivalChatResponse.suggestions`
- Produces: `normalizeChatSuggestions(suggestions): string[]`
- Produces: assistant message suggestion buttons that call `sendQuestion(suggestion)`

- [ ] **Step 1: Write a failing client normalization test**

Assert that `normalizeChatSuggestions()` trims text, removes empty and duplicate values, and returns at most three suggestions.

- [ ] **Step 2: Verify the test fails for the intended contract gap**

Run: `npm test -- tests/chat-suggestions-ui.test.ts`

Expected: FAIL because `src/chatbot/suggestions.ts` does not exist.

- [ ] **Step 3: Implement widget rendering**

Implement `normalizeChatSuggestions()`. Add `suggestions?: string[]` to `ChatMessage`, normalize and pass response suggestions into `createAssistantMessage`, and render each value as a button below the assistant response. Clicking a button calls `sendQuestion(suggestion)` and uses the existing loading, timeout, and context flow.

- [ ] **Step 4: Run full verification**

Run: `npm run verify`

Expected: all tests, TypeScript, Vue build, and Netlify Function bundling pass.

- [ ] **Step 5: Review scope and commit**

Run: `git diff --check` and `git status --short`. Commit only the chatbot and test files; do not stage unrelated community changes.
