// TODO: Expand this back to what our pre-component Logger could do
type LogMessageType = string
type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
type LogOptions = Partial<{
  componentName: string
  file: string
  // TODO: Re-add 'showDialog', 'skipLogToFile' and 'forceLog' options
}>

export type { LogMessageType, LogLevel, LogOptions }
