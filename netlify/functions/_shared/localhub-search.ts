import type {
  ChatContext,
  LocalHubSource,
  LocalHubSourceType,
} from '../../../shared/chat-contract'
import { searchFestivals } from './festival-search'
import { getProviderIndex } from './localhub-data'

const GENERIC_TERMS = new Set([
  '서울', '추천', '정보', '알려줘', '찾아줘', '보여줘', '어디', '여행',
  '호텔', '숙박', '쇼핑', '관광지', '명소', '문화시설', '문화', '레포츠',
  '레저', '코스', '축제', '공연', '행사',
])

export interface LocalHubSearchOptions {
  sourceTypes: LocalHubSourceType[]
  communityPosts?: ChatContext['communityPosts']
  limit?: number
  today?: string
  now?: Date
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('ko-KR').replace(/[\s\p{P}\p{S}]+/gu, '')
}

function queryTerms(question: string): string[] {
  return question
    .toLocaleLowerCase('ko-KR')
    .split(/[\s,./!?()[\]{}:;"'~+\-_]+/)
    .map((term) => term.replace(/(?:에서|에는|으로|에게|의|은|는|이|가|을|를|도)$/u, ''))
    .filter((term) => term.length >= 2 && !GENERIC_TERMS.has(term))
}

function searchStaticProvider(
  type: Exclude<LocalHubSourceType, 'festival' | 'community'>,
  question: string,
): LocalHubSource[] {
  const terms = queryTerms(question).map(normalize)

  return getProviderIndex(type)
    .map((entry, order) => {
      const title = normalize(entry.source.title)
      let score = terms.length === 0 ? 1 : 0
      for (const term of terms) {
        if (title.includes(term)) score += 12
        else if (entry.searchable.includes(term)) score += 5
      }
      return { ...entry, score, order }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map((entry) => entry.source)
}

function searchCommunity(
  question: string,
  posts: NonNullable<ChatContext['communityPosts']>,
): LocalHubSource[] {
  const terms = queryTerms(question).map(normalize)
  return posts
    .map((post, order) => {
      const searchable = normalize(`${post.title} ${post.content}`)
      const score = terms.length === 0
        ? 1
        : terms.reduce((total, term) => total + (searchable.includes(term) ? 8 : 0), 0)
      return { post, order, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map(({ post }): LocalHubSource => ({
      contentId: post.id,
      type: 'community',
      title: post.title,
      summary: post.content,
      address: null,
      eventPlace: null,
      startDate: post.createdAt || null,
      endDate: null,
      playTime: null,
      fee: null,
      ageLimit: null,
      phone: null,
      imageUrl: null,
      longitude: null,
      latitude: null,
      status: 'unknown',
      programExcerpt: null,
    }))
}

export function searchLocalHub(
  question: string,
  options: LocalHubSearchOptions,
): LocalHubSource[] {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 5)
  const providerResults = options.sourceTypes.map((type) => {
    if (type === 'festival') {
      return searchFestivals(question, {
        today: options.today,
        now: options.now,
        limit: 3,
      })
    }
    if (type === 'community') {
      return searchCommunity(question, options.communityPosts ?? [])
    }
    return searchStaticProvider(type, question)
  })

  const merged: LocalHubSource[] = []
  for (let position = 0; position < 3 && merged.length < limit; position += 1) {
    for (const results of providerResults) {
      const candidate = results[position]
      if (candidate) merged.push(candidate)
      if (merged.length === limit) break
    }
  }
  return merged
}
