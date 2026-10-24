/**
 * Two Wine builds often share one Info.plist version. "Latest" then looks
 * identical to the versioned build, and the selector can only store one of
 * them. Keep the " - " format and any "-DXMT" suffix for versioned builds so
 * existing settings and DXMT checks keep working.
 */
export function macWineDisplayName(
  folderName: string,
  bundleName: string,
  bundleVersion: string
): string {
  const folder = folderName.replace(/\.app$/i, '')
  const bundle = bundleName.trim() || folder
  const dxmt =
    folder.endsWith('-DXMT') || bundleVersion.trim().endsWith('-DXMT')
  const dxmtSuffix = dxmt ? '-DXMT' : ''
  const cleanPlistVersion = bundleVersion.trim().replace(/-DXMT$/, '')
  const versionInFolder = folder
    .replace(/-DXMT$/, '')
    .match(/\d+\.\d+(?:\.\d+)?(?:-\d+)?/)?.[0]
  const plistLooksMangled = cleanPlistVersion.endsWith('.')
  const version =
    (!plistLooksMangled && cleanPlistVersion) ||
    versionInFolder ||
    cleanPlistVersion

  if (/latest/i.test(folder)) {
    const base = version ? `${bundle} Latest (${version})` : `${bundle} Latest`
    return `${base}${dxmtSuffix}`
  }

  if (version) return `${bundle} - ${version}${dxmtSuffix}`
  return `${bundle}${dxmtSuffix}`
}
