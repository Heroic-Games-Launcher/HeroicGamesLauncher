import {
  createLogger,
  format
} from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
// Need real-world data on how big these logs realistically get so the maxsize of them aren't just guesses (right they are)
const heroicCrashes = new DailyRotateFile({
  datePattern: 'YYYY-MM-DD',
  dirname: './logs/heroic',
  filename: 'crashes-%DATE%.log',
  maxFiles: '2d',
  maxSize: '2m'
})
const heroicDebug = new DailyRotateFile({
  datePattern: 'YYYY-MM-DD',
  dirname: './logs/heroic',
  filename: 'debug-%DATE%.log',
  level: 'debug',
  maxFiles: '1d',
  maxSize: '10m'
})
const heroicErrors = new DailyRotateFile({
  datePattern: 'YYYY-MM-DD',
  dirname: './logs/heroic',
  filename: 'errors-%DATE%.log',
  level: 'warn',
  maxFiles: '5d',
  maxSize: '3m'
})
const heroicInfo = new DailyRotateFile({
  datePattern: 'YYYY-MM-DD',
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
