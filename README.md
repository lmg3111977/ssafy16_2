# LocalHub 서울 축제 LLM 챗봇 MVP

서울 축제·공연·행사 JSON을 먼저 검색한 뒤, 관련 결과만 OpenAI 모델에 전달하는 **Vue 3 + Netlify Functions 기반 독립형 챗봇 MVP**입니다.

현재 단계의 목적은 기존 LocalHub 웹사이트에 합치기 전에 챗봇을 별도로 실행하고 검증하는 것입니다.

## 완성된 화면 형태

- 화면 우측 하단에 원형 챗봇 이미지 버튼 표시
- 버튼 클릭 시 우측 하단에 실제 상담 서비스 형태의 대화창 표시
- 모바일에서는 화면 전체에 가까운 채팅창으로 자동 전환
- 메시지 말풍선, 입력창, 추천 질문, 로딩 표시, 근거 데이터 카드 제공
- 챗봇 이미지·색상·위치·API 경로를 props로 변경 가능

## 시스템 구조

```text
사용자 브라우저
└─ Vue 3 FestivalChatbot
   └─ POST /api/chat
      └─ Netlify Function
         ├─ 서울 축제 JSON 검색
         ├─ 최근 근거 결과를 이용한 후속 질문 처리
         ├─ 검색 결과 최대 5건 추출
         ├─ OpenAI Responses API 호출
         └─ 답변 + 원본 근거 반환
```

브라우저에는 `OPENAI_API_KEY`가 전달되지 않습니다.

## 대화 문맥 범위

챗봇은 전체 대화를 무제한 저장하지 않습니다. 가장 최근에 근거가 표시된 축제 결과의 `contentId`만 최대 5개까지 다음 요청에 전달합니다.

따라서 다음과 같은 짧은 후속 질문을 처리할 수 있습니다.

```text
사용자: 문학주간 2026 일정 알려줘
챗봇: 문학주간 2026의 일정과 장소 안내
사용자: 요금이 어떻게 돼?
챗봇: 앞서 안내한 문학주간 2026의 이용 요금은 무료입니다.
```

새 축제명을 직접 말하거나 새로운 자치구·월·기간 조건을 입력하면 이전 문맥보다 새 질문을 우선합니다. 새로고침하거나 대화를 초기화하면 문맥도 초기화됩니다.

## 빠른 실행

```bash
npm install
cp .env.example .env
npm run dev:netlify
```

Windows PowerShell에서는 다음 명령을 사용합니다.

```powershell
Copy-Item .env.example .env
npm run dev:netlify
```

`.env`에는 실제 `OPENAI_API_KEY`를 입력하되 `VITE_` 접두사는 사용하지 않습니다.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
CHATBOT_FORCE_FALLBACK=false
```

API 키가 없거나 `CHATBOT_FORCE_FALLBACK=true`이면 JSON 검색 결과만으로 안전하게 답합니다.

전체 검증:

```bash
npm run check
```

검증 항목에는 TypeScript 검사, 단위 테스트, 프로덕션 빌드가 포함됩니다.

## 기존 Vue 3 사이트 통합

```vue
<script setup lang="ts">
import { FestivalChatbot } from '@/features/chatbot'
</script>

<template>
  <RouterView />
  <FestivalChatbot />
</template>
```

챗봇 UI와 Netlify Function은 분리되어 있으므로 기존 Vue Router·Pinia 구조와 독립적으로 통합할 수 있습니다. 통합 시 기존 `/api/chat` 경로, `netlify.toml`, 전역 버튼 스타일, 모바일 하단 메뉴, z-index 충돌을 확인해야 합니다.

## 데이터 복원

원본 축제 JSON은 저장소 크기를 줄이기 위해 `data-archive/`의 분할 압축 파일로 보관합니다. `npm install`과 `npm run build` 전에 `scripts/restore-data.mjs`가 조각을 파일명 순서대로 결합하여 다음 파일을 복원합니다.

```text
netlify/functions/data/seoul-festivals.json
```

복원된 파일은 생성 파일이므로 Git 추적 대상에서 제외되어 있습니다.

## 데이터 출처

- 제공 기관: 한국관광공사
- 데이터: TourAPI 4.0 국문 관광정보 서비스
- 대상: 서울 축제·공연·행사 201건
- 라이선스: 공공누리 제3유형, 출처 표시 + 변경 금지
