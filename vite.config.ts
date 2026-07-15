import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { localNetlifyFunction } from './vite-plugins/local-netlify-function'

export default defineConfig(({ mode }) => {
  // VITE_ 접두사가 없는 서버 전용 환경변수도 로컬 Function에서 읽을 수 있게 한다.
  const serverEnvironment = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(serverEnvironment)) {
    process.env[key] ??= value
  }

  return {
    plugins: [localNetlifyFunction(), vue()],
  }
})
