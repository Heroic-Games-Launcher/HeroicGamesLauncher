import { join } from 'path'

export function crossoverBottlesRoot(
  home: string,
  customDir: string | undefined
): string {
  const custom = customDir?.trim()
  if (custom) return custom
  return join(home, 'Library/Application Support/CrossOver/Bottles')
}
