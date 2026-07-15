import { describe, expect, it } from 'vitest'

import {
  filterMapPlaces,
  isValidSeoulCoordinate,
  listDistricts,
  MAP_CATEGORIES,
  normalizeChatSources,
  normalizeDatasetItems,
} from '../src/features/map/data'
import type { LocalHubSource } from '../shared/chat-contract'

function chatSource(patch: Partial<LocalHubSource> = {}): LocalHubSource {
  return {
    contentId: 'source-1',
    type: 'festival',
    title: '서울 행사',
    summary: null,
    address: '서울특별시 종로구',
    eventPlace: null,
    startDate: null,
    endDate: null,
    playTime: null,
    fee: null,
    ageLimit: null,
    phone: null,
    imageUrl: null,
    longitude: 126.98,
    latitude: 37.57,
    status: 'unknown',
    programExcerpt: null,
    ...patch,
  }
}

describe('map data', () => {
  it('keeps one item per content id and removes invalid coordinates', () => {
    const places = normalizeDatasetItems([
      {
        contentid: '1',
        title: '서울 행사',
        addr1: '서울특별시 종로구',
        mapx: '126.98',
        mapy: '37.57',
      },
      {
        contentid: '1',
        title: '중복 행사',
        addr1: '서울특별시 종로구',
        mapx: '126.98',
        mapy: '37.57',
      },
      {
        contentid: '2',
        title: '잘못된 좌표',
        mapx: '0',
        mapy: '0',
      },
    ], 'festival')

    expect(places).toEqual([
      expect.objectContaining({
        id: '1',
        title: '서울 행사',
        district: '종로구',
      }),
    ])
  })

  it('uses title and coordinates when content id is missing', () => {
    const item = {
      title: '같은 장소',
      mapx: '126.99',
      mapy: '37.56',
    }

    expect(normalizeDatasetItems([item, item], 'attraction')).toHaveLength(1)
  })

  it('accepts Seoul coordinates only', () => {
    expect(isValidSeoulCoordinate(37.5665, 126.978)).toBe(true)
    expect(isValidSeoulCoordinate(35.1796, 129.0756)).toBe(false)
  })

  it('excludes shopping from browse categories', () => {
    expect(MAP_CATEGORIES.map(({ value }) => value)).toEqual([
      'festival',
      'attraction',
      'culture',
      'leisure',
      'accommodation',
      'course',
    ])
  })

  it('keeps shopping returned by chat', () => {
    const places = normalizeChatSources([
      chatSource({ contentId: 'shop-1', type: 'shopping', title: '상점' }),
    ])

    expect(places).toEqual([
      expect.objectContaining({ id: 'shop-1', type: 'shopping' }),
    ])
  })

  it('removes community and invalid chat coordinates', () => {
    const places = normalizeChatSources([
      chatSource({ contentId: 'community', type: 'community' }),
      chatSource({ contentId: 'missing', latitude: null }),
      chatSource({ contentId: 'outside', latitude: 35.17, longitude: 129.07 }),
    ])

    expect(places).toEqual([])
  })

  it('filters every category by district and festivals by overlapping dates', () => {
    const places = normalizeDatasetItems([
      {
        contentid: '1',
        title: '종로 행사',
        addr1: '서울특별시 종로구',
        mapx: '126.98',
        mapy: '37.57',
        eventstartdate: '20260710',
        eventenddate: '20260720',
      },
      {
        contentid: '2',
        title: '강남 행사',
        addr1: '서울특별시 강남구',
        mapx: '127.03',
        mapy: '37.50',
        eventstartdate: '20260801',
        eventenddate: '20260802',
      },
    ], 'festival')

    expect(filterMapPlaces(places, {
      district: '종로구',
      startDate: '2026-07-15',
      endDate: '2026-07-16',
    })).toHaveLength(1)
  })

  it('lists unique districts in Korean order', () => {
    const places = normalizeDatasetItems([
      { contentid: '1', title: '종로', addr1: '서울특별시 종로구', mapx: '126.98', mapy: '37.57' },
      { contentid: '2', title: '강남', addr1: '서울특별시 강남구', mapx: '127.03', mapy: '37.50' },
      { contentid: '3', title: '종로 중복', addr1: '서울특별시 종로구', mapx: '126.99', mapy: '37.58' },
    ], 'attraction')

    expect(listDistricts(places)).toEqual(['강남구', '종로구'])
  })
})
