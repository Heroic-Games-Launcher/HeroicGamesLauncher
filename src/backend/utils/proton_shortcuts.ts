import { logError } from 'backend/logger'
import {
  DesktopEntry,
  ParsedProtonShorctut
} from 'common/types/proton_shorctuts'
import { readdir, readFile, stat } from 'fs/promises'
import { parse as iniParse } from 'ini'
import { join } from 'path'

export async function loadProtonShortcutsEntries(
  winePrefixPath: string
): Promise<ParsedProtonShorctut[]> {
  const protonShortcutsPath = join(
    winePrefixPath,
    'pfx/drive_c/proton_shortcuts'
  )
  const shortcuts: ParsedProtonShorctut[] = []
  try {
    const dir = await readdir(protonShortcutsPath, { encoding: 'utf-8' })
    const files = dir.filter((f) => f.endsWith('.desktop'))
    for (const file of files) {
      const contents = await readFile(join(protonShortcutsPath, file), {
        encoding: 'utf-8'
      })
      const desktopFile = iniParse(contents)
      const desktopEntry = desktopFile['Desktop Entry'] as DesktopEntry

      if (
        desktopEntry.Path &&
        !(await stat(desktopEntry.Path).catch(() => false))
      )
        continue

      const execPath = desktopEntry.Exec.replace(/\\(.)/g, '$1')
      shortcuts.push({
        name: desktopEntry.Name,
        executable: execPath
      })
    }
  } catch (err) {
    logError(['Failed to parse proton shortcuts', err])
    return []
  }

  return shortcuts
}
