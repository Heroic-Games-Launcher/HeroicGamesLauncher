import { join } from 'path'

/** Package-manager bins a Finder-launched app does not inherit. */
export const MAC_PACKAGE_BIN_DIRS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/opt/local/bin'
]

export function withMacToolPath(current: string | undefined): string {
  return [...MAC_PACKAGE_BIN_DIRS, current].filter(Boolean).join(':')
}

export function findCommand(
  names: string[],
  directories: string[],
  exists: (path: string) => boolean
): string | undefined {
  for (const directory of directories) {
    for (const name of names) {
      const path = join(directory, name)
      if (exists(path)) return path
    }
  }
  return undefined
}
