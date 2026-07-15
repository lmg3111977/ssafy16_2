import type { LocalHubSource, LocalHubSourceType } from '../../../shared/chat-contract'

const TYPE_LABELS: Record<LocalHubSourceType, string> = {
  festival: '축제·공연·행사',
  attraction: '관광지',
  culture: '문화시설',
  leisure: '레포츠',
  accommodation: '숙박',
  shopping: '쇼핑',
  course: '여행 코스',
  community: '커뮤니티',
}

function period(source: LocalHubSource): string {
  if (!source.startDate && !source.endDate) return '일정 정보 없음'
  if (source.startDate === source.endDate) return source.startDate ?? '일정 정보 없음'
  return `${source.startDate ?? '미정'} ~ ${source.endDate ?? '미정'}`
}

export function createFallbackAnswer(sources: LocalHubSource[]): string {
  if (sources.length === 0) {
    return '제공된 서울 지역 데이터에서 관련 정보를 찾지 못했습니다. 장소명, 자치구, 날짜나 원하는 자료 유형을 조금 더 구체적으로 입력해 주세요.'
  }

  if (sources.length === 1) {
    const source = sources[0]
    const lines = [
      `${source.title} (${TYPE_LABELS[source.type]}) 정보를 확인했습니다.`,
      `장소: ${source.eventPlace ?? source.address ?? '정보 없음'}`,
    ]

    if (source.startDate || source.endDate) lines.splice(1, 0, `기간: ${period(source)}`)
    if (source.summary) lines.push(`요약: ${source.summary}`)
    if (source.playTime) lines.push(`시간: ${source.playTime}`)
    if (source.fee) lines.push(`요금: ${source.fee}`)
    if (source.ageLimit) lines.push(`관람 연령: ${source.ageLimit}`)

    return lines.join('\n')
  }

  const list = sources.map((source, index) => {
    const place = source.eventPlace ?? source.address ?? '장소 정보 없음'
    const details = [`   유형: ${TYPE_LABELS[source.type]}`]
    if (source.startDate || source.endDate) details.push(`   기간: ${period(source)}`)
    details.push(`   장소: ${place}`)
    if (source.fee) details.push(`   요금: ${source.fee}`)
    return `${index + 1}. ${source.title}\n${details.join('\n')}`
  })

  return `조건에 맞는 서울 지역 정보 ${sources.length}건을 찾았습니다.\n${list.join('\n')}`
}

export function createProjectChatFallback(): string {
  return '안녕하세요! 서울 지역 정보와 이 프로젝트의 관광지, 문화시설, 레포츠, 숙박, 쇼핑, 여행 코스, 축제·행사, 커뮤니티 이용을 도와드릴 수 있어요.'
}
