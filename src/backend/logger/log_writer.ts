import { existsSync, renameSync } from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'

import { LogLevel, LogPrefix } from './constants'
import { formatLogMessage } from './formatter'

import type { LogOptions } from './types'

import { getLogFilePath, logDebug } from './index'

const LOG_LEVEL_LOGGING_FUNC: Record<LogLevel, (message: string) => unknown> = {
  DEBUG: console.log,
  INFO: console.log,
  WARNING: console.warn,
  ERROR: console.error
}

const MAX_LOG_FILE_BYTES = 50 * 1024 * 1024

export default class LogWriter {
  /** The log file path the writer should write into */
  public readonly logFilePath: string
  /** Whether the writer should also output to `console.log`/`.warn`/`.error` */
  readonly #outputToOsStreams: boolean
  /**
   * Whether logs are disabled. If they are, calls to {@link logBase} that don't
   * have the {@link LogOptions#forceLog} option set aren't logged
   */
  readonly #logsDisabled: boolean

  /** Maximum size in bytes before rotating the active log file to `.old` */
  readonly #maxFileBytes: number

  readonly #isGeneralLog: boolean

  /**
   * Whether the log file was already written to by this writer. Used to rotate
   * log files
   */
  #wasWrittenTo: boolean
  /** Whether the log file was closed by calling {@link close} */
  #isClosed: boolean
  /** Number of bytes written to the current log file since creation/rotation */
  #bytesWritten: number
  /** Last non-empty line written, used to collapse consecutive duplicate lines */
  #lastLine: string | null
  /** Number of consecutive times {@link #lastLine} was repeated */
  #repeatCount: number
  /**
   * A {@link Promise} the writer waits for before writing new messages to the
   * file. This is used in case a Promise is passed to {@link writeString}
   */
  #messageWaitPromise: Promise<unknown>

  public constructor(
    logFilePath: string,
    outputToOsStreams: boolean,
    logsDisabled: boolean,
    maxFileBytes: number = MAX_LOG_FILE_BYTES
  ) {
    this.logFilePath = logFilePath
    this.#outputToOsStreams = outputToOsStreams
    this.#logsDisabled = logsDisabled
    this.#maxFileBytes = maxFileBytes
    this.#isGeneralLog = logFilePath === getLogFilePath({})
    this.#wasWrittenTo = false
    this.#isClosed = false
    this.#bytesWritten = 0
    this.#lastLine = null
    this.#repeatCount = 0
    this.#messageWaitPromise = Promise.resolve()
  }

  public get oldLogFilePath(): string {
    return this.logFilePath + '.old'
  }

  /**
   * Renames {@link logFilePath} to {@link oldLogFilePath} if it exists. If
   * {@link oldLogFilePath} already exists, it is overwritten
   */
  #archiveOldLogFile() {
    // NOTE: This function needs to be synchronous since, in practice, most
    //       LogWriter users don't `await` the `logXXX` calls. If this function
    //       would be async, Having two calls happen in quick succession will
    //       make them both try to archive the log file, which doesn't go well
    const haveToArchive = existsSync(this.logFilePath)
    if (!haveToArchive) return
    return renameSync(this.logFilePath, this.oldLogFilePath)
  }

  #collapseRepeatedLines(message: string): string {
    const normalized = message.endsWith('\n') ? message.slice(0, -1) : message
    const lines = normalized.split('\n')
    const outputLines: string[] = []

    for (const line of lines) {
      if (line.trim().length > 0 && line === this.#lastLine) {
        this.#repeatCount += 1
        continue
      }

      if (this.#repeatCount > 0) {
        const times = this.#repeatCount === 1 ? 'time' : 'times'
        outputLines.push(`[Last line repeated ${this.#repeatCount} ${times}]`)
        this.#repeatCount = 0
      }

      this.#lastLine = line.trim().length > 0 ? line : null
      outputLines.push(line)
    }

    if (!outputLines.length) return ''
    return `${outputLines.join('\n')}\n`
  }

  /**
   * Writes a string to the log file, waiting for any previous messages in the
   * queue to be written first
   */
  async writeString(
    message: string | Promise<string>,
    forceLog: boolean = false
  ): Promise<void> {
    if (this.#isClosed)
      throw new Error(
        `Attempted to write to log file "${this.logFilePath}" after it was closed`
      )

    if (this.#logsDisabled && !forceLog) {
      return
    }

    if (!this.#wasWrittenTo) {
      this.#wasWrittenTo = true
      this.#archiveOldLogFile()

      // print this message only once when a new log file is created and it's not the general log
      if (!this.#isGeneralLog)
        logDebug(`Logging to file(s) ${this.logFilePath}`, LogPrefix.Backend)
      const dirname = path.dirname(this.logFilePath)
      this.#messageWaitPromise = this.#messageWaitPromise.then(() =>
        fsPromises.mkdir(dirname, { recursive: true })
      )
    }

    const writePromise = this.#messageWaitPromise.then(async () => {
      const resolvedMessage = await message
      if (!resolvedMessage.trim().length) return

      const output = this.#collapseRepeatedLines(resolvedMessage)
      if (!output.length) return

      const messageBytes = Buffer.byteLength(output, 'utf-8')
      if (
        this.#bytesWritten > 0 &&
        this.#bytesWritten + messageBytes > this.#maxFileBytes
      ) {
        this.#archiveOldLogFile()
        this.#bytesWritten = 0
      }

      await fsPromises.appendFile(this.logFilePath, output, 'utf-8')
      this.#bytesWritten += messageBytes
    })

    this.#messageWaitPromise = writePromise.catch(() => {})
    await writePromise
  }

  /**
   * Formats a log message and logs it to {@link logFilePath} and, if enabled,
   * the console
   */
  private async logBase(
    message: unknown,
    level: LogLevel,
    options_or_prefix?: LogOptions
  ): Promise<void> {
    let options: LogOptions
    if (typeof options_or_prefix === 'string') {
      options = { prefix: options_or_prefix }
    } else {
      options = options_or_prefix ?? {}
    }

    const messageStrPromise = formatLogMessage(
      message,
      level,
      options.prefix ?? LogPrefix.General
    )

    const fileWritePromise = this.writeString(
      messageStrPromise,
      options.forceLog
    )
    const consoleLogWritePromise = this.#outputToOsStreams
      ? messageStrPromise.then(LOG_LEVEL_LOGGING_FUNC[level])
      : Promise.resolve()
    await Promise.all([fileWritePromise, consoleLogWritePromise])
  }

  public logDebug(message: unknown, options?: LogOptions) {
    return this.logBase(message, 'DEBUG', options)
  }

  public logInfo(message: unknown, options?: LogOptions) {
    return this.logBase(message, 'INFO', options)
  }

  public logWarning(message: unknown, options?: LogOptions) {
    return this.logBase(message, 'WARNING', options)
  }

  public logError(message: unknown, options?: LogOptions) {
    return this.logBase(message, 'ERROR', options)
  }

  /**
   * Writes a final message to the log file before closing it. Any future calls
   * of {@link writeString} will throw an Error
   */
  public async close() {
    await this.writeString('============= End of log =============')
    this.#isClosed = true
  }
}
