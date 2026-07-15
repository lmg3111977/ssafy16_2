# 기존 Vue 3 사이트 통합 가이드

## 결론

기존 사이트가 **Vue 3 + Vite + Netlify**라면 통합 난이도는 낮습니다. 챗봇 UI와 Function이 독립 모듈로 나뉘고, Router·Pinia·페이지 구조에 의존하지 않기 때문입니다.

다만 실제 기존 사이트 소스가 아직 제공되지 않았으므로 아래는 구조 검토 결과입니다. 최종 합치기 전에는 실제 저장소에서 빌드·모바일·z-index 충돌을 다시 확인해야 합니다.

## 1. 권장 통합 위치

챗봇은 모든 페이지에서 보여야 하므로 개별 View가 아니라 다음 중 하나에 배치합니다.

1. `App.vue`
2. 공통 `DefaultLayout.vue`
3. RouterView를 감싸는 최상위 Layout

```vue
<template>
  <Header />
  <RouterView />
  <FestivalChatWidget />
</template>
```

## 2. 복사 대상

```text
src/chatbot/
shared/chat-contract.ts
netlify/functions/chat.mts
netlify/functions/_shared/festival-answer.ts
netlify/functions/_shared/festival-data.ts
netlify/functions/_shared/festival-search.ts
netlify/functions/_shared/festival-types.ts
netlify/functions/data/seoul-festivals.json
```

로컬에서 기존 Vite 서버만으로 Function까지 시험하려면 다음도 복사합니다.

```text
vite-plugins/local-netlify-function.ts
```

그리고 기존 `vite.config.ts`에 `localNetlifyFunction()`을 추가합니다. 이미 Netlify CLI 또는 자체 API 프록시를 사용한다면 이 개발용 어댑터는 생략할 수 있습니다.

## 3. 패키지 충돌 점검

필수 패키지:

```bash
npm install openai @netlify/functions
```

프론트는 기존 Vue 3를 그대로 사용합니다. 동일 프로젝트에 다른 버전의 Vue를 중복 설치하지 않습니다.

## 4. 위젯 설정

```vue
<FestivalChatWidget
  api-endpoint="/api/chat"
  title="서울 축제 ChatLLM"
  subtitle="공공데이터 기반 상담 챗봇"
  primary-color="#3165ff"
  :z-index="1200"
  :show-sources="true"
/>
```

지원 prop:

| prop | 기본값 | 용도 |
|---|---|---|
| `apiEndpoint` | `/api/chat` | Function 경로 |
| `title` | 서울 축제 ChatLLM | 헤더 제목 |
| `subtitle` | 공공데이터 기반 상담 챗봇 | 상태 설명 |
| `welcomeMessage` | 기본 인사말 | 첫 메시지 |
| `primaryColor` | `#3165ff` | 브랜드 색상 |
| `zIndex` | `1200` | 기존 모달과 겹침 조정 |
| `initiallyOpen` | `false` | 데모·테스트용 초기 열림 |
| `showSources` | `true` | 근거 카드 표시 여부 |

## 5. CSS 충돌 방지 설계

- 위젯은 `Teleport to="body"`를 사용합니다.
- 스타일은 Vue `scoped`입니다.
- 클래스는 챗봇 컴포넌트 내부에서만 사용합니다.
- 부모의 `overflow: hidden`에 의해 대화창이 잘리는 문제를 줄였습니다.
- 모바일 640px 이하에서는 전체 화면으로 전환합니다.
- `env(safe-area-inset-*)`를 사용해 모바일 안전 영역을 고려합니다.

확인할 기존 전역 CSS:

```css
button { ... }
textarea { ... }
svg { ... }
* { transition: ... }
```

기존 사이트가 `!important`로 전역 요소를 강제하면 위젯 스타일에 영향을 줄 수 있습니다.

## 6. z-index와 모바일 하단 내비게이션

기본 z-index는 1200입니다. 기존 사이트에서 다음 기준을 확인합니다.

```text
페이지 콘텐츠 < 헤더 < 드롭다운 < 챗봇 < 모달 < 긴급 알림
```

모바일 하단 탭이 있는 사이트에서는 아이콘과 겹치는지 확인하고, 필요하면 위젯 컴포넌트의 고정 위치 값을 프로젝트 테마에 맞게 조정합니다.

## 7. API 경로 충돌

기존 프로젝트에 `/api/chat`이 이미 있으면 두 값을 함께 변경합니다.

`chat.mts`:

```ts
export const config = {
  path: '/api/festival-chat',
  // ...
}
```

Vue:

```vue
<FestivalChatWidget api-endpoint="/api/festival-chat" />
```

## 8. netlify.toml 병합

기존 파일을 덮어쓰지 말고 다음 항목을 병합합니다.

```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
```

기존 사이트가 모노레포라면 Netlify의 Base directory를 기준으로 Functions 경로가 맞는지 확인합니다.

## 9. 환경변수

로컬 `.env`와 Netlify 사이트 환경변수에만 저장합니다.

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
CHATBOT_FORCE_FALLBACK=false
```

금지:

```env
VITE_OPENAI_API_KEY=...
```

## 10. 합친 뒤 필수 검증

1. 모든 라우트에서 아이콘이 한 번만 표시되는가
2. 아이콘이 모바일 하단 메뉴와 겹치지 않는가
3. 대화창이 헤더·모달 뒤로 숨지 않는가
4. `/api/chat`이 200을 반환하는가
5. `.env`가 Git 추적 대상이 아닌가
6. API 키 문자열이 `dist`에 없는가
7. 질문 연속 클릭이 중복 전송되지 않는가
8. 429·500 오류 문구가 사용자에게 표시되는가
9. 소스 카드의 긴 제목·주소가 레이아웃을 깨지 않는가
10. Netlify 배포 환경에서 Function 로그가 정상인가

## 11. 통합 위험도

| 항목 | 위험도 | 대응 |
|---|---:|---|
| Vue 3 컴포넌트 결합 | 낮음 | 독립 모듈·표준 Composition API |
| Router/Pinia 충돌 | 낮음 | 의존하지 않음 |
| 전역 CSS 충돌 | 낮음~중간 | scoped·Teleport, 실제 저장소 확인 |
| API 경로 중복 | 중간 | `config.path`와 prop 동시 변경 |
| Netlify 설정 병합 | 중간 | 기존 `netlify.toml` 덮어쓰기 금지 |
| 모바일 하단 UI 겹침 | 중간 | 실제 기기에서 위치 조정 |
| JavaScript-only 프로젝트 | 중간 | TypeScript 설정 추가 또는 `<script setup>` 변환 |
| 다른 배포 플랫폼 | 높음 | Function 배포 방식을 해당 플랫폼에 맞게 변경 |
