import { createLogger, format, transports }from 'winston'

const Logger = createLogger({
  exceptionHandlers: [
    new transports.File({ filename: 'logs/heroic-crashes.log' })
  ],
  exitOnError: false,
  format: format.combine(
    format.timestamp({
      format: 'DD-MM-YYYY HH:mm:ss:SS:Z'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  level: 'info',
  transports: [
    new transports.File({ filename: 'logs/heroic-errors.log', level: 'warn' }),
    new transports.File({ filename: 'logs/heroic-info.log', level: 'info' }),
    new transports.File({ filename: 'logs/heroic-debugging.log', level: 'debug' })
  ]
})

export {
  Logger
}
