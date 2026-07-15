import rawFestivalData from '../data/seoul-festivals.json'
import type { FestivalDataFile, RawFestivalItem } from './festival-types'

const data = rawFestivalData as FestivalDataFile

export const festivals: readonly RawFestivalItem[] = Object.freeze(data.items)
export const festivalDataMeta = Object.freeze({
  region: data.region,
  contentType: data.contentType,
  total: data.total,
})
