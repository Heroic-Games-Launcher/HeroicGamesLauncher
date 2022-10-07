import { LogPrefix, logWarning } from '../logger/logger'
import { BrowserWindow, dialog } from 'electron'

const { showErrorBox } = dialog

function showErrorBoxModalAuto(props: {
  event?: Electron.IpcMainInvokeEvent
  title: string
  error: string
}) {
  if (props.event) {
    props.event.sender.send('showErrorDialog', props.title, props.error)
  } else {
    try {
      const window =
        BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!window) {
        return
      }
      window.webContents.send('showErrorDialog', props.title, props.error)
    } catch (error) {
      logWarning(['showErrorBoxModalAuto:', error], {
        prefix: LogPrefix.Backend
      })
      showErrorBox(props.title, props.error)
    }
  }
}

export { showErrorBoxModalAuto }
