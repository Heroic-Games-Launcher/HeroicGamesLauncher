import { Runner, WineInstallation } from './types'

export const storeMap = {
  legendary: 'epic',
  gog: 'gog',
  nile: 'amazon',
  sideload: undefined,
  zoom: 'zoom'
} as const satisfies Record<Runner, string | undefined>

function getWineVersionSource(version: WineInstallation): string {
  if (version.type !== 'proton') return version.bin

  const normalizedPath = version.bin.replace(/\\/g, '/')
  if (/\/(?:compatibilitytools\.d|steamapps)(?:\/|$)/i.test(normalizedPath)) {
    return 'Steam'
  }
  if (/\/tools\/proton(?:\/|$)/i.test(normalizedPath)) return 'Heroic'
  return version.bin
}

export function getWineVersionSourceLabels(
  versions: WineInstallation[]
): string[] {
  const versionsByName = new Map<string, WineInstallation[]>()

  versions.forEach((version) => {
    const group = versionsByName.get(version.name) ?? []
    group.push(version)
    versionsByName.set(version.name, group)
  })

  return versions.map((version) => {
    const sameNameVersions = versionsByName.get(version.name) ?? []
    if (sameNameVersions.length < 2) return ''

    const source = getWineVersionSource(version)
    const sameSourceCount = sameNameVersions.filter(
      (candidate) => getWineVersionSource(candidate) === source
    ).length

    return sameSourceCount > 1 ? version.bin : source
  })
}
