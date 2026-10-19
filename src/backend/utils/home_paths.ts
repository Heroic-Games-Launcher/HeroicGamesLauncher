/**
 * After a macOS account rename, config files still contain `/Users/oldname`.
 * Rewrite those when that home directory is gone. Leave other users' homes,
 * and anything outside `/Users`, alone.
 */
export function rewriteRetiredUserPaths(
  value: unknown,
  currentHome: string,
  homeExists: (path: string) => boolean
): { value: unknown; changed: boolean } {
  if (typeof value === 'string') {
    const match = /^\/Users\/([^/]+)(\/.*)?$/.exec(value)
    if (!match) return { value, changed: false }
    const oldHome = `/Users/${match[1]}`
    if (oldHome === currentHome || homeExists(oldHome)) {
      return { value, changed: false }
    }
    return { value: currentHome + (match[2] ?? ''), changed: true }
  }

  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const result = rewriteRetiredUserPaths(item, currentHome, homeExists)
      changed = changed || result.changed
      return result.value
    })
    return { value: changed ? next : value, changed }
  }

  if (value && typeof value === 'object') {
    let changed = false
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      const result = rewriteRetiredUserPaths(item, currentHome, homeExists)
      changed = changed || result.changed
      next[key] = result.value
    }
    return { value: changed ? next : value, changed }
  }

  return { value, changed: false }
}
