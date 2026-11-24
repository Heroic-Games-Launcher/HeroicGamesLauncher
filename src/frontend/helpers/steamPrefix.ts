/** Steam compatdata folder for an install. */
export function steamCompatdataPrefix(
  installPath?: string,
  appId?: string
): string {
  if (!installPath || !appId) return ''
  const normalized = installPath.replaceAll('\\', '/')
  const marker = '/steamapps/common/'
  const at = normalized.lastIndexOf(marker)
  if (at === -1) return ''
  return `${normalized.slice(0, at)}/steamapps/compatdata/${appId}`
}
