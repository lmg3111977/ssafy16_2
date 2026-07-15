# 초보자용 실행·설정 순서

## 1단계: 프로젝트 폴더 열기

VSCode를 실행하고 `파일 -> 폴더 열기`에서 이 프로젝트 폴더를 선택합니다.

상단 메뉴에서 `터미널 -> 새 터미널`을 누릅니다. 이후 명령은 모두 이 터미널에 한 줄씩 입력합니다.

## 2단계: Node.js 확인

```bash
node -v
npm -v
```

Node.js 버전이 20 이상이면 진행합니다.

## 3단계: 패키지 설치

```bash
npm install
```

성공하면 `node_modules` 폴더가 생깁니다.

## 4단계: API 키 없이 먼저 실행

```bash
npm run dev
```

터미널에 다음과 비슷한 주소가 보입니다.

```text
http://localhost:5173
```

브라우저에서 열고 오른쪽 아래 챗봇 아이콘을 누릅니다.

질문 예시:

```text
문학주간 2026 일정 알려줘
9월 종로구 무료 축제 알려줘
```

API 키가 없으면 노란 안내와 함께 검색 전용 답변이 나옵니다. 오류가 아니라 정상적인 MVP 안전 모드입니다.

## 5단계: OpenAI API 키 연결

### `.env` 만들기

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

### 값 입력

`.env` 파일을 열어 다음처럼 입력합니다.

```env
OPENAI_API_KEY=발급받은_실제_키
OPENAI_MODEL=gpt-5.6-luna
CHATBOT_FORCE_FALLBACK=false
```

API 키에는 `VITE_`를 붙이지 않습니다.

### 서버 다시 시작

실행 중인 터미널에서 `Ctrl + C`를 누른 뒤 다시 실행합니다.

```bash
npm run dev
```

## 6단계: 자동 검사

```bash
npm run check
```

내부적으로 테스트, TypeScript 검사, 빌드를 차례로 실행합니다.

성공 기준:

```text
Tests passed
built in ...
```

## 7단계: GitHub에 올리기 전 확인

```bash
git status
git check-ignore .env
```

두 번째 명령 결과에 `.env`가 표시되면 Git에서 제외된 상태입니다.

## 8단계: Netlify 환경변수 등록

Netlify 사이트 설정에서 다음 값을 등록합니다.

```text
OPENAI_API_KEY
OPENAI_MODEL
CHATBOT_FORCE_FALLBACK
```

실제 키는 Netlify 화면에 직접 입력합니다. 소스코드에는 입력하지 않습니다.

## 자주 발생하는 오류

### 챗봇 요청이 404

- 프로젝트 루트에서 `npm run dev`를 실행했는지 확인합니다.
- `vite.config.ts`의 `localNetlifyFunction()`이 삭제되지 않았는지 확인합니다.
- 브라우저 주소가 5173 포트인지 확인합니다.

### 검색 전용 모드 안내가 표시됨

- API 키가 없거나 `CHATBOT_FORCE_FALLBACK=true`입니다.
- UI와 JSON 검색 테스트는 정상입니다.

### LLM 연결 실패 후 검색 답변이 표시됨

- API 키 권한, 결제 한도, 모델 ID를 확인합니다.
- Function은 서비스 중단 대신 검색 답변으로 자동 복구합니다.

### 배포 후 환경변수가 적용되지 않음

- Netlify 환경변수를 저장한 뒤 새 배포를 실행합니다.

### `.env`가 GitHub에 올라감

즉시 키를 폐기하고 새 키를 발급합니다. Git 기록에서도 제거해야 합니다.
