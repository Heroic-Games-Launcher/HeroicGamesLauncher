import { LogPrefix, logWarning } from '../logger/logger'
import { dialog } from 'electron'
import { ButtonOptions, DialogType } from 'common/types'
import { getMainWindow, sendFrontendMessage } from '../main_window'

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
      sendFrontendMessage(
        'showDialog',
        props.title,
        props.message,
        props.type,
        props.buttons
      )
    } catch (error) {
      logWarning(['showDialogBoxModalAuto:', error], LogPrefix.Backend)

      const window = getMainWindow()

      switch (props.type) {
        case 'ERROR':
          showErrorBox(props.title, props.message)
          break
        default:
          if (!window) {
            break
          }
          showMessageBox(window, {
            title: props.title,
            message: props.message
          })
          break
      }
    }
  }
}

export { showDialogBoxModalAuto }
