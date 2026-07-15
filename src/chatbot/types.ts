export type {
  ChatMode,
  ChatContext,
  FestivalChatErrorBody,
  FestivalChatRequest,
  FestivalChatResponse,
  FestivalSource,
  LocalHubSource,
  LocalHubSourceType,
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
  suggestions?: string[]
}
