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
    let window: BrowserWindow | null
    try {
      window = BrowserWindow.getFocusedWindow()
      if (!window) {
        window = BrowserWindow.getAllWindows()[0]
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
