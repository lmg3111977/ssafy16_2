import type { FestivalSource } from '../../../shared/chat-contract'
import { festivals } from './festival-data'
import type { RawFestivalItem } from './festival-types'

const SEOUL_DISTRICTS = [
  '강남구',
  '강동구',
  '강북구',
  '강서구',
  '관악구',
  '광진구',
  '구로구',
  '금천구',
  '노원구',
  '도봉구',
  '동대문구',
  '동작구',
  '마포구',
  '서대문구',
  '서초구',
  '성동구',
  '성북구',
  '송파구',
  '양천구',
  '영등포구',
  '용산구',
  '은평구',
  '종로구',
  '중구',
  '중랑구',
] as const

const STOP_WORDS = new Set([
  '서울',
  '축제',
  '공연',
  '행사',
  '정보',
  '일정',
  '추천',
  '알려줘',
  '찾아줘',
  '보여줘',
  '궁금해',
  '있어',
  '어디',
  '언제',
  '어떤',
  '이번',
  '오늘',
  '무료',
  '진행',
  '예정',
  '중인',
])

interface DateRange {
  start: string
  end: string
}

interface SearchIntent {
  dateRange?: DateRange
  month?: number
  district?: string
  freeOnly: boolean
  status?: 'ongoing' | 'upcoming' | 'ended'
}

export interface SearchOptions {
  limit?: number
  now?: Date
  today?: string
}

function clean(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function compact(value: string): string {
  return value.toLocaleLowerCase('ko-KR').replace(/[\s\p{P}\p{S}]+/gu, '')
}

function toNumber(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDateKey(value: string | null | undefined): string | null {
  const digits = clean(value).replace(/\D/g, '')
  if (digits.length !== 8) return null
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function getKstDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}${values.month}${values.day}`
}

function dateKeyToUtc(dateKey: string): Date {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(4, 6)) - 1
  const day = Number(dateKey.slice(6, 8))
  return new Date(Date.UTC(year, month, day))
}

function utcToDateKey(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('')
}

function addDays(dateKey: string, amount: number): string {
  const date = dateKeyToUtc(dateKey)
  date.setUTCDate(date.getUTCDate() + amount)
  return utcToDateKey(date)
}

function getWeekendRange(today: string): DateRange {
  const day = dateKeyToUtc(today).getUTCDay()
  if (day === 0) return { start: today, end: today }

  const daysUntilSaturday = (6 - day + 7) % 7
  const saturday = addDays(today, daysUntilSaturday)
  return { start: saturday, end: addDays(saturday, 1) }
}

function getMonthRange(year: number, month: number): DateRange {
  const start = `${year}${month.toString().padStart(2, '0')}01`
  const nextMonth = new Date(Date.UTC(year, month, 1))
  nextMonth.setUTCDate(0)
  return { start, end: utcToDateKey(nextMonth) }
}

function overlapsDateRange(item: RawFestivalItem, range: DateRange): boolean {
  const start = clean(item.eventstartdate)
  const end = clean(item.eventenddate) || start
  if (!start || start.length !== 8) return false
  return start <= range.end && end >= range.start
}

function getStatus(
  item: RawFestivalItem,
  today: string,
): FestivalSource['status'] {
  const start = clean(item.eventstartdate)
  const end = clean(item.eventenddate) || start
  if (!start || start.length !== 8) return 'unknown'
  if (today < start) return 'upcoming'
  if (today > end) return 'ended'
  return 'ongoing'
}

function extractIntent(question: string, today: string): SearchIntent {
  const normalized = compact(question)
  const year = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(4, 6))
  const monthMatch = question.match(/(?:^|\D)(1[0-2]|0?[1-9])월/)
  const district = SEOUL_DISTRICTS.find((name) => question.includes(name))

  const intent: SearchIntent = {
    freeOnly: normalized.includes('무료'),
    district,
  }

  if (normalized.includes('오늘')) {
    intent.dateRange = { start: today, end: today }
  } else if (normalized.includes('이번주말') || normalized.includes('주말')) {
    intent.dateRange = getWeekendRange(today)
  } else if (normalized.includes('이번달')) {
    intent.dateRange = getMonthRange(year, currentMonth)
  } else if (monthMatch) {
    const month = Number(monthMatch[1])
    intent.month = month
    intent.dateRange = getMonthRange(year, month)
  }

  if (normalized.includes('진행중') || normalized.includes('현재')) {
    intent.status = 'ongoing'
  } else if (normalized.includes('예정') || normalized.includes('앞으로')) {
    intent.status = 'upcoming'
  } else if (normalized.includes('종료') || normalized.includes('지난')) {
    intent.status = 'ended'
  }

  return intent
}

function extractTerms(question: string): string[] {
  return question
    .toLocaleLowerCase('ko-KR')
    .split(/[\s,./!?()\[\]{}:;"'~+\-_]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term))
    .filter((term) => !/^(?:1[0-2]|0?[1-9])월$/.test(term))
    .filter((term) => !/^(축제|행사|공연)(가|이|은|는|을|를|도)?$/.test(term))
    .filter((term, index, terms) => terms.indexOf(term) === index)
}

function isFree(item: RawFestivalItem): boolean {
  const fee = compact(clean(item.usetimefestival)).replace(/^[^0-9가-힣]+/u, '')
  if (!fee) return false

  // 유아·사전등록 등 일부 대상만 무료인 유료 행사를 전체 무료로 오인하지 않는다.
  if (/^(?:유료|\d[\d,]*원|성인|일반|현장|사전|온라인)/.test(fee)) {
    return false
  }

  return (
    fee === '0' ||
    fee === '0원' ||
    fee.startsWith('무료') ||
    fee.startsWith('공연무료') ||
    fee.includes('입장료무료')
  )
}

function distanceInDays(from: string, to: string): number {
  return Math.round(
    (dateKeyToUtc(to).getTime() - dateKeyToUtc(from).getTime()) /
      (24 * 60 * 60 * 1000),
  )
}

function toSource(item: RawFestivalItem, today: string): FestivalSource {
  const address = [clean(item.addr1), clean(item.addr2)].filter(Boolean).join(' ')
  const program = clean(item.program).replace(/\s+/g, ' ')

  return {
    contentId: item.contentid,
    title: clean(item.title),
    address: address || null,
    eventPlace: clean(item.eventplace) || null,
    startDate: formatDateKey(item.eventstartdate),
    endDate: formatDateKey(item.eventenddate),
    playTime: clean(item.playtime) || null,
    fee: clean(item.usetimefestival) || null,
    ageLimit: clean(item.agelimit) || null,
    phone: clean(item.tel) || null,
    imageUrl: clean(item.firstimage) || null,
    longitude: toNumber(item.mapx),
    latitude: toNumber(item.mapy),
    status: getStatus(item, today),
    programExcerpt: program ? `${program.slice(0, 240)}${program.length > 240 ? '…' : ''}` : null,
  }
}

export function searchFestivalData(
  data: readonly RawFestivalItem[],
  question: string,
  options: SearchOptions = {},
): FestivalSource[] {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 8)
  const today = options.today ?? getKstDateKey(options.now ?? new Date())
  const intent = extractIntent(question, today)
  const terms = extractTerms(question)
  const compactQuestion = compact(question)
  const hasExplicitIntent = Boolean(
    intent.dateRange || intent.district || intent.freeOnly || intent.status,
  )

  const ranked = data
    .map((item) => {
      const title = clean(item.title)
      const address = [clean(item.addr1), clean(item.addr2)].join(' ')
      const place = clean(item.eventplace)
      const program = clean(item.program)
      const sponsor = [clean(item.sponsor1), clean(item.sponsor2)].join(' ')
      const fee = clean(item.usetimefestival)
      const age = clean(item.agelimit)
      const status = getStatus(item, today)

      if (intent.dateRange && !overlapsDateRange(item, intent.dateRange)) return null
      if (intent.district && !`${address} ${place}`.includes(intent.district)) return null
      if (intent.freeOnly && !isFree(item)) return null
      if (intent.status && status !== intent.status) return null

      const compactTitle = compact(title)
      const compactAddress = compact(address)
      const compactPlace = compact(place)
      const compactProgram = compact(program)
      const compactSponsor = compact(sponsor)
      const compactFee = compact(fee)
      const compactAge = compact(age)

      let score = 0
      let lexicalMatch = terms.length === 0

      if (compactQuestion.length >= 2 && compactTitle === compactQuestion) {
        score += 260
        lexicalMatch = true
      } else if (
        compactQuestion.length >= 2 &&
        compactTitle.includes(compactQuestion)
      ) {
        score += 150
        lexicalMatch = true
      }

      for (const term of terms) {
        const normalizedTerm = compact(term)
        if (!normalizedTerm) continue

        if (compactTitle.includes(normalizedTerm)) {
          score += 72
          lexicalMatch = true
        }
        if (compactPlace.includes(normalizedTerm)) {
          score += 42
          lexicalMatch = true
        }
        if (compactAddress.includes(normalizedTerm)) {
          score += 32
          lexicalMatch = true
        }
        if (compactProgram.includes(normalizedTerm)) {
          score += 14
          lexicalMatch = true
        }
        if (compactSponsor.includes(normalizedTerm)) {
          score += 9
          lexicalMatch = true
        }
        if (compactFee.includes(normalizedTerm) || compactAge.includes(normalizedTerm)) {
          score += 7
          lexicalMatch = true
        }
      }

      if (!lexicalMatch && terms.length > 0) return null

      if (intent.freeOnly) score += 35
      if (intent.district) score += 30
      if (intent.dateRange) score += 30

      if (!hasExplicitIntent && terms.length === 0) {
        if (status === 'ongoing') score += 55
        if (status === 'upcoming') score += 40
        if (status === 'ended') score -= 25
      }

      const start = clean(item.eventstartdate)
      if (start.length === 8 && start >= today) {
        score += Math.max(0, 24 - Math.floor(distanceInDays(today, start) / 7))
      }

      return { item, score }
    })
    .filter((entry): entry is { item: RawFestivalItem; score: number } => entry !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aStart = clean(a.item.eventstartdate) || '99999999'
      const bStart = clean(b.item.eventstartdate) || '99999999'
      return aStart.localeCompare(bStart)
    })
    .slice(0, limit)

  return ranked.map(({ item }) => toSource(item, today))
}


export function searchFestivals(
  question: string,
  options: SearchOptions = {},
): FestivalSource[] {
  return searchFestivalData(festivals, question, options)
}
