import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')

describe('home representative category stats', () => {
  it('shows the approved categories and source record counts in order', () => {
    const expected = [
      "{ value: '783', label: '관광지' }",
      "{ value: '201', label: '축제·행사' }",
      "{ value: '566', label: '문화시설' }",
      "{ value: '423', label: '숙박' }",
    ]
    const indexes = expected.map((entry) => source.indexOf(entry))

    expect(indexes.every((index) => index >= 0)).toBe(true)
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right))
  })
})
