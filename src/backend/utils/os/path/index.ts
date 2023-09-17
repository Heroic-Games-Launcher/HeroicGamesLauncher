import { spawn } from 'child_process'

const findCommand = process.platform === 'win32' ? 'where' : 'which'

/**
 * Finds an executable on %PATH%/$PATH
 * @param executable The executable to find
 * @returns The full path to the executable, or null if it was not found
 */
async function searchForExecutableOnPath(
  executable: string
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const child = spawn(findCommand, [executable])
    child.stdout.on('data', (output: Buffer | string) => {
      resolve(output.toString().trim())
    })
    // Getting any data on stderr means the executable wasn't found
    child.stderr.on('data', () => resolve(null))
    child.on('error', () => resolve(null))
  })
}

/**
 * Helper function; useful if you just need to know whether an executable
 * exists and don't need its path
 */
const hasExecutable = async (executable: string) =>
  searchForExecutableOnPath(executable).then((res) => res !== null)

export { searchForExecutableOnPath, hasExecutable }
