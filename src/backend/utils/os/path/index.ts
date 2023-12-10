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
    // no need to check stderr or error
    // if stdout returns the first path we take this
    // if nothing is send to stdout we didn't found it
    // this avoids problems inside steam where "which" calls
    // throws alot of errors and still find the exectuable.
    // We also prevent endless waiting when stderr, stdout
    // and error are never called
    const child = spawn(findCommand, [executable])
    child.stdout.on('data', (output: Buffer | string) => {
      resolve(output.toString().trim())
    })

    // if we close and not got any data on stdout, we return null
    child.on('close', () => resolve(null))
  })
}

/**
 * Helper function; useful if you just need to know whether an executable
 * exists and don't need its path
 */
const hasExecutable = async (executable: string) =>
  searchForExecutableOnPath(executable).then((res) => res !== null)

export { searchForExecutableOnPath, hasExecutable }
