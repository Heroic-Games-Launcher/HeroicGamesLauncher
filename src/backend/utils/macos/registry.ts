import { readFile } from 'fs/promises'
import { join } from 'path'

interface RegistryString {
  hive: 'HKCU' | 'HKLM'
  /** Key path below the hive, e.g. `Software\Wine\Mac Driver` */
  key: string
  name: string
  data: string
}

function unescapeRegString(value: string): string {
  return value.replace(/\\(.)/g, '$1')
}

/**
 * Reads a string value from the text of a Wine registry file (`user.reg` or
 * `system.reg`). Key paths are relative to the file's hive and matched
 * case-insensitively, like Windows does
 */
export function readRegistryString(
  regFile: string,
  key: string,
  name: string
): string | undefined {
  const wantedKey = key.toLowerCase()
  const wantedName = name.toLowerCase()
  let inKey = false

  for (const line of regFile.split(/\r?\n/)) {
    if (line.startsWith('[')) {
      const header = line.match(/^\[(.*)\](?:\s+\d+)?\s*$/)
      inKey =
        !!header && unescapeRegString(header[1]).toLowerCase() === wantedKey
      continue
    }
    if (!inKey) continue

    const value = line.match(/^"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"\s*$/)
    if (value && unescapeRegString(value[1]).toLowerCase() === wantedName) {
      return unescapeRegString(value[2])
    }
  }
  return undefined
}

async function readHive(prefix: string, hive: RegistryString['hive']) {
  const file = hive === 'HKCU' ? 'user.reg' : 'system.reg'
  return readFile(join(prefix, file), 'utf-8').catch(() => '')
}

/**
 * Makes sure the given string values are set in a prefix. The registry files
 * are only read: writes go through `reg add` inside the prefix, because a
 * running wineserver would overwrite direct edits of the files when it exits.
 * `runReg` is only called for values that actually need to change.
 *
 * @param defaults Values Wine assumes when a value is absent, so setting them is a no-op
 * @returns The values that were changed
 */
export async function ensureRegistryStrings(
  prefix: string,
  values: RegistryString[],
  runReg: (args: string[]) => Promise<void>,
  defaults: Partial<Record<string, string>> = {}
): Promise<RegistryString[]> {
  const hives: Partial<Record<RegistryString['hive'], string>> = {}
  const changed: RegistryString[] = []

  for (const value of values) {
    hives[value.hive] ??= await readHive(prefix, value.hive)
    const current =
      readRegistryString(hives[value.hive]!, value.key, value.name) ??
      defaults[`${value.key}\\${value.name}`]
    if (current === value.data) continue

    await runReg([
      'reg',
      'add',
      `${value.hive}\\${value.key}`,
      '/v',
      value.name,
      '/t',
      'REG_SZ',
      '/d',
      value.data,
      '/f'
    ])
    changed.push(value)
  }
  return changed
}
