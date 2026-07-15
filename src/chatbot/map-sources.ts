import type { LocalHubSource } from '../../shared/chat-contract'
import { normalizeChatSources } from '../features/map/data'

export function hasMappableSources(sources: LocalHubSource[] = []): boolean {
  return normalizeChatSources(sources).length > 0
}
