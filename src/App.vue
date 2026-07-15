<script setup lang="ts">
import { FestivalChatbot } from './features/chatbot'

const defaultChatOpen = new URLSearchParams(window.location.search).get('chat') === 'open'

const copy = {
  eyebrow: 'LocalHub / Netlify Functions MVP',
  title: '\uC11C\uC6B8 \uCD95\uC81C \uC815\uBCF4\uB97C \uC548\uC804\uD558\uAC8C \uC548\uB0B4\uD558\uB294 \uD50C\uB85C\uD305 \uCC57\uBD07',
  description: '\uD604\uC7AC \uD504\uB85C\uC81D\uD2B8\uB294 \uAE30\uC874 \uC6F9\uC0AC\uC774\uD2B8\uC5D0 \uD569\uCE58\uAE30 \uC804\uC5D0 \uB3C5\uB9BD\uC801\uC73C\uB85C \uAC80\uC99D\uD558\uB294 \uCD5C\uC18C MVP\uC785\uB2C8\uB2E4. \uC6B0\uCE21 \uD558\uB2E8\uC758 \uCC57\uBD07 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uD14C\uC2A4\uD2B8\uD558\uC138\uC694.',
  architecture: '\uAD6C\uC870',
  frontend: 'Vue 3 widget',
  function: 'Netlify Function',
  search: 'JSON pre-search',
  llm: 'OpenAI Responses API',
  integration: '\uD1B5\uD569 \uBC29\uC2DD',
  integrationBody: 'App.vue\uC5D0 <FestivalChatbot /> \uCEF4\uD3EC\uB10C\uD2B8 \uD558\uB098\uB97C \uCD94\uAC00\uD558\uACE0, netlify/functions \uD3F4\uB354\uB97C \uAC19\uC774 \uC62E\uAE30\uBA74 \uB429\uB2C8\uB2E4.',
  security: '\uBCF4\uC548 \uC6D0\uCE59',
  securityBody: 'OPENAI_API_KEY\uB294 Vue \uCF54\uB4DC\uC5D0 \uB123\uC9C0 \uC54A\uACE0 Netlify \uD568\uC218\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD569\uB2C8\uB2E4.',
  source: '\uB370\uC774\uD130: \uD55C\uAD6D\uAD00\uAD11\uACF5\uC0AC TourAPI 4.0 / \uACF5\uACF5\uB204\uB9AC \uC81C3\uC720\uD615',
}
</script>

<template>
  <div class="demo-shell">
    <header class="demo-header">
      <a class="demo-brand" href="#" aria-label="LocalHub">LocalHub</a>
      <span class="demo-badge">MVP</span>
    </header>

    <main class="demo-main">
      <section class="demo-hero">
        <p class="demo-eyebrow">{{ copy.eyebrow }}</p>
        <h1>{{ copy.title }}</h1>
        <p class="demo-description">{{ copy.description }}</p>
      </section>

      <section class="demo-grid" :aria-label="copy.architecture">
        <article class="demo-card demo-card-wide">
          <span class="demo-card-kicker">{{ copy.architecture }}</span>
          <div class="demo-flow" aria-label="Vue to OpenAI flow">
            <span>{{ copy.frontend }}</span>
            <b aria-hidden="true">&rarr;</b>
            <span>{{ copy.function }}</span>
            <b aria-hidden="true">&rarr;</b>
            <span>{{ copy.search }}</span>
            <b aria-hidden="true">&rarr;</b>
            <span>{{ copy.llm }}</span>
          </div>
        </article>

        <article class="demo-card">
          <span class="demo-card-kicker">{{ copy.integration }}</span>
          <p>{{ copy.integrationBody }}</p>
        </article>

        <article class="demo-card">
          <span class="demo-card-kicker">{{ copy.security }}</span>
          <p>{{ copy.securityBody }}</p>
        </article>
      </section>
    </main>

    <footer class="demo-footer">{{ copy.source }}</footer>

    <FestivalChatbot :default-open="defaultChatOpen" />
  </div>
</template>

<style scoped>
.demo-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.demo-header {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.demo-brand {
  color: #1d4ed8;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 850;
  letter-spacing: -0.04em;
}

.demo-badge {
  padding: 4px 8px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.7rem;
  font-weight: 800;
}

.demo-main {
  width: min(1120px, calc(100% - 40px));
  margin: auto;
  padding: 72px 0 100px;
}

.demo-hero {
  max-width: 780px;
}

.demo-eyebrow {
  margin: 0 0 18px;
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: clamp(2.3rem, 6vw, 4.7rem);
  line-height: 1.05;
  letter-spacing: -0.06em;
  word-break: keep-all;
}

.demo-description {
  max-width: 690px;
  margin: 26px 0 0;
  color: #566178;
  font-size: clamp(1rem, 2vw, 1.18rem);
  line-height: 1.8;
  word-break: keep-all;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 64px;
}

.demo-card {
  min-height: 168px;
  padding: 26px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 16px 44px rgba(30, 41, 59, 0.06);
  backdrop-filter: blur(18px);
}

.demo-card-wide {
  grid-column: 1 / -1;
}

.demo-card-kicker {
  color: #1d4ed8;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.demo-card p {
  margin: 20px 0 0;
  color: #59657c;
  line-height: 1.75;
  word-break: keep-all;
}

.demo-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.demo-flow span {
  padding: 12px 15px;
  border: 1px solid #dbe7ff;
  border-radius: 14px;
  background: #f7faff;
  color: #25324a;
  font-size: 0.86rem;
  font-weight: 700;
}

.demo-flow b {
  color: #8ba2ca;
}

.demo-footer {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 30px 0;
  color: #7a869c;
  font-size: 0.78rem;
}

@media (max-width: 720px) {
  .demo-main {
    padding-top: 44px;
  }

  .demo-grid {
    grid-template-columns: 1fr;
    margin-top: 42px;
  }

  .demo-card-wide {
    grid-column: auto;
  }

  .demo-flow b {
    display: none;
  }
}
</style>
