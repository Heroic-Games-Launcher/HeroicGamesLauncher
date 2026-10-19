/**
 * Two Wine builds often share one Info.plist version. "Latest" then looks
 * identical to the versioned build, and the selector can only store one of
 * them. The folder name is the build Heroic downloaded.
 */
export function macWineDisplayName(
  folderName: string,
  bundleName: string,
  bundleVersion: string
): string {
  const folder = folderName.replace(/\.app$/i, '')
  const bundle = bundleName.trim() || folder
  const versionInFolder = folder.match(/\d+\.\d+(?:\.\d+)?(?:-\d+)?/)?.[0]

  if (/latest/i.test(folder)) {
    const version = versionInFolder || bundleVersion
    return version ? `${bundle} Latest (${version})` : `${bundle} Latest`
  }

  if (versionInFolder) return `${bundle} ${versionInFolder}`
  if (bundleVersion) return `${bundle} - ${bundleVersion}`
  return bundle
}
