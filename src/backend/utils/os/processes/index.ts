import { ChildProcess, spawn } from 'child_process'

type SpawnWrapperOptions = Partial<{
  onStdout: (data: string, child: ChildProcess) => unknown
  onStderr: (data: string, child: ChildProcess) => unknown
  env: Record<string, string | undefined>
}>

interface SpawnWrapperReturn {
  stdout: string
  stderr: string
  exitCode: number | null
  signalName: string | null
}

async function genericSpawnWrapper(
  command: string,
  args: string[] = [],
  options: SpawnWrapperOptions = {}
): Promise<SpawnWrapperReturn> {
  const child = spawn(command, args, { env: options?.env })
  child.stdout.setEncoding('utf-8')
  child.stderr.setEncoding('utf-8')

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (data: string) => {
    stdout += data
    if (options.onStdout) options.onStdout(data, child)
  })
  child.stderr.on('data', (data: string) => {
    stderr += data
    if (options.onStderr) options.onStderr(data, child)
  })

  return new Promise<SpawnWrapperReturn>((resolve) => {
    child.on('close', (code, signal) =>
      resolve({
        stdout,
        stderr,
        exitCode: code,
        signalName: signal
      })
    )
  })
}

export { genericSpawnWrapper }
