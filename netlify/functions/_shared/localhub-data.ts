import type { LocalHubSource, LocalHubSourceType } from '../../../shared/chat-contract'
import attractionData from '../data/서울_관광지.json'
import leisureData from '../data/서울_레포츠.json'
import cultureData from '../data/서울_문화시설.json'
import shoppingData from '../data/서울_쇼핑.json'
import accommodationData from '../data/서울_숙박.json'
import courseData from '../data/서울_여행코스.json'
import festivalData from '../data/서울_축제공연행사.json'

interface RawLocalHubItem {
  contentid?: string | null
  title?: string | null
  addr1?: string | null
  addr2?: string | null
  tel?: string | null
  firstimage?: string | null
  mapx?: string | null
  mapy?: string | null
}

interface RawDataFile {
  items: RawLocalHubItem[]
}

export interface IndexedSource {
  source: LocalHubSource
  searchable: string
}

const DATA_FILES: Record<Exclude<LocalHubSourceType, 'community'>, RawDataFile> = {
  festival: festivalData,
  attraction: attractionData,
  culture: cultureData,
  leisure: leisureData,
  accommodation: accommodationData,
  shopping: shoppingData,
  course: courseData,
}

const cache = new Map<LocalHubSourceType, IndexedSource[]>()

function clean(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function coordinate(value: string | null | undefined): number | null {
  const parsed = Number(value)
  return value?.trim() && Number.isFinite(parsed) ? parsed : null
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('ko-KR').replace(/[\s\p{P}\p{S}]+/gu, '')
}

export function getProviderIndex(
  type: Exclude<LocalHubSourceType, 'community'>,
): readonly IndexedSource[] {
  const cached = cache.get(type)
  if (cached) return cached

  const indexed = DATA_FILES[type].items.map((item, index): IndexedSource => {
    const title = clean(item.title) || '이름 미상'
    const address = [clean(item.addr1), clean(item.addr2)].filter(Boolean).join(' ')
    const source: LocalHubSource = {
      contentId: clean(item.contentid) || `${type}-${index}`,
      type,
      title,
      summary: null,
      address: address || null,
      eventPlace: null,
      startDate: null,
      endDate: null,
      playTime: null,
      fee: null,
      ageLimit: null,
      phone: clean(item.tel) || null,
      imageUrl: clean(item.firstimage) || null,
      longitude: coordinate(item.mapx),
      latitude: coordinate(item.mapy),
      status: 'unknown',
      programExcerpt: null,
    }

    return { source, searchable: normalize(`${title} ${address}`) }
  })

  cache.set(type, indexed)
  return indexed
}
