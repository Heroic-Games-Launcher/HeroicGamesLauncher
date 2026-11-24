import { existsSync, readdirSync } from 'graceful-fs'
import { isAbsolute, join, posix } from 'path'

const getUserDirs = (winePrefix: string) => [
  join(winePrefix, 'drive_c', 'users'),
  join(winePrefix, 'pfx', 'drive_c', 'users')
]

export const findPrefixUserDir = (winePrefix: string): string | undefined => {
  for (const usersDir of getUserDirs(winePrefix)) {
    if (!existsSync(usersDir)) continue

    const users = readdirSync(usersDir).filter(
      (user) => user.toLowerCase() !== 'public'
    )
    const user = users.find((name) => name === 'steamuser') ?? users[0]
    if (user) {
      return join(usersDir, user)
    }
  }

  return undefined
}

const WINDOWS_VARIABLES: Record<string, (userDir: string) => string> = {
  userprofile: (userDir) => userDir,
  localappdata: (userDir) => join(userDir, 'AppData', 'Local'),
  appdata: (userDir) => join(userDir, 'AppData', 'Roaming')
}

export const resolveWindowsPathInPrefix = (
  windowsPath: string,
  winePrefix: string
): string | undefined => {
  const userDir = findPrefixUserDir(winePrefix)
  if (!userDir) {
    return undefined
  }

  let resolved = windowsPath
  for (const [variable, value] of Object.entries(WINDOWS_VARIABLES)) {
    resolved = resolved.replace(
      new RegExp(`%${variable}%`, 'gi'),
      value(userDir)
    )
  }

  if (/%[^%]+%/.test(resolved) || resolved.includes('<?')) {
    return undefined
  }

  const normalized = posix.normalize(resolved.replaceAll('\\', '/'))
  return isAbsolute(normalized) ? normalized : undefined
}
