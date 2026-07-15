import { describe, expect, it } from 'vitest'

import { hasMappableSources } from '../src/chatbot/map-sources'
import type { LocalHubSource } from '../shared/chat-contract'

function source(patch: Partial<LocalHubSource> = {}): LocalHubSource {
  return {
    contentId: '1',
    type: 'festival',
    title: '장소',
    summary: null,
    address: null,
    eventPlace: null,
    startDate: null,
    endDate: null,
    playTime: null,
    fee: null,
    ageLimit: null,
    phone: null,
    imageUrl: null,
    longitude: 126.98,
    latitude: 37.56,
    status: 'unknown',
    programExcerpt: null,
    ...patch,
  }
}

describe('chat map source button', () => {
  it('shows for a mappable shopping recommendation', () => {
    expect(hasMappableSources([source({ type: 'shopping' })])).toBe(true)
  })

  it('hides for community, missing, and out-of-Seoul coordinates', () => {
    expect(hasMappableSources([
      source({ type: 'community' }),
      source({ latitude: null }),
      source({ latitude: 35.17, longitude: 129.07 }),
    ])).toBe(false)
  })
})
