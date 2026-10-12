import { GameSettings } from 'common/types'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Returns the folder Wine itself uses as the prefix (where `drive_c` and the
 * `.reg` files live), so paths inside it can be built without starting Wine
 * @returns null if the location can't be derived (CrossOver bottles are
 * addressed by name, not by path)
 */
export function getWinePrefixRoot({
  winePrefix,
  wineVersion
}: Pick<GameSettings, 'winePrefix' | 'wineVersion'>): string | null {
  switch (wineVersion.type) {
    case 'proton':
      return join(winePrefix, 'pfx')
    case 'wine':
    case 'toolkit':
      return winePrefix
    default:
      return null
  }
}

/**
 * Escapes a string the way Wine writes it into a `.reg` file
 */
function escapeRegString(str: string): string {
  return str.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

/**
 * Checks whether a prefix registry file already holds a string value.
 *
 * Wine only saves its registry to disk when the wineserver shuts down, so a
 * `false` here means "not known to be set", never "definitely not set":
 * callers should write the value in that case
 * @param registryFile Path to the `.reg` file (`system.reg` for HKLM)
 * @param key Key path relative to the hive, e.g. `Software\\GOG.com`
 * @param name Name of the value
 * @param data The string the value should hold
 */
export async function isRegistryStringSet(
  registryFile: string,
  key: string,
  name: string,
  data: string
): Promise<boolean> {
  let contents: string
  try {
    contents = await readFile(registryFile, 'utf-8')
  } catch {
    return false
  }

  // Wine writes each key as a `[Key\\Path] <timestamp>` header line followed
  // by its values, one `"name"="data"` per line, until the next header.
  // Key and value names are case-insensitive (Wine stores
  // `SOFTWARE\WOW6432Node` as `Software\Wow6432Node`), data is not
  const header = `[${escapeRegString(key)}]`.toLowerCase()
  const namePart = `"${escapeRegString(name)}"=`.toLowerCase()
  const dataPart = `"${escapeRegString(data)}"`

  let inKey = false
  for (const line of contents.split('\n')) {
    if (line.startsWith('[')) {
      inKey = line.toLowerCase().startsWith(header)
      continue
    }
    if (
      inKey &&
      line.toLowerCase().startsWith(namePart) &&
      line.slice(namePart.length).trimEnd() === dataPart
    ) {
      return true
    }
  }
  return false
}
