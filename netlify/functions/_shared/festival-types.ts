export interface RawFestivalItem {
  contentid: string
  title: string
  addr1?: string | null
  addr2?: string | null
  tel?: string | null
  firstimage?: string | null
  mapx?: string | null
  mapy?: string | null
  eventstartdate?: string | null
  eventenddate?: string | null
  eventplace?: string | null
  playtime?: string | null
  program?: string | null
  sponsor1?: string | null
  sponsor2?: string | null
  agelimit?: string | null
  usetimefestival?: string | null
}

export interface FestivalDataFile {
  region: string
  contentType: string
  contentTypeId: number | string
  total: number
  items: RawFestivalItem[]
}
