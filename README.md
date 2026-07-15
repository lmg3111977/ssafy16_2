# 서울 LocalHub

서울의 관광지, 문화시설, 숙박, 쇼핑, 여행 코스, 축제 정보를 한곳에서 찾는 Vue 기반 웹페이지입니다.

## 주요 기능

- 서울 지역정보 검색과 지도 표시
- 조건에 맞는 장소와 축제 추천 챗봇
- 브라우저에 저장되는 익명 커뮤니티
- PC와 모바일에 대응하는 단일 페이지 화면

챗봇은 프로젝트에 포함된 JSON 데이터를 먼저 검색합니다. OpenAI를 사용하는 경우에도 API 키는 브라우저가 아닌 Netlify Function에서만 읽습니다.

## 실행 방법

Node.js 20.19 이상이 필요합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 주소를 브라우저에서 엽니다. 기본 주소는 `http://localhost:5173`입니다.

## OpenAI 연결

API 키가 없어도 JSON 검색 기반 답변을 확인할 수 있습니다. OpenAI 답변을 사용하려면 `.env.example`을 복사해 `.env`를 만듭니다.

```powershell
Copy-Item .env.example .env
```

`.env`에 다음 값을 입력합니다.

```env
OPENAI_API_KEY=발급받은_키
OPENAI_MODEL=사용할_모델_ID
CHATBOT_FORCE_FALLBACK=false
```

`VITE_OPENAI_API_KEY`는 만들지 마세요. `VITE_`로 시작하는 값은 브라우저에 노출될 수 있습니다.

## 검사

```bash
npm run verify
```

테스트, 타입 검사, 프로덕션 빌드와 Netlify Function 번들을 확인합니다.

## 배포

Netlify에서 다음 환경변수를 등록합니다.

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CHATBOT_FORCE_FALLBACK`

빌드 명령은 `npm run build`, 배포 폴더는 `dist`입니다.

## 폴더 안내

```text
src/                         화면과 프론트엔드 코드
netlify/functions/           챗봇 및 서버 함수
netlify/functions/data/      서울 지역정보 JSON
shared/                      프론트와 함수의 공통 타입
tests/                       기능이 깨지지 않는지 확인하는 테스트
docs/                        상세 설정과 데이터 출처 안내
```

더 자세한 설치 방법은 [초보자용 설정 안내](docs/SETUP_FOR_BEGINNERS.md), 데이터 출처는 [데이터 및 라이선스](docs/DATA_AND_LICENSE.md)를 참고하세요.
