import { LogPrefix, logWarning } from 'backend/logger'
import { dialog, Notification } from 'electron'
import { ButtonOptions, DialogType } from 'common/types'
import { getMainWindow } from '../main_window'
import { sendFrontendMessage } from '../ipc'
import { isCLINoGui, isSteamDeckGameMode } from 'backend/constants/environment'

const { showErrorBox, showMessageBox } = dialog

async function showDialogBoxModalAuto(props: {
  event?: Electron.IpcMainInvokeEvent
  title: string
  message: string
  type: DialogType
  buttons?: Array<ButtonOptions>
}): Promise<number> {
  const showNativeDialog = async () => {
    const window = getMainWindow()

    switch (props.type) {
      case 'ERROR':
        showErrorBox(props.title, props.message)
        return 0
      default: {
        const result = await showMessageBox(window!, {
          title: props.title,
          message: props.message,
          buttons: props.buttons?.map((button) => button.text) || []
        })
        const button = props.buttons?.[result.response]
        if (button?.onClick) {
          button.onClick()
        }
        return result.response
      }
    }
  }

  if (isCLINoGui) {
    return showNativeDialog()
  }

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
      return showNativeDialog()
    }
  }
  return 0
}

type NotifyType = {
  title: string
  body: string
}

function notify({ body, title }: NotifyType) {
  if (Notification.isSupported() && !isSteamDeckGameMode) {
    const mainWindow = getMainWindow()
    const notify = new Notification({
      body,
      title
    })

    notify.on('click', () => mainWindow?.show())
    notify.show()
  }
}

export { showDialogBoxModalAuto, notify }
