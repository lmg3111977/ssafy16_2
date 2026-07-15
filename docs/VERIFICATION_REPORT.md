# MVP 검증 보고서

- 검증일: 2026-07-15
- 검증 대상: 서울 축제 ChatLLM MVP
- 검증 목적: 기존 Vue 3 웹사이트에 붙이기 전, 독립 실행·검색·Function·통합 준비 상태를 확인

## 1. 최종 판정

현재 프로젝트는 **독립형 최소 MVP로 실행 가능**하며, Vue 3 + Vite + Netlify 기반 기존 사이트에 모듈 단위로 합칠 수 있도록 분리되어 있습니다.

다만 기존 실제 웹사이트 저장소가 제공되지 않았으므로, 기존 사이트와의 최종 통합은 구조 검토까지 완료된 상태입니다. 실제 합치기 단계에서는 CSS 전역 규칙, `/api/chat` 경로, `netlify.toml`, 모바일 하단 내비게이션의 충돌을 한 번 더 확인해야 합니다.

## 2. 자동 검증 결과

실행 명령:

```bash
npm run verify
```

결과:

| 항목 | 결과 |
|---|---|
| Vitest 테스트 파일 | 2개 통과 |
| 단위·Function 테스트 | 11개 통과 |
| TypeScript 검사 | 통과 |
| Vue 프로덕션 빌드 | 통과 |
| Netlify Function 번들 | 통과 |
| Function 라우트 | `POST /api/chat` 인식 |
| Rate Limit 설정 | IP 기준 60초당 10회 인식 |
| npm 보안 감사 | 취약점 0건 |

프로덕션 빌드 결과:

```text
dist/index.html                  0.57 kB
dist/assets/index-*.css        14.62 kB
dist/assets/index-*.js         82.62 kB
```

## 3. 실제 로컬 HTTP 검증

`npm run dev`로 프론트와 같은 Function 소스를 함께 실행했습니다.

### 정상 요청

```http
POST /api/chat
Content-Type: application/json

{"question":"9월 종로구 무료 축제 알려줘"}
```

확인 결과:

- HTTP 200
- 검색 결과 5건
- 모든 결과의 요금이 무료로 확인됨
- API 키가 없는 상태에서는 `fallback` 모드로 안전하게 응답
- 응답에 근거 데이터와 실행 모드 포함

### 잘못된 메서드

```http
GET /api/chat
```

확인 결과:

- HTTP 405
- `Allow: POST`
- `METHOD_NOT_ALLOWED` 오류 코드 반환

## 4. 데이터 무결성 검증

원본 업로드 파일과 프로젝트에 포함한 데이터 파일을 바이트 단위로 비교했습니다.

```text
원본: 제공받은 `서울_축제공연행사.json`
프로젝트: netlify/functions/data/seoul-festivals.json
SHA-256: 31f80360e3c71ea0ff072e6a6c6cb67affde59dec201c1c6077fae5593e8754a
```

판정:

- 두 파일의 SHA-256이 동일함
- 바이트 단위 동일함
- `region`: 서울
- `contentType`: 축제공연행사
- `total`: 201
- 실제 `items` 배열: 201건

원본 데이터 파일의 내용은 변경하지 않았고 프로젝트에서 읽기 쉬운 파일명만 사용했습니다.

## 5. 보안 검증

| 점검 | 결과 |
|---|---|
| 실제 `.env` 존재 여부 | 없음 |
| 실제 OpenAI 키 패턴 | 발견되지 않음 |
| `.env` Git 제외 규칙 | 포함됨 |
| `VITE_OPENAI_API_KEY` 사용 | 사용하지 않음 |
| 프론트에서 OpenAI 직접 호출 | 없음 |
| Function에서 `process.env.OPENAI_API_KEY` 사용 | 확인 |
| 질문 길이 제한 | 300자 |
| 검색 결과 제한 | 최대 5건 |
| LLM 출력 제한 | 최대 500토큰 |
| 검색 결과 없음 시 LLM 호출 | 하지 않음 |
| LLM 실패 시 복구 | 검색 기반 답변 반환 |
| 응답 캐시 | `no-store` |

## 6. UI·반응형 검증

확인한 상태:

1. 우측 하단 원형 상담 챗봇 아이콘
2. 아이콘 클릭 시 우측 하단 대화창 열림
3. 최소화 버튼으로 닫힘
4. 상담원 형태 헤더와 온라인 표시
5. 사용자·챗봇 말풍선 구분
6. 로딩 점 애니메이션
7. 빠른 질문 버튼
8. 근거 카드 접기·펼치기
9. 입력 300자 제한
10. 모바일 640px 이하 전체 화면 전환
11. 모바일 안전 영역 고려
12. `Teleport`를 사용해 부모 `overflow` 영향 축소

확인 이미지:

- `docs/screenshots/chatbot-closed.png`
- `docs/screenshots/chatbot-open.png`
- `docs/screenshots/chatbot-answer.png`
- `docs/screenshots/chatbot-mobile.png`

## 7. 기존 웹사이트 통합 검토

### 통합에 유리한 구조

- UI: `src/chatbot/`
- 공용 계약: `shared/chat-contract.ts`
- 서버 엔드포인트: `netlify/functions/chat.mts`
- 검색 로직: `netlify/functions/_shared/`
- 원본 데이터: `netlify/functions/data/`

UI, HTTP 처리, 검색, 데이터가 분리되어 있어 기존 Vue 페이지나 Router 구조를 변경하지 않고 위젯을 최상위 레이아웃에 한 번 추가할 수 있습니다.

### 최종 통합 전에 확인할 충돌

| 위험 | 가능성 | 대응 |
|---|---:|---|
| 기존 `/api/chat` 사용 | 중간 | Function 경로와 `apiEndpoint`를 함께 변경 |
| 기존 전역 `button`, `textarea`, `svg` CSS | 중간 | 실제 사이트에서 시각 회귀 확인 |
| 모바일 하단 탭과 런처 겹침 | 중간 | 컴포넌트 고정 위치 조정 |
| 기존 모달과 z-index 충돌 | 낮음~중간 | `zIndex` prop 조정 |
| 기존 `netlify.toml` 덮어쓰기 | 중간 | 파일을 덮지 말고 설정 병합 |
| 모노레포 Base directory | 프로젝트별 | Netlify 기준 경로 재확인 |
| 이미 설치된 Vue 버전 중복 | 낮음 | 기존 Vue를 유지하고 서버 패키지만 추가 |

## 8. 확장성 판정

MVP에 과도한 추상화는 넣지 않았지만 다음 확장은 현재 계약을 유지한 채 추가할 수 있습니다.

- 관광지·문화시설·숙박 검색 공급자 추가
- 축제 캘린더·지도에서 같은 `contentId` 사용
- 선택된 축제를 챗봇 후속 질문에 연결
- 최근 2~4개 메시지만 사용하는 제한적 문맥 대화
- SSE 스트리밍
- 검색 인덱스 또는 벡터 검색 교체

확장 시에도 `FestivalChatWidget`의 요청 형식과 `/api/chat` 응답 형식을 유지하면 기존 화면 수정량을 줄일 수 있습니다.

## 9. 실제로 검증하지 않은 항목

아래 항목은 계정 또는 비밀키가 필요하므로 이번 검증에서 실행하지 않았습니다.

- 실제 OpenAI 유료 API 응답
- 사용자 Netlify 계정의 프로덕션 배포
- 사용자 GitHub 계정의 새 원격 저장소 생성 및 Push
- 아직 제공되지 않은 기존 웹사이트 저장소와의 실제 병합 빌드

이 항목을 제외한 검색, UI, 요청 검증, Function 번들, 프로덕션 프론트 빌드는 완료했습니다.
