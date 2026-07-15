import festivalJson from '../data/seoul-festivals.json'
import type {
  FestivalItem,
  FestivalJson,
  FestivalSource,
} from './festival-types'

const data = festivalJson as FestivalJson
const items = data.items

const STOP_WORDS = new Set([
  '\uC11C\uC6B8', '\uC11C\uC6B8\uC2DC', '\uCD95\uC81C', '\uD589\uC0AC', '\uACF5\uC5F0',
  '\uBB34\uB8CC', '\uACF5\uC9DC', '\uC624\uB298', '\uD604\uC7AC', '\uC9C0\uAE08', '\uC774\uBC88',
  '\uC8FC\uB9D0', '\uC5F4\uB9AC\uB294', '\uC5F4\uB9B4', '\uC9C4\uD589', '\uC9C4\uD589\uC911',
  '\uC911\uC778', '\uC608\uC815', '\uC55E\uC73C\uB85C', '\uB2E4\uAC00\uC624\uB294', '\uC77C\uC815',
  '\uC7A5\uC18C', '\uC704\uCE58', '\uC54C\uB824\uC918', '\uC54C\uB824\uC8FC\uC138\uC694',
  '\uCC3E\uC544\uC918', '\uCC3E\uC544\uC8FC\uC138\uC694', '\uCD94\uCC9C', '\uCD94\uCC9C\uD574\uC918',
  '\uC788\uC5B4', '\uC788\uB098\uC694', '\uC5B4\uB514', '\uBB50\uC57C', '\uBB34\uC5C7', '\uC815\uBCF4',
])

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function tokensFromQuestion(question: string): string[] {
  const seen = new Set<string>()

  return question
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^(?:0?[1-9]|1[0-2])\uC6D4$/u.test(token))
    .filter((token) => !/^20\d{2}\uB144$/u.test(token))
    .filter((token) => token.length >= 2)
    .filter((token) => {
      if (STOP_WORDS.has(token)) return false
      if (['\uC54C\uB824', '\uCC3E\uC544', '\uCD94\uCC9C', '\uC77C\uC815', '\uC7A5\uC18C', '\uC704\uCE58'].some((prefix) => token.startsWith(prefix))) {
        return false
      }
      const normalizedToken = normalize(token)
      if (!normalizedToken || seen.has(normalizedToken)) return false
      seen.add(normalizedToken)
      return true
    })
}

function parseCompactDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{8}$/.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return Number.isNaN(date.getTime()) ? null : date
}

function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0))
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / 86_400_000)
}

function addDays(date: Date, days: number): Date {
  const next = dateOnly(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function monthRange(year: number, month: number): [Date, Date] {
  return [new Date(Date.UTC(year, month - 1, 1, 12)), new Date(Date.UTC(year, month, 0, 12))]
}

function rangesOverlap(itemStart: Date | null, itemEnd: Date | null, rangeStart: Date, rangeEnd: Date): boolean {
  return Boolean(itemStart && itemEnd && itemStart <= rangeEnd && itemEnd >= rangeStart)
}

function includesAny(value: string, keywords: string[]): boolean {
  const normalizedValue = normalize(value)
  return keywords.some((keyword) => normalizedValue.includes(normalize(keyword)))
}

export function isFreeFestival(item: FestivalItem): boolean {
  const fee = (item.usetimefestival ?? '').trim()
  return /^(?:\uBB34\uB8CC|0\s*\uC6D0)(?:\s|$|\()/u.test(fee)
}

function statusRank(item: FestivalItem, now: Date): number {
  const start = parseCompactDate(item.eventstartdate)
  const end = parseCompactDate(item.eventenddate)
  const today = dateOnly(now)
  if (start && end && start <= today && end >= today) return 3
  if (start && start > today) return 2
  if (end && end < today) return 1
  return 0
}

export function getFestivalStatus(item: FestivalItem, now: Date): FestivalSource['status'] {
  const rank = statusRank(item, now)
  if (rank === 3) return 'ongoing'
  if (rank === 2) return 'upcoming'
  if (rank === 1) return 'ended'
  return 'unknown'
}

export function getSeoulToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12))
}

interface SearchOptions { now?: Date; limit?: number }
interface TemporalFilter { start: Date; end: Date }

function extractTemporalFilter(question: string, now: Date): TemporalFilter | null {
  const monthMatch = question.match(/(?:(20\d{2})\s*\uB144\s*)?(\d{1,2})\s*\uC6D4/u)
  if (monthMatch) {
    const year = monthMatch[1] ? Number(monthMatch[1]) : now.getUTCFullYear()
    const month = Number(monthMatch[2])
    if (month >= 1 && month <= 12) {
      const [start, end] = monthRange(year, month)
      return { start, end }
    }
  }
  if (includesAny(question, ['\uC774\uBC88 \uB2EC', '\uC774\uBC88\uB2EC'])) {
    const [start, end] = monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1)
    return { start, end }
  }
  if (includesAny(question, ['\uC624\uB298', '\uD604\uC7AC', '\uC9C0\uAE08'])) {
    const today = dateOnly(now)
    return { start: today, end: today }
  }
  if (includesAny(question, ['\uC8FC\uB9D0', '\uC774\uBC88 \uC8FC\uB9D0', '\uC774\uBC88\uC8FC\uB9D0'])) {
    const today = dateOnly(now)
    const daysUntilSaturday = (6 - today.getUTCDay() + 7) % 7
    const saturday = addDays(today, daysUntilSaturday)
    return { start: saturday, end: addDays(saturday, 1) }
  }
  return null
}

function extractDistrict(question: string): string | null {
  return question.match(/([\uAC00-\uD7A3]{1,8}\uAD6C)/u)?.[1] ?? null
}

function buildSearchText(item: FestivalItem): Record<string, string> {
  return {
    title: normalize(item.title),
    address: normalize(`${item.addr1 ?? ''} ${item.addr2 ?? ''}`),
    place: normalize(item.eventplace),
    program: normalize(`${item.program ?? ''} ${item.subevent ?? ''}`),
    age: normalize(item.agelimit),
    fee: normalize(item.usetimefestival),
    sponsor: normalize(`${item.sponsor1 ?? ''} ${item.sponsor2 ?? ''}`),
  }
}

export function searchFestivals(question: string, options: SearchOptions = {}): FestivalItem[] {
  const now = dateOnly(options.now ?? getSeoulToday())
  const limit = Math.max(1, Math.min(options.limit ?? 5, 10))
  const questionNormalized = normalize(question)
  const tokens = tokensFromQuestion(question)
  const district = extractDistrict(question)
  const temporal = extractTemporalFilter(question, now)
  const freeOnly = includesAny(question, ['\uBB34\uB8CC', '\uACF5\uC9DC', '0\uC6D0'])
  const ongoingOnly = includesAny(question, ['\uC9C4\uD589 \uC911', '\uC9C4\uD589\uC911', '\uD604\uC7AC \uC5F4\uB9AC\uB294', '\uC9C0\uAE08 \uC5F4\uB9AC\uB294'])
  const upcomingOnly = includesAny(question, ['\uC608\uC815', '\uC55E\uC73C\uB85C', '\uB2E4\uAC00\uC624\uB294', '\uC5F4\uB9B4'])
  const hasSearchTokens = tokens.length > 0

  const scored = items
    .filter((item) => {
      const start = parseCompactDate(item.eventstartdate)
      const end = parseCompactDate(item.eventenddate)
      if (district && !normalize(`${item.addr1} ${item.eventplace}`).includes(normalize(district))) return false
      if (freeOnly && !isFreeFestival(item)) return false
      if (temporal && !rangesOverlap(start, end, temporal.start, temporal.end)) return false
      if (ongoingOnly && !(start && end && start <= now && end >= now)) return false
      if (upcomingOnly && !(start && start > now)) return false
      if (!hasSearchTokens && !temporal && !ongoingOnly && !upcomingOnly) return Boolean(end && end >= now)
      return true
    })
    .map((item) => {
      const searchable = buildSearchText(item)
      let textScore = 0
      if (searchable.title && questionNormalized.includes(searchable.title)) textScore += 120
      for (const token of tokens) {
        const normalizedToken = normalize(token)
        if (!normalizedToken) continue
        if (searchable.title.includes(normalizedToken)) textScore += 32
        if (searchable.place.includes(normalizedToken)) textScore += 14
        if (searchable.address.includes(normalizedToken)) textScore += 12
        if (searchable.program.includes(normalizedToken)) textScore += 5
        if (searchable.age.includes(normalizedToken)) textScore += 4
        if (searchable.fee.includes(normalizedToken)) textScore += 4
        if (searchable.sponsor.includes(normalizedToken)) textScore += 2
      }
      let score = textScore + statusRank(item, now) * 4
      const start = parseCompactDate(item.eventstartdate)
      if (start && start >= now) score += Math.max(0, 10 - Math.floor(daysBetween(now, start) / 30))
      return { item, score, textScore }
    })
    .filter(({ textScore }) => !hasSearchTokens || textScore >= 5)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const statusDifference = statusRank(b.item, now) - statusRank(a.item, now)
      if (statusDifference !== 0) return statusDifference
      const aStart = parseCompactDate(a.item.eventstartdate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bStart = parseCompactDate(b.item.eventstartdate)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aStart - bStart
    })
  return scored.slice(0, limit).map(({ item }) => item)
}

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function nullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function toFestivalSource(item: FestivalItem, now: Date): FestivalSource {
  const address = [item.addr1, item.addr2].map((value) => value?.trim()).filter(Boolean).join(' ')
  return {
    contentId: item.contentid,
    title: item.title,
    address: address || null,
    eventPlace: nullable(item.eventplace),
    startDate: nullable(item.eventstartdate),
    endDate: nullable(item.eventenddate),
    playtime: nullable(item.playtime),
    fee: nullable(item.usetimefestival),
    ageLimit: nullable(item.agelimit),
    phone: nullable(item.tel || item.sponsor1tel),
    longitude: toNumber(item.mapx),
    latitude: toNumber(item.mapy),
    status: getFestivalStatus(item, now),
  }
}

function formatDate(value: string | null): string {
  if (!value || !/^\d{8}$/.test(value)) return '\uC815\uBCF4 \uC5C6\uC74C'
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`
}

export function buildSearchOnlyAnswer(itemsForAnswer: FestivalItem[]): string {
  if (itemsForAnswer.length === 0) {
    return [
      '\uC81C\uACF5\uB41C \uC11C\uC6B8 \uCD95\uC81C JSON\uC5D0\uC11C \uC9C8\uBB38\uACFC \uC77C\uCE58\uD558\uB294 \uD589\uC0AC\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
      '\uCD95\uC81C\uBA85, \uC790\uCE58\uAD6C, \uC6D4, \uBB34\uB8CC \uC5EC\uBD80\uB97C \uD3EC\uD568\uD574 \uB2E4\uC2DC \uC9C8\uBB38\uD574 \uC8FC\uC138\uC694.',
    ].join('\n')
  }
  const intro = itemsForAnswer.length === 1
    ? '\uC81C\uACF5\uB41C JSON\uC5D0\uC11C \uD655\uC778\uD55C \uD589\uC0AC\uC785\uB2C8\uB2E4.'
    : `\uC81C\uACF5\uB41C JSON\uC5D0\uC11C ${itemsForAnswer.length}\uAC1C \uD589\uC0AC\uB97C \uCC3E\uC558\uC2B5\uB2C8\uB2E4.`
  const body = itemsForAnswer.map((item, index) => {
    const place = nullable(item.eventplace) ?? nullable(item.addr1) ?? '\uC815\uBCF4 \uC5C6\uC74C'
    const fee = nullable(item.usetimefestival) ?? '\uC815\uBCF4 \uC5C6\uC74C'
    return [
      `${index + 1}. ${item.title}`,
      `- \uAE30\uAC04: ${formatDate(item.eventstartdate)} ~ ${formatDate(item.eventenddate)}`,
      `- \uC7A5\uC18C: ${place}`,
      `- \uC694\uAE08: ${fee}`,
    ].join('\n')
  })
  return [intro, '', ...body].join('\n')
}

export function toPromptRecord(item: FestivalItem): Record<string, unknown> {
  return {
    title: item.title,
    address: nullable([item.addr1, item.addr2].filter(Boolean).join(' ')),
    eventPlace: nullable(item.eventplace),
    eventStartDate: nullable(item.eventstartdate),
    eventEndDate: nullable(item.eventenddate),
    playtime: nullable(item.playtime),
    fee: nullable(item.usetimefestival),
    ageLimit: nullable(item.agelimit),
    phone: nullable(item.tel || item.sponsor1tel),
    program: nullable(item.program)?.slice(0, 900) ?? null,
    longitude: toNumber(item.mapx),
    latitude: toNumber(item.mapy),
  }
}
