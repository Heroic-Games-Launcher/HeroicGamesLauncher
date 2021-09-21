import { BrowserWindow } from 'electron';
import { logInfo, logDebug, logError, logWarning } from './logger';

const initWebLogging = (win: BrowserWindow) => {
  win.webContents.on('console-message', (event: unknown, level: number, message: string, line: number | string, sourceId: string) => {
    const map = [logDebug, logInfo, logWarning, logError]
    map[level](message, '\non line ' + line + ', source: ' + sourceId)
  })
}

export default initWebLogging
