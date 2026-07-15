# GitHub 저장소 생성 및 업로드

이 프로젝트가 사용할 저장소 이름은 다음으로 정했습니다.

```text
seoul-festival-chatbot-mvp
```

## 1. GitHub에서 빈 저장소 만들기

GitHub 로그인 후 새 저장소를 생성합니다.

- Owner: `lmg3111977`
- Repository name: `seoul-festival-chatbot-mvp`
- 초기 공개 범위: Private 권장
- README 자동 생성: 선택하지 않음
- `.gitignore` 자동 생성: 선택하지 않음
- License 자동 생성: 선택하지 않음

프로젝트 안에 README와 `.gitignore`가 이미 있으므로 GitHub에서 초기 파일을 만들지 않는 편이 충돌을 줄입니다.

## 2. 프로젝트 업로드

프로젝트 폴더에서 실행합니다.

```bash
git remote add origin https://github.com/lmg3111977/seoul-festival-chatbot-mvp.git
git push -u origin main
```

원격 주소를 잘못 입력했을 때:

```bash
git remote set-url origin https://github.com/lmg3111977/seoul-festival-chatbot-mvp.git
```

## 3. 비밀정보 확인

Push 직전에 실행합니다.

```bash
git status
git ls-files .env
git grep -n "sk-"
```

정상 결과:

- `.env`가 커밋 목록에 없어야 함
- 실제 `sk-...` API 키가 출력되지 않아야 함
- `.env.example`만 저장소에 포함됨

## 4. Netlify 연결

GitHub Push 후 Netlify에서 해당 저장소를 연결합니다.

환경변수:

```text
OPENAI_API_KEY = 실제 키
OPENAI_MODEL = gpt-5.6-luna
CHATBOT_FORCE_FALLBACK = false
```

OpenAI API 키는 GitHub 파일이 아니라 Netlify 사이트 환경변수에만 등록합니다.
