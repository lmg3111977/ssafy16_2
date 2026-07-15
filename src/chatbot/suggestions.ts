export function normalizeChatSuggestions(suggestions: unknown): string[] {
  if (!Array.isArray(suggestions)) return []

  const normalized: string[] = []
  for (const value of suggestions) {
    if (typeof value !== 'string') continue
    const question = value.trim()
    if (!question || normalized.includes(question)) continue
    normalized.push(question)
    if (normalized.length === 3) break
  }
  return normalized
}
