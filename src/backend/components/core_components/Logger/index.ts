import { Component } from '../../component'

import type { LogLevel, LogMessageType, LogOptions } from './types'

declare module 'backend/components/registry/types' {
  interface ComponentEvents {
    'logger:logDebug': (message: LogMessageType[], options?: LogOptions) => void
    'logger:logInfo': (message: LogMessageType[], options?: LogOptions) => void
    'logger:logWarning': (
      message: LogMessageType[],
      options?: LogOptions
    ) => void
    'logger:logError': (message: LogMessageType[], options?: LogOptions) => void
    'logger:logCritical': (
      message: LogMessageType[],
      options?: LogOptions
    ) => void
  }
}

export default class LoggerComponent extends Component {
  name = 'Logger'

  private readonly longestLogLevelStrLength = ('CRITICAL' satisfies LogLevel)
    .length
  private readonly timeFormatter = new Intl.DateTimeFormat('en', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  async init() {
    await Promise.all([
      this.addEventListener('logger:logDebug', (message, options) =>
        this.logBase('DEBUG', message, options)
      ),
      this.addEventListener('logger:logInfo', (message, options) =>
        this.logBase('INFO', message, options)
      ),
      this.addEventListener('logger:logWarning', (message, options) =>
        this.logBase('WARNING', message, options)
      ),
      this.addEventListener('logger:logError', (message, options) =>
        this.logBase('ERROR', message, options)
      ),
      this.addEventListener('logger:logCritical', (message, options) =>
        this.logBase('CRITICAL', message, options)
      )
    ])
  }

  private async logBase(
    severity: LogLevel,
    message: LogMessageType[],
    options?: LogOptions
  ) {
    // FIXME: Honor the `disableLogs` setting

    const formattedTime = this.timeFormatter.format(new Date())
    const formattedLevel = `${severity}:`.padEnd(
      this.longestLogLevelStrLength + 1
    )
    const formattedComponent = `[${
      options?.componentName || 'Unknown'
    }]:`.padEnd(24)
    const formattedMessage = this.logMessageToString(message)
    const fullMessage = `(${formattedTime}) ${formattedLevel} ${formattedComponent} ${formattedMessage}`

    const logfile = await this.invokeExclusiveProducer(
      'logFileWriter:getAndPrepareLogFile',
      options?.file ?? 'heroic'
    )
    await logfile.logMessage(fullMessage)
  }

  private logMessageToString(message: LogMessageType[]): string {
    return message.join(', ')
  }
}
