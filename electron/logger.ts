import {
  createLogger,
  format
} from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const heroicCrashes = new DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  dirname: './logs/heroic',
  filename: 'crashes-%DATE%.log',
  maxFiles: '2d',
  maxSize: '2m'
})
const heroicDebug = new DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  dirname: './logs/heroic',
  filename: 'debug-%DATE%.log',
  level: 'debug',
  maxFiles: '1d',
  maxSize: '10m'
})
const heroicErrors = new DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  dirname: './logs/heroic',
  filename: 'errors-%DATE%.log',
  level: 'warn',
  maxFiles: '5d',
  maxSize: '3m'
})
const heroicInfo = new DailyRotateFile({
  datePattern: 'DD-MM-YYYY',
  dirname: './logs/heroic',
  filename: 'info-%DATE%.log',
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
