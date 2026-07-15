export type AppView = 'home' | 'explore' | 'community'

const views = new Set<AppView>(['home', 'explore', 'community'])

export function parseViewHash(hash: string): AppView {
  const candidate = hash.replace(/^#/, '') as AppView
  return views.has(candidate) ? candidate : 'home'
}

export function toViewHash(view: AppView): string {
  return `#${view}`
}
