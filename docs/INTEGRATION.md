# 통합 문서 안내

기존 Vue 3 사이트에 합치는 최신 절차는 다음 문서를 사용합니다.

- [기존 사이트 통합 가이드](INTEGRATION_GUIDE.md)
- [아키텍처 설계](ARCHITECTURE.md)

이 프로젝트는 로컬 개발에서 `vite-plugins/local-netlify-function.ts`를 사용하고, 프로덕션에서는 `netlify/functions/chat.mts`를 Netlify Function으로 배포합니다.
