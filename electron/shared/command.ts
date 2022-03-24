import { ChildProcess, spawn } from 'child_process'
import { appendFileSync, existsSync, writeFileSync } from 'graceful-fs'
import { basename, dirname } from 'path'
import { createInterface } from 'readline'
import { PassThrough } from 'stream'
import { isWindows } from '../constants'
import { logDebug, logError, LogPrefix } from '../logger/logger'

export abstract class RunCommandCollector {
  open(): Promise<void> | void {
    // empty
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  out(line: string): Promise<void> | void {
    // empty
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  err(line: string): Promise<void> | void {
    // empty
  }

  close(): void {
    // enmpty
  }
}

export interface RunCommandOptions {
  cwd?: string
  env?: { [key: string]: string }
  collectors?: RunCommandCollector[]
}

export interface RunCommandResults {
  success: boolean
  error?: string
  command: string
  process: ChildProcess
}

function quoteArgument(argument: string): string {
  if (argument.includes(' ')) {
    return JSON.stringify(argument)
  } else {
    return argument
  }
}

export class RunCommand {
  private processes: ChildProcess[] = []

  constructor(private name: string, private logPrefix: LogPrefix) {}

  getCommand(executable: string, args: string[], env?: Record<string, string>) {
    const parts = args.filter((val) => {
      return val && !val.startsWith('--token')
    })
    const variables = []
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        variables.push(`${key}=${quoteArgument(value)}`)
      }
    }
    return [...variables, executable, ...parts].map(quoteArgument).join(' ')
  }

  run(
    executable: string,
    args: string[],
    options: RunCommandOptions
  ): Promise<RunCommandResults> {
    const filteredArgs = args.filter((n) => n)
    const command = this.getCommand(executable, args, options.env)

    logDebug([`Running ${this.name} command:`, command], this.logPrefix)

    let bin = basename(executable)
    if (!isWindows) {
      bin = './' + bin
    }
    const dir = dirname(executable)

    const collectors = options.collectors || []
    collectors.push(new DebugCollector())

    return (async () => {
      for (const collector of collectors) {
        await collector.open()
      }

      return new Promise<RunCommandResults>((res) => {
        const spawnOptions = {
          cwd: options.cwd ? options.cwd : dir,
          env: options.env ? { ...process.env, ...options.env } : undefined
        }
        const child = spawn(bin, filteredArgs, spawnOptions)
        this.processes = [...this.processes, child]

        if (collectors.length !== 0) {
          const stdinPass = new PassThrough()
          const stdoutPass = new PassThrough()
          const stderrPass = new PassThrough()

          const stdout = createInterface({
            input: stdoutPass,
            output: stdinPass
          })
          const stderr = createInterface({
            input: stderrPass,
            output: stdinPass
          })
          stdout.on('line', async (line) => {
            for (const collector of collectors) {
              await collector.out(line)
            }
          })
          stderr.on('line', async (line) => {
            for (const collector of collectors) {
              await collector.err(line)
            }
          })
          child.stdout.on('data', (buffer) => {
            stdoutPass.write(buffer)
          })
          child.stderr.on('data', (buffer) => {
            stderrPass.write(buffer)
          })
        }
        child.on('close', () => {
          res({
            success: true,
            command,
            process: child
          })
        })
        child.on('error', (error) => {
          logError(
            [`Error running ${this.name} command "${command}": ${error}`],
            this.logPrefix
          )
          res({
            success: false,
            error: 'message' in error ? error.message : `${error}`,
            command,
            process: child
          })
        })
      }).then((result) => {
        // try to kill process just in case...
        this.kill(result.process)
        return result
      })
    })()
  }

  killAll(): void {
    for (const process of this.processes) {
      if (!process.killed) {
        this.doKill(process)
      }
    }
  }

  private kill(process: ChildProcess): void {
    this.processes = this.processes.filter((p) => p === process)
    if (!process.killed) {
      this.doKill(process)
    }
  }

  private doKill(process: ChildProcess): void {
    setTimeout(() => {
      try {
        process.kill()
      } catch (e) {
        // empty
      }
    })
  }
}

export class DebugCollector extends RunCommandCollector {
  override err(line: string): Promise<void> | void {
    console.debug('\x1b[31m(stderr)\x1b[0m', line)
  }

  override out(line: string): Promise<void> | void {
    console.debug('\x1b[32m(stdout)\x1b[0m', line)
  }
}

export class BufferCollector extends RunCommandCollector {
  private _stdout = ''
  private _stderr = ''

  override err(line: string): void {
    this._stderr += line + '\n'
  }

  override out(line: string): void {
    this._stdout += line + '\n'
  }

  get stdout() {
    return this._stdout
  }

  get stderr() {
    return this._stderr
  }
}

export class AppendToFileCollector extends RunCommandCollector {
  constructor(private filePath: string, private logPrefix: LogPrefix) {
    super()
  }

  override open() {
    if (this.filePath) {
      logDebug(['Logging to file', `"${this.filePath}"`], this.logPrefix)
    }
    if (existsSync(this.filePath)) {
      writeFileSync(this.filePath, '')
    }
  }

  override out(line: string) {
    appendFileSync(this.filePath, line + '\n')
  }

  override err(line: string) {
    appendFileSync(this.filePath, line + '\n')
  }
}

export class RunCommandExecutor {
  constructor(
    private executable: string,
    private args: string[],
    private command: RunCommand
  ) {}

  run(args: string[], options: RunCommandOptions) {
    const buffer = new BufferCollector()
    const collectors: RunCommandCollector[] = options.collectors
      ? [...options.collectors, buffer]
      : [buffer]

    return this.command
      .run(this.executable, [...this.args, ...args], {
        ...options,
        collectors
      })
      .then((result) => ({
        ...result,
        stdout: buffer.stdout,
        stderr: buffer.stderr
      }))
  }

  getCommand(args: string[]) {
    return this.command.getCommand(this.executable, [...this.args, ...args])
  }

  killAll() {
    return this.command.killAll()
  }
}
