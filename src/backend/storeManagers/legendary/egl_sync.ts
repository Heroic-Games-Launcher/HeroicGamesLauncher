export function shouldAdoptEglPrefix(options: {
  addedBySync: boolean
  eglGuid?: string
  installPath?: string
  eglPrefix: string
  currentPrefix: string
  fallbackPrefix: string
  hasExplicitPrefix: boolean
}): boolean {
  const {
    addedBySync,
    eglGuid,
    installPath,
    eglPrefix,
    currentPrefix,
    fallbackPrefix,
    hasExplicitPrefix
  } = options
  if (!eglPrefix || currentPrefix === eglPrefix) return false
  const fromEgl =
    addedBySync ||
    Boolean(eglGuid) ||
    Boolean(installPath?.startsWith(eglPrefix))
  if (!fromEgl) return false
  if (!addedBySync && (hasExplicitPrefix || currentPrefix !== fallbackPrefix)) {
    return false
  }
  return true
}
