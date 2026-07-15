<script setup lang="ts">
import { FestivalChatWidget } from './chatbot'
import CommunityBoard from './components/CommunityBoard.vue'
import FestivalMapSection from './features/map/FestivalMapSection.vue'

const previewChatOpen =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('chat') === 'open'
</script>

<template>
  <main class="demo-page">
    <nav class="site-nav">
      <a href="#" class="brand">LocalHub</a>
      <div class="nav-links" aria-label="주요 메뉴">
        <a href="#festivals">축제</a>
        <a href="#community">커뮤니티</a>
        <a href="#about">소개</a>
      </div>
    </nav>

    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">서울 지역 정보 서비스</span>
        <h1>오늘의 서울을<br />더 가깝게 만나보세요.</h1>
        <p>
          이 화면은 기존 Vue 3 웹사이트에 챗봇을 붙였을 때의 모습을 확인하기 위한
          독립 실행형 MVP입니다.
        </p>
        <div class="hero-actions">
          <a href="#festivals" class="primary-link">축제 둘러보기</a>
          <span>우측 하단 챗봇을 눌러 질문해 보세요.</span>
        </div>
      </div>
      <div class="hero-card" aria-hidden="true">
        <div class="mock-image">
          <span>SEOUL</span>
        </div>
        <div class="mock-lines">
          <strong>서울 축제·공연·행사</strong>
          <span />
          <span />
          <span class="short" />
        </div>
      </div>
    </section>

    <FestivalMapSection />

    <CommunityBoard />

    <footer id="about" class="data-footer">
      <p>
        이 서비스는 한국관광공사 Tour API(TourAPI 4.0)의 데이터를 활용하였습니다.
        <a
          href="https://www.data.go.kr/data/15101578/openapi.do"
          target="_blank"
          rel="noreferrer"
        >
          출처: 한국관광공사
        </a>
        · 라이선스: 공공누리 제3유형
      </p>
    </footer>
  </main>

  <FestivalChatWidget
    title="서울 LocalHub ChatLLM"
    subtitle="공공데이터 기반 상담 챗봇"
    primary-color="#3165ff"
    :initially-open="previewChatOpen"
  />
</template>

<style scoped>
.demo-page {
  min-height: 100vh;
  color: #172033;
  background:
    radial-gradient(circle at 90% 10%, rgba(49, 101, 255, 0.1), transparent 28%),
    #f7f9fc;
}

.site-nav {
  display: flex;
  width: min(1120px, calc(100% - 40px));
  height: 76px;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
}

.brand {
  color: #2757e6;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 28px;
}

.nav-links a {
  color: #5b6780;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.hero {
  display: grid;
  width: min(1120px, calc(100% - 40px));
  min-height: 540px;
  margin: 0 auto;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: 68px;
}

.eyebrow,
.section-kicker {
  color: #3165ff;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 18px 0 20px;
  color: #15213a;
  font-size: clamp(46px, 6vw, 74px);
  line-height: 1.05;
  letter-spacing: -0.055em;
}

.hero-copy > p {
  max-width: 580px;
  margin: 0;
  color: #69758c;
  font-size: 17px;
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  margin-top: 32px;
  align-items: center;
  gap: 18px;
  color: #7c879a;
  font-size: 13px;
}

.primary-link {
  padding: 13px 20px;
  border-radius: 12px;
  color: #fff;
  font-weight: 800;
  text-decoration: none;
  background: #3165ff;
  box-shadow: 0 12px 28px rgba(49, 101, 255, 0.23);
}

.hero-card {
  overflow: hidden;
  border: 1px solid rgba(34, 57, 99, 0.1);
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 30px 80px rgba(31, 51, 91, 0.14);
  transform: rotate(2deg);
}

.mock-image {
  display: grid;
  height: 300px;
  place-items: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 54px;
  font-weight: 900;
  letter-spacing: 0.18em;
  background:
    linear-gradient(135deg, rgba(22, 38, 79, 0.12), rgba(49, 101, 255, 0.1)),
    linear-gradient(135deg, #6f8fff, #264bc9);
}

.mock-lines {
  display: grid;
  gap: 12px;
  padding: 24px;
}

.mock-lines strong {
  font-size: 18px;
}

.mock-lines span {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #edf1f7;
}

.mock-lines .short {
  width: 58%;
}

.content-section {
  width: min(1120px, calc(100% - 40px));
  margin: 20px auto 0;
  padding: 76px 0 90px;
}

.content-section h2 {
  margin: 10px 0 26px;
  font-size: 34px;
  letter-spacing: -0.04em;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.content-card {
  padding: 14px 14px 22px;
  border: 1px solid #e7ebf2;
  border-radius: 20px;
  background: #fff;
}

.card-image {
  height: 168px;
  margin-bottom: 18px;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(49, 101, 255, 0.28), rgba(138, 162, 232, 0.08)),
    #e9eefb;
}

.content-card > span {
  color: #3165ff;
  font-size: 11px;
  font-weight: 900;
}

.content-card h3 {
  margin: 8px 0 8px;
  font-size: 19px;
}

.content-card p {
  margin: 0;
  color: #778196;
  font-size: 13px;
  line-height: 1.65;
}

.data-footer {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 46px;
  border-top: 1px solid #e4e9f1;
  color: #788398;
  font-size: 12px;
  line-height: 1.7;
}

.data-footer p {
  margin: 0;
}

.data-footer a {
  color: #405fc3;
  font-weight: 700;
}

@media (max-width: 800px) {
  .nav-links {
    display: none;
  }

  .hero {
    min-height: auto;
    padding: 60px 0 40px;
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .hero-card {
    display: none;
  }

  .hero-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
