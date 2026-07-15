# LocalHub 프론트엔드 리디자인 설계

## 목표

현재 Vue 3 + Vite 프로젝트를 PDF 필수 기능이 명확히 드러나고 발표 시연이 자연스러운 LocalHub 서울 서비스로 개선한다. 시각 방향은 승인된 `서울 에디토리얼형`을 사용하며, 배포 결과는 하나의 정적 Vue SPA로 유지한다.

## 확정 제약

- 프론트엔드는 Vue.js 3와 Vite를 유지한다.
- 결과물은 Netlify에 배포 가능한 단일 정적 SPA다.
- 화면 전환을 위해 Vue Router나 다른 새 의존성을 설치하지 않는다.
- 서울 1개 권역과 제공된 JSON 7종만 사용한다.
- 지도 선택 기능은 기존 Leaflet 구현을 유지한다.
- 커뮤니티는 회원가입 없이 브라우저 `localStorage`에 저장한다.
- 커뮤니티 비밀번호는 교육 과제 조건에 따라 평문으로 브라우저에만 저장하고 수정·삭제 시 비교한다.
- OpenAI 호출은 승인된 Netlify Function에서만 수행하고 API 키를 브라우저에 노출하지 않는다.
- 챗봇의 근거는 제공 JSON과 비밀번호를 제거한 공개 커뮤니티 데이터로 제한한다.
- 실제 `.env`와 API 키는 저장소에 포함하지 않는다.
- 추가 공공데이터, 새 프레임워크, 새 UI 라이브러리, 데이터베이스를 도입하지 않는다.
- `src/community/api.ts`, `src/components/CommunityBoard.vue`, `tests/community-storage.test.ts`의 현재 미커밋 작업을 기준으로 확장하며 되돌리지 않는다.

## 정보 구조

서비스는 하나의 Vue 앱 안에서 `home`, `explore`, `community` 세 화면 상태를 전환한다. 화면 상태는 URL 해시 `#home`, `#explore`, `#community`와 동기화하여 새로고침과 브라우저 뒤로가기를 지원한다. 모든 화면은 같은 `index.html`과 같은 Vue 앱을 사용한다.

```text
App.vue
├─ SiteHeader
├─ HomeView
│  ├─ EditorialHero
│  ├─ DatasetStats
│  ├─ FeatureShortcuts
│  └─ RecentCommunityPosts
├─ ExploreView
│  └─ FestivalMapSection
├─ CommunityView
│  ├─ CommunityToolbar
│  ├─ CommunityPostList
│  ├─ CommunityPostDetailModal
│  ├─ CommunityPostFormModal
│  └─ PasswordConfirmModal
├─ DataSourceFooter
└─ FestivalChatWidget
```

데스크톱에서는 상단 중앙 탭으로 화면을 전환한다. 모바일에서는 같은 세 항목을 하단 고정 탭으로 표시한다. 챗봇은 세 화면 모두에서 우측 하단에 유지하고 모바일에서는 열렸을 때 전체 화면으로 표시한다.

## 시각 디자인

### 색상

- 기본 남색: `#173B4F`
- 배경 아이보리: `#F6F0E7`
- 카드 배경: `#FFFAF2`
- 주요 행동 주황: `#E6533C`
- 보조 강조 금색: `#F0AA66`
- 지도·성공 보조색: `#708D7E`
- 테두리: `#DED7CC`
- 보조 텍스트: `#687982`

### 타이포그래피

- 설치가 필요한 웹폰트는 추가하지 않는다.
- 제목은 `Georgia`, `Times New Roman`, 시스템 명조 계열 순으로 사용한다.
- 본문과 조작 요소는 `Pretendard`, `Noto Sans KR`, `Malgun Gothic`, sans-serif 순으로 사용한다.
- 제목은 에디토리얼 인상을 위해 큰 명조체를 사용하되, 입력·버튼·데이터 값은 명확한 고딕체로 표시한다.

### 공통 표현

- 모서리 반경은 카드 18~24px, 주요 히어로 32px, 버튼은 pill 형태를 기본으로 한다.
- 그림자는 주요 히어로와 모달에만 사용하고 목록 카드에는 약한 그림자 또는 테두리만 사용한다.
- 아이콘은 문자 기호에 의존하지 않고 기존 SVG 또는 CSS 도형을 재사용한다.
- 장식 애니메이션은 짧은 opacity/transform 전환만 사용하며 `prefers-reduced-motion`에서 제거한다.

## 화면별 설계

### 홈

홈은 발표 첫 화면과 기능 진입점 역할을 동시에 한다.

- 히어로 문구: `서울의 오늘을 동네처럼 가깝게.`
- 주요 버튼: `지도로 발견하기`, `AI에게 물어보기`
- 통계: 지역정보 6,518건, 축제 201건, 데이터 유형 7개, 서울 자치구 25개
- 기능 바로가기: 서울 축제 지도, 동네 이야기, Local AI
- 최근 게시글: localStorage의 최신 글 최대 3개를 비밀번호 없이 표시
- 통계 값은 제공 JSON의 실제 `total` 합계와 축제 데이터 값을 기반으로 한다.

### 지역 탐색

기존 `FestivalMapSection`의 데이터 처리와 Leaflet 로직을 유지하고 화면 구조만 명확하게 재배치한다.

- 왼쪽: 자치구, 시작일, 종료일, 적용, 초기화
- 오른쪽: Leaflet 지도와 핀
- 지도 아래: 현재 필터 결과 중 대표 축제 카드 최대 3개
- 잘못된 날짜 범위는 필터 가까이에 즉시 표시한다.
- 결과가 없으면 지도는 유지하고 빈 결과 안내와 초기화 버튼을 표시한다.
- 지도 핀 팝업은 제목, 기간, 장소, 요금, 이미지가 있을 때만 해당 필드를 표시한다.

### 커뮤니티

커뮤니티는 RFD의 목록, 상세, 작성, 수정, 삭제를 각각 분명한 상태로 제공한다.

- 카테고리: `전체`, `축제 후기`, `지역 질문`, `여행 팁`, `자유 이야기`
- 검색: 제목과 본문을 대소문자 구분 없이 브라우저에서 검색
- 목록: 카테고리, 제목, 본문 미리보기, 작성일 표시
- 상세: 목록 항목을 누르면 모달로 전체 본문 표시
- 작성: 상단과 안내 카드의 두 글쓰기 버튼이 같은 작성 모달을 연다.
- 수정: 상세 모달에서 수정 버튼을 누르면 비밀번호 확인 후 기존 내용을 채운 작성 모달로 전환한다.
- 삭제: 상세 모달에서 삭제 버튼을 누르면 비밀번호 확인과 최종 삭제 확인을 거친다.
- 성공 후에는 목록을 즉시 갱신하고 성공 메시지를 표시한다.

`CommunityPost`에는 `category`를 추가한다. 기존 localStorage 게시글에 카테고리가 없으면 읽을 때 `general`로 정규화하여 데이터가 사라지지 않게 한다.

```ts
export type CommunityCategory =
  | 'festival-review'
  | 'local-question'
  | 'travel-tip'
  | 'general'

export interface CommunityPost {
  id: string
  category: CommunityCategory
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
```

### 챗봇

현재 Netlify Function 구조와 플로팅·모바일 전체 화면 동작을 유지하고 시각 스타일만 공통 토큰에 맞춘다. 기능 범위 확장은 기존 `2026-07-15-chatbot-stabilization-design.md`와 `2026-07-15-chatbot-full-scope-optimization.md`를 따른다.

- 제공된 7개 JSON 유형: 축제, 관광지, 문화시설, 레포츠, 숙박, 쇼핑, 여행코스
- 커뮤니티 검색 시 브라우저가 제목과 본문 일부만 보내며 비밀번호는 보내지 않는다.
- 데이터 근거가 있는 답변은 유형 배지와 출처 카드를 표시한다.
- API 키 없음, 시간 초과, 네트워크 오류, 사용량 제한은 서로 다른 안내를 표시한다.
- 실패한 질문에는 한 번의 `다시 시도` 동작을 제공한다.

## 컴포넌트 경계

`App.vue`가 화면 상태와 공통 레이아웃만 담당하도록 현재 큰 템플릿을 분리한다.

- `src/layout/SiteHeader.vue`: 데스크톱 탭과 모바일 하단 탭
- `src/views/HomeView.vue`: 홈 화면 조합
- `src/views/ExploreView.vue`: 지도 화면 조합
- `src/views/CommunityView.vue`: 커뮤니티 화면 조합
- `src/components/home/EditorialHero.vue`: 히어로와 행동 버튼
- `src/components/home/DatasetStats.vue`: 데이터 통계
- `src/components/home/FeatureShortcuts.vue`: 기능 바로가기
- `src/community/CommunityPostList.vue`: 검색 결과 목록
- `src/community/CommunityPostDetailModal.vue`: 상세 표시와 수정·삭제 진입
- `src/community/CommunityPostFormModal.vue`: 작성·수정 공용 폼
- `src/community/PasswordConfirmModal.vue`: 수정·삭제 비밀번호 확인
- `src/styles/tokens.css`: 색상, 글꼴, 간격, 반경, 그림자 토큰

기존 `FestivalMap`, `FestivalFilter`, `FestivalChatWidget`의 내부 로직은 유지하고 필요한 스타일과 공개 prop만 조정한다.

## 데이터 흐름

### 화면 전환

```text
상단/하단 탭 클릭
-> App의 activeView 변경
-> location.hash 갱신
-> 해당 View만 표시
-> 챗봇 상태는 유지
```

### 커뮤니티

```text
작성 모달 입력
-> createCommunityPost(storageKey, body)
-> localStorage 저장
-> 공개 CommunityPost 반환
-> 목록과 홈 최근 글 갱신
```

수정과 삭제는 저장된 평문 비밀번호를 브라우저에서 비교한다. API 요청이나 Netlify Function을 사용하지 않는다.

### 챗봇

```text
사용자 질문 + 제한된 최근 문맥 + 공개 커뮤니티 일부
-> POST /api/chat
-> Netlify Function
-> 질문 유형에 필요한 제공 JSON 검색
-> 관련 근거 최대 5건
-> OpenAI 응답 또는 검색 기반 fallback
-> 답변과 근거 카드 표시
```

## 오류 및 빈 상태

- localStorage가 비어 있으면 첫 글 작성 안내를 표시한다.
- localStorage JSON이 손상되었거나 스키마가 잘못되면 유효한 글만 보존하고 나머지는 무시한다.
- 비밀번호가 다르면 입력 모달을 유지하고 구체적인 오류 문구를 표시한다.
- 지도 결과가 없으면 `조건에 맞는 축제가 없습니다`와 초기화 동작을 표시한다.
- 지도 초기화에 실패하면 텍스트 결과 목록은 계속 사용할 수 있게 한다.
- 챗봇 요청이 실패하면 기존 대화는 보존하고 로딩 상태를 종료한다.

## 접근성과 반응형

- 모든 탭은 `button`과 현재 선택 상태를 사용한다.
- 모달은 제목 연결, 포커스 이동, Escape 닫기, 배경 클릭 닫기를 지원한다.
- 삭제는 명시적인 최종 확인 없이는 실행하지 않는다.
- 입력 오류는 색상뿐 아니라 텍스트와 `aria-live`로 전달한다.
- 키보드만으로 화면 전환, 게시글 상세, 작성, 수정, 삭제, 챗봇 사용이 가능해야 한다.
- 850px 이하에서 탐색과 커뮤니티의 2열 구조를 1열로 바꾼다.
- 640px 이하에서 챗봇과 게시글 폼은 전체 화면으로 표시한다.
- 터치 대상은 최소 44px 높이를 유지한다.

## 테스트 전략

### 단위 테스트

- 해시와 화면 상태 동기화
- 기존 카테고리 없는 게시글을 `general`로 읽는 마이그레이션
- 카테고리 필터와 제목·본문 검색
- 작성·수정·삭제 후 localStorage와 공개 목록 일치
- 잘못된 비밀번호 거부
- 공개 커뮤니티 문맥에서 비밀번호 제거

### 컴포넌트 테스트

- 홈·탐색·커뮤니티 탭 전환
- 두 글쓰기 버튼이 같은 작성 모달을 여는지 확인
- 게시글 선택 시 상세 모달 표시
- 수정·삭제 시 비밀번호 확인 순서
- 빈 상태와 오류 상태 문구
- 챗봇 플로팅 열기와 모바일 전체 화면 상태

### 통합 검증

- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run bundle:functions`
- `npm run verify`
- 데스크톱 1440×900, 태블릿 768×1024, 모바일 390×844 시각 검증
- 키보드 탭 순서, Escape 모달 닫기, reduced-motion 검증

## 구현 순서

1. 기존 미커밋 커뮤니티 localStorage 작업을 테스트로 고정한다.
2. 디자인 토큰과 SPA 화면 셸을 추가한다.
3. 홈 화면을 구현하고 현재 지도와 커뮤니티로 연결한다.
4. 지도 화면을 승인된 스타일로 재배치한다.
5. 커뮤니티 카테고리, 검색, 상세·작성·비밀번호 모달을 구현한다.
6. 챗봇 UI를 공통 디자인에 맞추고 기존 전체 범위 챗봇 계획을 적용한다.
7. 접근성·반응형·전체 검증을 수행한다.

## 제외 범위

- 회원가입, 로그인, 서버 사용자 세션
- 서버 또는 여러 기기 간 커뮤니티 게시글 공유
- 음식점 데이터의 임의 추가
- 실시간 공공 API 갱신
- Vue Router, Pinia, CSS 프레임워크 설치
- 데이터베이스와 벡터 검색 도입
- 현재 과제에 없는 결제, 알림, 소셜 기능
