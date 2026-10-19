import { join } from 'path'

/**
 * A macOS pkg installer can leave `Game.app` where Heroic expected a folder
 * named `Game`.
 */
export function gogInstallDirectory(
  parent: string,
  folderName: string,
  entries: string[] | undefined
): string {
  const expected = join(parent, folderName)
  if (!entries || entries.includes(folderName)) return expected

  const app = `${folderName}.app`
  if (entries.includes(app)) return join(parent, app)

  const apps = entries.filter((entry) => entry.endsWith('.app'))
  const compact = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const wanted = compact(folderName)
  const match = apps.find((name) => {
    const got = compact(name.replace(/\.app$/, ''))
    const length = Math.min(10, wanted.length, got.length)
    return (
      length > 0 &&
      (got.startsWith(wanted.slice(0, length)) ||
        wanted.startsWith(got.slice(0, length)))
    )
  })
  if (match) return join(parent, match)
  if (apps.length === 1) return join(parent, apps[0])
  return expected
}
