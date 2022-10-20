import { LogPrefix, logWarning } from '../logger/logger'
import { BrowserWindow, dialog } from 'electron'
import { ButtonOptions, DialogType } from 'common/types'

const { showErrorBox, showMessageBox } = dialog

function showDialogBoxModalAuto(props: {
  event?: Electron.IpcMainInvokeEvent
  title: string
  message: string
  type: DialogType
  buttons?: Array<ButtonOptions>
}) {
  if (props.event) {
    props.event.sender.send(
      'showDialog',
      props.title,
      props.message,
      props.type,
      props.buttons
    )
  } else {
    try {
      const window =
        BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (!window) {
        return
      }
      window.webContents.send(
        'showDialog',
        props.title,
        props.message,
        props.type,
        props.buttons
      )
    } catch (error) {
      logWarning(['showDialogBoxModalAuto:', error], {
        prefix: LogPrefix.Backend
      })
      switch (props.type) {
        case 'ERROR':
          showErrorBox(props.title, props.message)
          break
        default:
          showMessageBox({
            title: props.title,
            message: props.message
          })
          break
      }
    }
  }
}

export { showDialogBoxModalAuto }
