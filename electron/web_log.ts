import { BrowserWindow } from 'electron';
import { logInfo, logDebug, logError, logWarning } from './logger';

const initWebLogging = (win: BrowserWindow) => {
    win.webContents.on('console-message', (event: any, level: any, message: any, line: any, sourceId: any) => {
        const map = [logDebug, logInfo, logWarning, logError]
        map[level](message, "\non line " + line + ", source: " + sourceId)
    })
}

export default { initWebLogging }
