export type {
  ChatMode,
  FestivalChatErrorBody,
  FestivalChatRequest,
  FestivalChatResponse,
  FestivalSource,
} from '../../shared/chat-contract'

import type { ChatMode, FestivalSource } from '../../shared/chat-contract'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  sources?: FestivalSource[]
  mode?: ChatMode
  warning?: string
}
