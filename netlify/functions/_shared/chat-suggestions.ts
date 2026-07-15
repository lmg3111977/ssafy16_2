const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구',
  '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구',
  '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구',
  '은평구', '종로구', '중구', '중랑구',
] as const

const PERIOD_PATTERN = /(\d{4}년\s*(?:1[0-2]|0?[1-9])월|(?:1[0-2]|0?[1-9])월|오늘|내일|이번\s*주말?|주말|이번\s*달|다음\s*달)/

export function createChatSuggestions(
  question: string,
): [string, string, string] {
  const district = SEOUL_DISTRICTS.find((name) => question.includes(name))
  const period = question.match(PERIOD_PATTERN)?.[1]?.replace(/\s+/g, ' ')

  if (district) {
    return [
      period ? `${period} ${district} 축제 알려줘` : `${district} 관광지 알려줘`,
      `${district} 쇼핑 장소 알려줘`,
      `${district} 숙박 시설 알려줘`,
    ]
  }

  return [
    period ? `${period} 서울 축제 알려줘` : '오늘 진행 중인 서울 축제 알려줘',
    '서울 여행 코스 추천해줘',
    '서울 호텔 추천해줘',
  ]
}
