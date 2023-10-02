import { readFile, stat } from 'fs/promises'

/**
 * Strips specifically double quotes ("") from the start and end of a string
 */
function stripQuotes(stringMaybeWithQuotes: string): string {
  if (
    stringMaybeWithQuotes.startsWith('"') &&
    stringMaybeWithQuotes.endsWith('"')
  )
    return stringMaybeWithQuotes.slice(1, -1)
  return stringMaybeWithQuotes
}

async function osInfo_linux(): Promise<{ name: string; version?: string }> {
  let os_release_path: string | null = null
  for (const potPath of ['/run/host/os-release', '/etc/os-release']) {
    try {
      await stat(potPath)
      os_release_path = potPath
      break
    } catch {
      // We want to ignore errors here, since we're searching for a file that may not exist
    }
  }
  if (!os_release_path) return { name: 'Unknown Linux Distribution' }

  const os_release_contents = await readFile(os_release_path, 'utf-8')

  // see https://www.freedesktop.org/software/systemd/man/os-release.html
  const nameMatch = os_release_contents.match(/^NAME=(.*)/m)?.[1]
  const prettyNameMatch = os_release_contents.match(/^PRETTY_NAME=(.*)/m)?.[1]
  const versionMatch = os_release_contents.match(/^VERSION=(.*)/m)?.[1]
  const versionId = os_release_contents.match(/^VERSION_ID=(.*)/m)?.[1]
  const versionCodename = os_release_contents.match(
    /^VERSION_CODENAME=(.*)/m
  )?.[1]

  // The spec isn't clear on whether some of these fields can or should include
  // quotes, so we just accept everything and strip them out if they're there
  const osName = nameMatch
    ? stripQuotes(nameMatch)
    : prettyNameMatch
    ? stripQuotes(prettyNameMatch)
    : 'Linux'
  const osVersion = versionMatch
    ? stripQuotes(versionMatch)
    : versionId && versionCodename
    ? `${versionId} ${versionCodename}`
    : undefined
  if (osVersion) return { name: osName, version: osVersion }
  return { name: osName }
}

export { osInfo_linux }
