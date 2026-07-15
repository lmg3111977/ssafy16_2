import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('../src/chatbot/FestivalChatWidget.vue', import.meta.url),
  'utf8',
)

describe('chatbot return-to-start control', () => {
  it('restores the welcome state and exposes the control only after conversation starts', () => {
    expect(source).toContain('function resetConversation()')
    expect(source).toContain('activeController?.abort()')
    expect(source).toContain('content: props.welcomeMessage')
    expect(source).toContain('v-if="messages.length > 1"')
    expect(source).toContain('@click="resetConversation"')
    expect(source).toContain('↺ 처음으로')
  })
})
