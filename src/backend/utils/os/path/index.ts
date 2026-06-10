import { join } from 'path'
import { stat } from 'fs/promises'

const separator = process.platform === 'win32' ? ';' : ':'

/**
 * Finds an executable on %PATH%/$PATH
 * @param executable The executable to find
 * @returns The full path to the executable, or null if it was not found
 */
async function searchForExecutableOnPath(
  executable: string
): Promise<string | null> {
  const pathVar = process.env['PATH'] ?? ''
  for (const path of pathVar.split(separator)) {
    const execPath = join(path, executable)
    const stats = await stat(execPath).catch(() => null)
    if (stats) return execPath
  }
  return null
}

/**
 * Helper function; useful if you just need to know whether an executable
 * exists and don't need its path
 */
const hasExecutable = async (executable: string) =>
  searchForExecutableOnPath(executable).then((res) => res !== null)

export { searchForExecutableOnPath, hasExecutable }
