import { BottlesType } from 'common/types'
import { ipcMain } from 'electron'
import { getBottlesNames } from './utils'

ipcMain.handle(
  'bottles.getBottlesNames',
  async (event, bottlesType: BottlesType): Promise<string[]> =>
    getBottlesNames(bottlesType)
)
