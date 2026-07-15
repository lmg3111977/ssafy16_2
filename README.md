# 서울 LocalHub ChatLLM

Vue 3 기반 서울 지역정보 커뮤니티와 Netlify Functions 챗봇입니다. OpenAI API 키는 브라우저가 아니라 `netlify/functions/chat.mts`에서만 읽습니다.

## 구현 범위

- 제공 JSON 7종 6,518건: 관광지, 문화시설, 레포츠, 숙박, 쇼핑, 여행 코스, 축제·공연·행사
- 질문을 먼저 분류하고 관련 데이터 종류만 검색
- 제공자별 최대 3건, 최종 근거 최대 5건으로 제한
- 프로젝트 관련 인사·도움 요청 등 가벼운 일상대화 허용
- 범위 밖 금융·의료·법률·코딩 요청은 OpenAI를 호출하지 않고 안내
- 최근 대화 최대 4개와 직전 출처 ID 최대 5개를 후속 질문 문맥으로 사용
- 브라우저 15초, OpenAI 12초 시간 제한과 실패 시 재시도 UI
- API 키 없음·LLM 장애 시 검증된 검색 결과로 대체 응답
- 지도 시각화와 익명 커뮤니티 게시판 포함

제공 파일에는 음식점 데이터가 없으므로 음식점 추천은 지원하지 않습니다. 실시간 커뮤니티 글은 Netlify 영구 저장소가 도입되기 전까지 챗봇의 기본 검색 근거에 포함하지 않으며, 브라우저에 공개 스냅샷이 있을 때만 비밀번호를 제외한 보조 문맥으로 사용합니다.

## 실행 흐름

```text
Vue 3 Chat Widget
  -> POST /api/chat
  -> Netlify Function 요청·문맥 검증
  -> 질문 분류
     -> 범위 밖: 즉시 안내
     -> 프로젝트 일상대화: 검색 생략
     -> 데이터 질문: 관련 JSON만 검색, 최대 5건
  -> OpenAI Responses API 또는 안전한 대체 응답
```

## 로컬 실행

Node.js 22 권장, 최소 20.19가 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 열고 다음 질문을 시험합니다.

```text
2026년 9월 종로구에서 무료인 축제 알려줘
서울 호텔 추천해줘
서울 여행 코스 알려줘
안녕, 무엇을 도와줄 수 있어?
```

## OpenAI 설정

```powershell
Copy-Item .env.example .env
```

`.env`에는 아래 서버 전용 변수만 둡니다.

```env
OPENAI_API_KEY=실제_키
OPENAI_MODEL=gpt-5.6-luna
CHATBOT_FORCE_FALLBACK=false
```

`VITE_OPENAI_API_KEY`는 만들지 마세요. `VITE_` 변수는 브라우저 번들에 노출될 수 있습니다. 실제 `.env`와 키는 커밋하지 않습니다.

## 응답 최적화 값

- 모델 기본값: `gpt-5.6-luna`
- `reasoning.effort`: `none`
- 최대 출력: 800토큰
- OpenAI 제한: 12초, 재시도 최대 1회
- 브라우저 제한: 15초
- 질문: 최대 300자
- OpenAI 근거: 최대 5건
- 배포 Rate Limit: IP당 60초에 10회

스트리밍은 초기 응답 복잡도와 장애 지점을 늘리므로 현재 버전에서는 사용하지 않습니다.

## 검증

```bash
npm run verify
```

이 명령은 Vitest, TypeScript, Vue 프로덕션 빌드, Netlify Function 번들을 차례로 확인합니다. 최신 결과는 [검증 보고서](docs/VERIFICATION_REPORT.md)를 참고하세요.

## 배포

Netlify 환경변수에 `OPENAI_API_KEY`, `OPENAI_MODEL`, `CHATBOT_FORCE_FALLBACK`을 등록합니다. `netlify.toml`의 빌드 명령은 `npm run build`, 게시 폴더는 `dist`, Function 폴더는 `netlify/functions`입니다.

## 주요 경로

```text
src/chatbot/                          챗봇 UI, 문맥, 시간 제한, 재시도
shared/chat-contract.ts               브라우저·Function 공용 계약
netlify/functions/chat.mts            요청 검증, 라우팅, OpenAI 호출
netlify/functions/_shared/             검색·라우터·대체 응답
netlify/functions/data/                제공된 서울 JSON
tests/                                 검색·Function·브라우저 API 테스트
docs/                                  설계와 검증 기록
```

## 알려진 한계

- 키워드·조건 기반 검색이며 벡터 검색은 아닙니다.
- JSON 수집 시점 이후의 변경은 자동 반영되지 않습니다.
- 음식점 JSON이 없어 음식점 검색을 지원하지 않습니다.
- 현재 커뮤니티 Function의 번들 내부 JSON 쓰기는 Netlify에서 영구 저장을 보장하지 않습니다. 운영 게시글 연동에는 Netlify Blobs나 외부 DB 등 영구 저장소가 필요합니다.
- 실제 OpenAI 유료 호출과 사용자 Netlify 계정 배포는 별도 확인이 필요합니다.
