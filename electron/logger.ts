import { createLogger, format, transports }from 'winston'

const Logger = createLogger({
  //defaultMeta: { service: 'heroic-main' },
  exceptionHandlers: [
    new transports.File({ filename: 'logs/heroic-issues.log' })
  ],
  exitOnError: false,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  level: 'info',
  transports: [
    new transports.File({ filename: 'logs/heroic-issues.log', level: 'warn' }),
    new transports.File({ filename: 'logs/heroic-info.log', level: 'info' }),
    new transports.File({ filename: 'logs/heroic-debugging.log', level: 'debug' })
  ]
})

export {
  Logger
}
