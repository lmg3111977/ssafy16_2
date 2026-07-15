# 아키텍처 설계

## 1. 실행 흐름

```text
사용자
  -> Vue 3 FestivalChatWidget
  -> POST /api/chat
  -> Netlify Function
       -> 요청 검증
       -> 서울 축제 JSON 201건 검색
       -> 최대 5건 선택
       -> OpenAI Responses API 또는 검색 답변
  -> 답변 + 근거 카드 표시
```

## 2. 모듈 분리 이유

### `src/chatbot`

- 챗봇 표시와 사용자 상호작용만 담당합니다.
- Router, Pinia, 기존 페이지 구조를 알 필요가 없습니다.
- API 주소와 색상, z-index, 초기 열림 상태를 prop으로 받습니다.

### `shared/chat-contract.ts`

- 브라우저와 Function이 같은 요청·응답 타입을 사용합니다.
- 필드명 불일치로 생기는 통합 오류를 줄입니다.

### `netlify/functions/chat.mts`

- HTTP 메서드와 입력을 검증합니다.
- OpenAI API 키는 이 서버 영역에서만 읽습니다.
- 관련 검색 결과만 LLM에 전달합니다.
- LLM 장애 시 검색 답변으로 복구합니다.

### `_shared/festival-search.ts`

- 날짜, 자치구, 무료 여부, 축제명 검색을 담당합니다.
- HTTP와 OpenAI 코드에서 분리되어 단위 테스트가 가능합니다.

### `vite-plugins/local-netlify-function.ts`

- 로컬 Vite 서버의 `/api/chat`을 실제 `chat.mts` 함수로 전달합니다.
- 프로덕션 배포에는 포함되지 않는 개발 전용 어댑터입니다.
- `npm run dev` 한 번으로 프론트와 Function을 같이 확인할 수 있습니다.

## 3. 보안 경계

```text
브라우저에서 보임                 서버에서만 보임
-------------------------------  -------------------------------
질문과 답변                       OPENAI_API_KEY
/api/chat 주소                    OpenAI 호출 코드
공개된 근거 데이터                시스템 지침
                                  Rate Limit 설정
```

`VITE_` 접두사의 값은 브라우저 번들에 들어갈 수 있으므로 API 키에 사용하지 않습니다.

## 4. 비용과 정확성 제어

- JSON 201건 전체를 매번 전송하지 않습니다.
- 서버 검색 결과를 최대 5건으로 제한합니다.
- 모델 출력은 최대 500토큰입니다.
- 결과가 없으면 OpenAI를 호출하지 않습니다.
- 입력은 300자로 제한합니다.
- 배포 환경에서 IP 기준 분당 10회 제한을 설정합니다.

## 5. 확장 방향

### 관광지·숙박·문화시설 추가

각 원본 항목을 공통 검색 문서로 변환하고 검색 공급자를 추가합니다. UI 계약을 유지하면 위젯은 그대로 사용할 수 있습니다.

```ts
interface SearchProvider {
  search(question: string, limit: number): SearchSource[]
}
```

MVP에는 불필요한 추상화를 실제 코드에 강제하지 않았지만, 데이터·검색·HTTP·UI를 이미 나누어 두어 해당 구조로 확장할 수 있습니다.

### 문맥형 후속 질문

현재 요청은 `{ question }` 하나입니다. 후속 버전에서는 최근 메시지 전체보다 `selectedContentId` 또는 최근 2~4개 메시지만 전달하는 방식이 비용과 오염 가능성을 줄입니다.

### 스트리밍

MVP는 일반 JSON 응답을 사용합니다. 기능이 안정된 뒤 SSE와 Responses API 스트리밍을 추가할 수 있습니다.

### 커뮤니티 게시글 검색

게시글이 브라우저 localStorage에만 있다면 Netlify Function이 직접 읽을 수 없습니다. 브라우저에서 게시글을 검색하거나, 필요한 게시글 일부만 요청 본문에 명시적으로 넣어야 합니다.
