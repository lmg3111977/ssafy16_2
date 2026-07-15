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
         ├─ 검색 결과 최대 5건 추출
         ├─ OpenAI Responses API 호출
         └─ 답변 + 원본 근거 반환
```

브라우저에는 `OPENAI_API_KEY`가 전달되지 않습니다.

## MVP에 포함된 기능

- 우측 하단 플로팅 챗봇 이미지
- 데스크톱 상담 패널 및 모바일 전체 화면 UI
- Enter 전송, Shift+Enter 줄바꿈, Esc 닫기
- 중복 전송 방지 및 요청 취소
- 질문 최대 300자 제한
- 축제명·월·자치구·무료·오늘·주말·예정 행사 검색
- 검색 결과가 없으면 LLM 호출 생략
- API 키가 없거나 OpenAI 호출이 실패해도 JSON 검색 답변 제공
- 답변 근거가 된 축제 카드 표시
- IP 기준 Netlify Rate Limit
- TypeScript 검사, 단위 테스트, 프로덕션 빌드
- 기존 Vue 3 프로젝트에 복사 가능한 독립 모듈 구조

## 빠른 실행

```bash
npm install
cp .env.example .env
npm run dev:netlify
```

Windows PowerShell에서는 `Copy-Item .env.example .env`를 사용합니다. `.env`에 실제 `OPENAI_API_KEY`를 입력하되 `VITE_` 접두사는 사용하지 않습니다. API 키가 없어도 JSON 검색 모드로 동작합니다.

전체 검증:

```bash
npm run check
```

현재 검증 결과는 TypeScript 통과, 테스트 9개 통과, 프로덕션 빌드 통과입니다.

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

상세 설정·보안·Netlify 배포·통합 체크리스트는 저장소의 전체 README와 `docs/` 문서를 확인하세요.

## 데이터

- 제공 기관: 한국관광공사
- 데이터: TourAPI 4.0 국문 관광정보 서비스
- 대상: 서울 축제·공연·행사 201건
- 라이선스: 공공누리 제3유형, 출처 표시 + 변경 금지
