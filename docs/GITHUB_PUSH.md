# GitHub 저장소 안내

이 프로젝트는 연결된 GitHub 계정 `lmg3111977`의 비어 있던 저장소에 반영했다.

```text
https://github.com/lmg3111977/ssafy16_2
```

현재 연결 도구에는 GitHub의 **새 저장소 생성 기능**이 없으므로, 새 이름의 저장소를 만들지는 못하고 기존의 빈 저장소 `ssafy16_2`를 사용했다.

원하는 이름으로 바꾸려면 GitHub에서 다음 작업만 직접 수행하면 된다.

1. 저장소의 `Settings`를 연다.
2. `Repository name`을 `localhub-chatbot-mvp`로 변경한다.
3. 변경 후 Netlify에서 새 저장소 주소를 다시 선택한다.

저장소 이름을 바꾸어도 로컬 소스 구조와 Netlify 설정은 바뀌지 않는다.

## API 키 주의

- `.env`는 커밋하지 않는다.
- `.env.example`에는 빈 값만 둔다.
- 실제 키는 로컬 `.env`와 Netlify 환경변수에만 입력한다.
