import type { LocalHubSource } from '../../../shared/chat-contract'
import type {
  MapCategory,
  MapFilters,
  MapPlace,
  MapPlaceType,
  RawMapDataset,
  RawMapItem,
} from './types'

export const MAP_CATEGORIES: ReadonlyArray<{
  value: MapCategory
  label: string
}> = [
  { value: 'festival', label: '축제·행사' },
  { value: 'attraction', label: '관광지' },
  { value: 'culture', label: '문화시설' },
  { value: 'leisure', label: '레포츠' },
  { value: 'accommodation', label: '숙박' },
  { value: 'course', label: '여행 코스' },
]

const loaders: Record<MapCategory, () => Promise<{ default: RawMapDataset }>> = {
  festival: () => import('../../../netlify/functions/data/서울_축제공연행사.json'),
  attraction: () => import('../../../netlify/functions/data/서울_관광지.json'),
  culture: () => import('../../../netlify/functions/data/서울_문화시설.json'),
  leisure: () => import('../../../netlify/functions/data/서울_레포츠.json'),
  accommodation: () => import('../../../netlify/functions/data/서울_숙박.json'),
  course: () => import('../../../netlify/functions/data/서울_여행코스.json'),
}

const categoryCache = new Map<MapCategory, MapPlace[]>()

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  return cleaned || null
}

function coordinate(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return Number.NaN
  return Number(value)
}

function extractDistrict(address: string | null): string | null {
  if (!address) return null
  return address.match(/서울특별(?:시)?\s+([가-힣]+구)/)?.[1] ?? null
}

function normalizeDate(value: string): string {
  return value.replaceAll('-', '')
}

function dedupeKey(place: MapPlace, hasContentId: boolean): string {
  if (hasContentId) return `${place.type}:${place.id}`
  return `${place.type}:${place.title.trim().toLocaleLowerCase('ko-KR')}:${place.latitude}:${place.longitude}`
}

export function isValidSeoulCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 37.4 &&
    latitude <= 37.75 &&
    longitude >= 126.7 &&
    longitude <= 127.3
  )
}

export function normalizeDatasetItems(
  items: RawMapItem[],
  type: MapPlaceType,
): MapPlace[] {
  const places: MapPlace[] = []
  const seen = new Set<string>()

  items.forEach((item, index) => {
    const latitude = coordinate(item.mapy)
    const longitude = coordinate(item.mapx)
    if (!isValidSeoulCoordinate(latitude, longitude)) return

    const contentId = text(item.contentid)
    const title = text(item.title) ?? '이름 없는 장소'
    const address = text(item.addr1)
    const place: MapPlace = {
      id: contentId ?? `${type}-${index}`,
      type,
      title,
      address,
      district: extractDistrict(address),
      latitude,
      longitude,
      imageUrl: text(item.firstimage),
      startDate: text(item.eventstartdate),
      endDate: text(item.eventenddate),
      eventPlace: text(item.eventplace),
      fee: text(item.usetimefestival),
    }
    const key = dedupeKey(place, Boolean(contentId))
    if (seen.has(key)) return
    seen.add(key)
    places.push(place)
  })

  return places
}

export function normalizeChatSources(sources: LocalHubSource[]): MapPlace[] {
  const places: MapPlace[] = []
  const seen = new Set<string>()

  sources.forEach((source, index) => {
    if (source.type === 'community') return
    const latitude = source.latitude ?? Number.NaN
    const longitude = source.longitude ?? Number.NaN
    if (!isValidSeoulCoordinate(latitude, longitude)) return

    const address = text(source.address)
    const contentId = text(source.contentId)
    const place: MapPlace = {
      id: contentId ?? `${source.type}-${index}`,
      type: source.type,
      title: text(source.title) ?? '이름 없는 장소',
      address,
      district: extractDistrict(address),
      latitude,
      longitude,
      imageUrl: text(source.imageUrl),
      startDate: text(source.startDate),
      endDate: text(source.endDate),
      eventPlace: text(source.eventPlace),
      fee: text(source.fee),
    }
    const key = dedupeKey(place, Boolean(contentId))
    if (seen.has(key)) return
    seen.add(key)
    places.push(place)
  })

  return places
}

export function filterMapPlaces(places: MapPlace[], filters: MapFilters): MapPlace[] {
  const filterStart = normalizeDate(filters.startDate)
  const filterEnd = normalizeDate(filters.endDate)

  return places.filter((place) => {
    if (filters.district !== '전체' && place.district !== filters.district) return false
    if (place.type !== 'festival' || (!filterStart && !filterEnd)) return true
    if (!place.startDate) return false

    const placeEnd = place.endDate || place.startDate
    return (!filterEnd || place.startDate <= filterEnd) &&
      (!filterStart || placeEnd >= filterStart)
  })
}

export function listDistricts(places: MapPlace[]): string[] {
  return [...new Set(
    places
      .map((place) => place.district)
      .filter((district): district is string => Boolean(district)),
  )].sort((left, right) => left.localeCompare(right, 'ko-KR'))
}

export async function loadCategoryPlaces(category: MapCategory): Promise<MapPlace[]> {
  const cached = categoryCache.get(category)
  if (cached) return cached

  const module = await loaders[category]()
  const places = normalizeDatasetItems(module.default.items, category)
  categoryCache.set(category, places)
  return places
}
