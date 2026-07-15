<script setup lang="ts">
import type { AppView } from '../navigation/view-state'

const emit = defineEmits<{
  navigate: [view: AppView]
}>()

const stats = [
  { value: '6,518', label: '서울 지역정보' },
  { value: '201', label: '축제·공연·행사' },
  { value: '7', label: '제공 데이터 유형' },
  { value: '25', label: '서울 자치구' },
]
</script>

<template>
  <div class="home-view">
    <section class="home-hero">
      <div class="home-hero__copy">
        <span class="home-eyebrow">SEOUL LOCAL DATA · 2026</span>
        <h1>서울의 오늘을<br />더 가깝게 만나보세요.</h1>
        <p>
          공공데이터로 서울의 축제를 발견하고, 익명 커뮤니티에서
          나만의 지역 경험을 자유롭게 나눠보세요.
        </p>
        <div class="home-actions">
          <button type="button" class="home-primary" @click="emit('navigate', 'explore')">
            축제 둘러보기
          </button>
          <span>우측 하단 Local AI에게 서울 정보를 물어보세요.</span>
        </div>
      </div>

      <div class="home-hero__art" aria-hidden="true">
        <div class="home-orbit home-orbit--large" />
        <div class="home-orbit home-orbit--small" />
        <div class="home-city-label">
          <strong>SEOUL<br />NOW</strong>
          <span>37.5665° N / 126.9780° E</span>
        </div>
        <div class="home-skyline">
          <i /><i /><i /><i /><i />
        </div>
      </div>
    </section>

    <section class="home-stats" aria-label="LocalHub 데이터 현황">
      <article v-for="stat in stats" :key="stat.label" class="home-stat">
        <strong>{{ stat.value }}</strong>
        <span>{{ stat.label }}</span>
      </article>
    </section>

    <section class="home-discover">
      <header class="home-section-heading">
        <div>
          <span class="home-eyebrow">EXPLORE LOCALHUB</span>
          <h2>무엇을 찾고 있나요?</h2>
        </div>
        <button type="button" @click="emit('navigate', 'explore')">
          전체 지역정보 보기 →
        </button>
      </header>

      <div class="home-shortcuts">
        <button type="button" class="home-shortcut home-shortcut--featured" @click="emit('navigate', 'explore')">
          <span>지도</span>
          <div><h3>서울 축제 지도</h3><p>자치구와 날짜를 골라 축제를 지도에서 확인하세요.</p></div>
          <b>↗</b>
        </button>
        <button type="button" class="home-shortcut" @click="emit('navigate', 'community')">
          <span>이야기</span>
          <div><h3>익명 커뮤니티</h3><p>서울 주민과 여행자의 생생한 경험을 읽고 나눠보세요.</p></div>
          <b>→</b>
        </button>
        <article class="home-shortcut">
          <span>안내</span>
          <div><h3>Local AI</h3><p>제공된 서울 공공데이터에서 필요한 정보를 찾아드립니다.</p></div>
          <b>✦</b>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  width: min(var(--lh-content), calc(100% - 40px));
  margin: 28px auto 0;
}

.home-hero {
  display: grid;
  min-height: 520px;
  overflow: hidden;
  border-radius: var(--lh-radius-xl);
  grid-template-columns: 1.08fr 0.92fr;
  background: #172b50;
  box-shadow: var(--lh-shadow-float);
}

.home-hero__copy {
  display: flex;
  padding: clamp(40px, 5vw, 68px);
  color: #fff;
  flex-direction: column;
  justify-content: center;
}

.home-eyebrow {
  color: #9eb7ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.home-hero h1 {
  max-width: 650px;
  margin: 20px 0 22px;
  font-size: clamp(46px, 5.4vw, 72px);
  line-height: 1.05;
  letter-spacing: -0.06em;
  word-break: keep-all;
}

.home-hero p {
  max-width: 560px;
  margin: 0;
  color: #cbd7ee;
  font-size: 16px;
  line-height: 1.8;
  word-break: keep-all;
}

.home-actions {
  display: flex;
  margin-top: 30px;
  align-items: center;
  gap: 16px;
  color: #aebbd4;
  font-size: 12px;
}

.home-primary {
  min-height: 46px;
  padding: 0 20px;
  border: 0;
  border-radius: 14px;
  color: #fff;
  font-weight: 900;
  background: var(--lh-primary);
  box-shadow: 0 12px 28px rgba(49, 101, 255, 0.35);
}

.home-hero__art {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #3165ff, #6f8fff);
}

.home-orbit {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
}

.home-orbit--large { top: -90px; right: -100px; width: 390px; height: 390px; }
.home-orbit--small { top: 120px; right: 90px; width: 160px; height: 160px; }

.home-city-label {
  position: absolute;
  top: 62px;
  left: 52px;
  color: #fff;
}

.home-city-label strong { font-size: 54px; line-height: 0.88; letter-spacing: -0.05em; }
.home-city-label span { display: block; margin-top: 18px; font-size: 10px; font-weight: 900; letter-spacing: 0.15em; }

.home-skyline {
  position: absolute;
  right: 46px;
  bottom: 54px;
  left: 46px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.home-skyline i { display: block; width: 17%; border-radius: 8px 8px 0 0; background: rgba(21, 33, 58, 0.85); }
.home-skyline i:nth-child(1) { height: 110px; }
.home-skyline i:nth-child(2) { height: 175px; }
.home-skyline i:nth-child(3) { height: 135px; }
.home-skyline i:nth-child(4) { height: 215px; }
.home-skyline i:nth-child(5) { height: 90px; }

.home-stats {
  display: grid;
  margin: 22px 0 80px;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.home-stat {
  padding: 22px;
  border: 1px solid var(--lh-line);
  border-radius: var(--lh-radius-md);
  background: var(--lh-card);
}

.home-stat strong { display: block; color: var(--lh-ink); font-size: 30px; letter-spacing: -0.04em; }
.home-stat span { color: var(--lh-muted); font-size: 12px; }

.home-section-heading {
  display: flex;
  margin-bottom: 22px;
  align-items: flex-end;
  justify-content: space-between;
}

.home-section-heading h2 { margin: 8px 0 0; color: var(--lh-ink); font-size: 36px; letter-spacing: -0.045em; }
.home-section-heading button { border: 0; color: var(--lh-primary-strong); font-weight: 900; background: transparent; }

.home-shortcuts {
  display: grid;
  padding-bottom: 90px;
  grid-template-columns: 1.2fr 0.9fr 0.9fr;
  gap: 16px;
}

.home-shortcut {
  display: flex;
  min-height: 230px;
  padding: 26px;
  border: 1px solid var(--lh-line);
  border-radius: var(--lh-radius-lg);
  color: var(--lh-ink);
  text-align: left;
  flex-direction: column;
  justify-content: space-between;
  background: var(--lh-card);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button.home-shortcut:hover { transform: translateY(-2px); box-shadow: var(--lh-shadow-soft); }
.home-shortcut--featured { color: #fff; border-color: transparent; background: linear-gradient(145deg, #2757e6, #3165ff); }
.home-shortcut > span { font-size: 11px; font-weight: 900; letter-spacing: 0.1em; opacity: 0.7; }
.home-shortcut h3 { margin: 0 0 8px; font-size: 22px; }
.home-shortcut p { margin: 0; color: inherit; font-size: 13px; line-height: 1.65; opacity: 0.72; }
.home-shortcut b { font-size: 23px; }

@media (max-width: 800px) {
  .home-hero { grid-template-columns: 1fr; }
  .home-hero__art { min-height: 280px; }
  .home-actions { align-items: flex-start; flex-direction: column; }
  .home-stats { grid-template-columns: 1fr 1fr; }
  .home-shortcuts { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .home-view { width: min(100% - 24px, var(--lh-content)); margin-top: 12px; }
  .home-hero__copy { padding: 42px 24px; }
  .home-hero h1 { font-size: 42px; }
  .home-stats { grid-template-columns: 1fr 1fr; margin-bottom: 58px; }
  .home-stat { padding: 17px; }
  .home-section-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
}
</style>
