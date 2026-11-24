import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync
} from 'graceful-fs'
import { dirname, join, relative, sep } from 'path'

export const copyMissingSaveFiles = (from: string, to: string): number => {
  if (
    !from ||
    !to ||
    from === to ||
    to.startsWith(from + sep) ||
    from.startsWith(to + sep)
  ) {
    return 0
  }

  try {
    if (!statSync(from).isDirectory()) {
      return 0
    }
  } catch {
    return 0
  }

  let copied = 0
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const source = join(dir, entry.name)
      const destination = join(to, relative(from, source))
      if (entry.isDirectory()) {
        mkdirSync(destination, { recursive: true })
        walk(source)
      } else if (entry.isFile() && !existsSync(destination)) {
        mkdirSync(dirname(destination), { recursive: true })
        copyFileSync(source, destination)
        copied++
      }
    }
  }

  walk(from)
  return copied
}
