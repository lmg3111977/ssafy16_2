export interface FestivalJson {
  region: string
  contentType: string
  contentTypeId: string | number
  total: number
  items: FestivalItem[]
}

export interface FestivalItem {
  contentid: string
  contenttypeid: string
  title: string
  addr1: string
  addr2: string
  mapx: string
  mapy: string
  tel: string
  firstimage: string
  firstimage2: string
  eventstartdate: string | null
  eventenddate: string | null
  eventplace: string | null
  playtime: string | null
  program: string | null
  subevent: string | null
  sponsor1: string | null
  sponsor1tel: string | null
  sponsor2: string | null
  sponsor2tel: string | null
  eventhomepage: string | null
  bookingplace: string | null
  agelimit: string | null
  festivalgrade: string | null
  placeinfo: string | null
  spendtimefestival: string | null
  discountinfofestival: string | null
  usetimefestival: string | null
}

export interface FestivalSource {
  contentId: string
  title: string
  address: string | null
  eventPlace: string | null
  startDate: string | null
  endDate: string | null
  playtime: string | null
  fee: string | null
  ageLimit: string | null
  phone: string | null
  longitude: number | null
  latitude: number | null
  status: 'ongoing' | 'upcoming' | 'ended' | 'unknown'
}
