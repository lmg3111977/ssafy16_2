# LocalHub 챗봇 검증 보고서

- 검증일: 2026-07-15
- 대상: 정적 데이터 7종 전체 범위 챗봇 최적화

## 판정

정적 프로젝트 정보 전체와 프로젝트 관련 일상대화로 범위를 확장했습니다. 질문별 제공자 라우팅, 제한된 후속 문맥, 서버 전용 API 키, 시간초과와 대체 응답이 자동 검증을 통과했습니다.

실시간 커뮤니티 게시글의 기본 검색 편입은 보류했습니다. 현재 번들 내부 JSON 쓰기 방식은 Netlify 영구 저장을 보장하지 않으므로, 그대로 연결하면 게시글 누락·Function 간 불일치가 발생할 수 있습니다.

## 자동 검증 결과

실행 명령: `npm run verify`

| 항목 | 결과 |
|---|---|
| Vitest | 7개 파일, 37개 테스트 통과 |
| TypeScript | 통과 |
| Vue 프로덕션 빌드 | 통과 |
| Netlify Function 번들 | 통과 |
| 챗봇 Function ZIP | 1,501,960 bytes, 약 1.50MB |
| Function 경로 | `POST /api/chat` |
| Rate Limit | IP당 60초에 10회 |

프론트 빌드 결과:

```text
dist/index.html                   0.59 kB
dist/assets/index-*.css          39.99 kB
dist/assets/index-*.js          513.15 kB
```

JS 청크가 500kB 경고 기준을 13.15kB 초과하지만 빌드는 성공했습니다. 이는 챗봇 Function 응답 속도와 별개인 프론트 초기 다운로드 위험이며, 후속 작업에서 지도 등 큰 화면 모듈을 동적 import 대상으로 검토할 수 있습니다.

## 검증한 동작

- 7종 데이터 질문 라우팅과 혼합 검색 균형
- `9월에`, `2026년 9월`, `종로구에서`, `무료인` 자연어 조건
- 인사·도움 요청의 검색 없는 LLM 경로
- 금융 등 범위 밖 질문의 OpenAI 미호출
- 최근 메시지 4개와 출처 ID 5개 제한
- 커뮤니티 비밀번호 필드 제거와 내용 길이 제한
- OpenAI 실패 시 대체 답변
- 브라우저 요청 시간초과와 재시도 가능 오류
- API 키 없는 fallback 모드

## 보안 설정

- `OPENAI_API_KEY`는 Netlify Function에서만 사용
- `VITE_OPENAI_API_KEY` 없음
- `.env` Git 제외
- Responses API `store: false`
- OpenAI 12초, 최대 재시도 1회
- `reasoning.effort: none`, 최대 출력 800토큰
- 질문 300자, 검색 근거 5건 제한
- 응답 `Cache-Control: no-store`

## 실행하지 않은 검증

- 실제 OpenAI 유료 API 호출
- 사용자 Netlify 계정의 프로덕션 배포
- 영구 저장소 기반 실시간 커뮤니티 연동
- 실제 모바일 기기 시각 회귀

비밀키, 배포 권한, 영구 저장소가 필요한 항목이므로 자동 실행하지 않았습니다.
