import type { LocalHubSource } from '../../../shared/chat-contract'

export type MapPlaceType = Exclude<LocalHubSource['type'], 'community'>
export type MapCategory = Exclude<MapPlaceType, 'shopping'>

export interface RawMapItem {
  contentid?: string | null
  title?: string | null
  addr1?: string | null
  addr2?: string | null
  mapx?: string | number | null
  mapy?: string | number | null
  firstimage?: string | null
  eventstartdate?: string | null
  eventenddate?: string | null
  eventplace?: string | null
  usetimefestival?: string | null
}

export interface RawMapDataset {
  items: RawMapItem[]
}

export interface MapPlace {
  id: string
  type: MapPlaceType
  title: string
  address: string | null
  district: string | null
  latitude: number
  longitude: number
  imageUrl: string | null
  startDate: string | null
  endDate: string | null
  eventPlace: string | null
  fee: string | null
}

export interface MapFilters {
  district: string
  startDate: string
  endDate: string
}

export interface ChatMapRequest {
  id: string
  sources: LocalHubSource[]
}
