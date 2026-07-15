import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'

interface FunctionModule {
  default: (request: Request) => Promise<Response> | Response
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

function copyRequestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item))
    } else if (value !== undefined) {
      headers.set(key, value)
    }
  }

  return headers
}

async function sendResponse(
  response: Response,
  serverResponse: ServerResponse,
): Promise<void> {
  serverResponse.statusCode = response.status
  response.headers.forEach((value, key) => {
    serverResponse.setHeader(key, value)
  })

  if (response.body === null) {
    serverResponse.end()
    return
  }

  const body = Buffer.from(await response.arrayBuffer())
  serverResponse.end(body)
}

async function loadChatFunction(server: ViteDevServer): Promise<FunctionModule> {
  return (await server.ssrLoadModule(
    '/netlify/functions/chat.mts',
  )) as FunctionModule
}

/**
 * 로컬 개발 전용 어댑터입니다.
 *
 * 프로덕션에서는 Netlify가 `netlify/functions/chat.mts`를 직접 실행합니다.
 * 개발 중에는 Vite의 `/api/chat` 요청을 같은 함수 파일로 전달하므로,
 * 별도 서버나 API 키 노출 없이 `npm run dev` 한 번으로 UI와 Function을 함께 확인할 수 있습니다.
 */
export function localNetlifyFunction(): Plugin {
  return {
    name: 'local-netlify-function',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost')
        if (requestUrl.pathname !== '/api/chat') {
          next()
          return
        }

        try {
          const method = request.method ?? 'GET'
          const headers = copyRequestHeaders(request)
          const host = request.headers.host ?? '127.0.0.1:5173'
          const url = new URL(request.url ?? '/api/chat', `http://${host}`)
          const body = await readBody(request)
          const init: RequestInit = { method, headers }

          if (method !== 'GET' && method !== 'HEAD' && body.length > 0) {
            init.body = body.toString('utf8')
          }

          const functionModule = await loadChatFunction(server)
          const functionResponse = await functionModule.default(
            new Request(url, init),
          )
          await sendResponse(functionResponse, response)
        } catch (error) {
          server.config.logger.error(
            `[local-netlify-function] ${
              error instanceof Error ? error.stack ?? error.message : String(error)
            }`,
          )

          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(
            JSON.stringify({
              error: '로컬 챗봇 Function을 실행하지 못했습니다.',
              code: 'LOCAL_FUNCTION_ERROR',
            }),
          )
        }
      })
    },
  }
}
