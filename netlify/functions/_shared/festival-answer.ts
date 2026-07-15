import type { FestivalSource } from '../../../shared/chat-contract'

function period(source: FestivalSource): string {
  if (!source.startDate && !source.endDate) return '일정 정보 없음'
  if (source.startDate === source.endDate) return source.startDate ?? '일정 정보 없음'
  return `${source.startDate ?? '미정'} ~ ${source.endDate ?? '미정'}`
}

export function createFallbackAnswer(sources: FestivalSource[]): string {
  if (sources.length === 0) {
    return '제공된 서울 축제·공연·행사 데이터에서 관련 정보를 찾지 못했습니다. 축제명, 자치구, 날짜를 조금 더 구체적으로 입력해 주세요.'
  }

  if (sources.length === 1) {
    const source = sources[0]
    const lines = [
      `${source.title} 정보를 확인했습니다.`,
      `기간: ${period(source)}`,
      `장소: ${source.eventPlace ?? source.address ?? '정보 없음'}`,
    ]

    if (source.playTime) lines.push(`시간: ${source.playTime}`)
    if (source.fee) lines.push(`요금: ${source.fee}`)
    if (source.ageLimit) lines.push(`관람 연령: ${source.ageLimit}`)

    return lines.join('\n')
  }

  const list = sources.map((source, index) => {
    const place = source.eventPlace ?? source.address ?? '장소 정보 없음'
    return `${index + 1}. ${source.title}\n   기간: ${period(source)}\n   장소: ${place}${source.fee ? `\n   요금: ${source.fee}` : ''}`
  })

  return `조건에 맞는 행사 ${sources.length}건을 찾았습니다.\n\n${list.join('\n\n')}`
}
