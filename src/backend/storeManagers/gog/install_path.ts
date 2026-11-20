import { join } from 'path'

/**
 * A macOS pkg installer can leave `Game.app` where Heroic expected a folder
 * named `Game`.
 */
export function gogInstallDirectory(
  parent: string,
  folderName: string,
  entries: string[] | undefined,
  hasAppInfo?: (entry: string) => boolean
): string {
  const expected = join(parent, folderName)
  if (!entries || entries.includes(folderName)) return expected

  const app = `${folderName}.app`
  if (entries.includes(app)) return join(parent, app)

  const apps = entries.filter((entry) => entry.toLowerCase().endsWith('.app'))
  if (hasAppInfo) {
    const byInfo = apps.find((entry) => hasAppInfo(entry))
    if (byInfo) return join(parent, byInfo)
  }

  const compact = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const wanted = compact(folderName)
  const match = apps.find((name) => {
    const got = compact(name.replace(/\.app$/i, ''))
    const length = Math.min(10, wanted.length, got.length)
    return (
      length >= 4 &&
      (got.startsWith(wanted.slice(0, length)) ||
        wanted.startsWith(got.slice(0, length)))
    )
  })
  if (match) return join(parent, match)
  return expected
}
