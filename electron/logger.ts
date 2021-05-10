import {
  createLogger,
  format,
  transports
} from 'winston'
import('winston-daily-rotate-file')

const heroicCrashes = new transports.DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  filename: 'logs/heroic/crashes-%DATE%.log',
  maxFiles: '2d',
  maxSize: '2m'
})
const heroicDebug = new transports.DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  filename: 'logs/heroic/debug-%DATE%.log',
  level: 'debug',
  maxFiles: '1d',
  maxSize: '10m'
})
const heroicErrors = new transports.DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  filename: 'logs/heroic/errors-%DATE%.log',
  level: 'warn',
  maxFiles: '5d',
  maxSize: '3m'
})
const heroicInfo = new transports.DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  filename: 'logs/heroic/info-%DATE%.log',
  level: 'info',
  maxFiles: '2d',
  maxSize: '5m'
})

const Logger = createLogger({
  exceptionHandlers: [
    heroicCrashes
  ],
  exitOnError: false,
  format: format.combine(
    format.timestamp({
      format: 'HH:mm:ss:SS:Z'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  level: 'info',
  transports: [
    heroicErrors,
    heroicInfo,
    heroicDebug
  ]
})

export {
  Logger
}
