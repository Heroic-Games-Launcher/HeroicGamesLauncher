import { spawn } from 'child_process'
import { constants } from 'fs'
import { access } from 'fs/promises'

const isWindows = process.platform === 'win32'
const findCommands = isWindows
  ? [
      'C\\Windows\\System32\\where.exe',
      // fall back to PATH lookup; may be missing inside Electron sandboxes
      'where'
    ]
  : ['which']
const commonWindowsShellPaths = [
  'C\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  'C\\Windows\\System32\\powershell.exe',
  'C\\Program Files\\PowerShell\\7\\pwsh.exe',
  'C\\Program Files\\PowerShell\\7\\powershell.exe'
]
const windowsShellCandidates: Record<string, string[]> = {
  powershell: commonWindowsShellPaths,
  pwsh: commonWindowsShellPaths
}
const finderCache = new Map<string, string | null>()

async function pathExists(candidate: string) {
  try {
    await access(candidate, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function runFinder(
  cmd: string,
  executable: string
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const child = spawn(cmd, [executable], {
      shell: isWindows,
      windowsHide: true,
      env: { ...process.env }
    })

    let settled = false
    const finish = (value: string | null) => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }

    child.stdout.on('data', (output: Buffer | string) => {
      const first = output.toString().split(/\r?\n/)[0]?.trim()
      if (first) finish(first)
    })

    child.on('error', () => finish(null))
    child.on('close', () => finish(null))
  })
}

/**
 * Finds an executable on %PATH%/$PATH
 * @param executable The executable to find
 * @returns The full path to the executable, or null if it was not found
 */
async function searchForExecutableOnPath(
  executable: string
): Promise<string | null> {
  const cacheKey = executable.toLowerCase()
  if (finderCache.has(cacheKey)) return finderCache.get(cacheKey) ?? null

  // Special-case PowerShell so we never depend on PATH for it
  if (isWindows && windowsShellCandidates[cacheKey]) {
    for (const candidate of windowsShellCandidates[cacheKey]) {
      // stop at the first existing path
      /* istanbul ignore next -- platform-specific */
      if (await pathExists(candidate)) {
        finderCache.set(cacheKey, candidate)
        return candidate
      }
    }
  }

  for (const cmd of findCommands) {
    const found = await runFinder(cmd, executable)
    if (found) {
      finderCache.set(cacheKey, found)
      return found
    }
  }

  finderCache.set(cacheKey, null)
  return null
}

/**
 * Helper function; useful if you just need to know whether an executable
 * exists and don't need its path
 */
const hasExecutable = async (executable: string) =>
  searchForExecutableOnPath(executable).then((res) => res !== null)

export { searchForExecutableOnPath, hasExecutable }
