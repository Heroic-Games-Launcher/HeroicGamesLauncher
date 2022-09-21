import { ipcMain } from 'electron'
import { showErrorBoxModalAuto } from './dialog'

ipcMain.handle(
  'showErrorBox',
  async (event, args: [title: string, error: string]) => {
    const [title, error] = args
    return showErrorBoxModalAuto({ event, title, error })
  }
)
