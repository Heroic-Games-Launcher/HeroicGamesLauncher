import { join } from 'path'

export function crossoverBottlesRoot(
  home: string,
  customDir: string | undefined
): string {
  const custom = customDir?.trim()
  if (custom) {
    if (custom === '~') return home
    if (custom.startsWith('~/')) return join(home, custom.slice(2))
    return custom
  }
  return join(home, 'Library/Application Support/CrossOver/Bottles')
}
