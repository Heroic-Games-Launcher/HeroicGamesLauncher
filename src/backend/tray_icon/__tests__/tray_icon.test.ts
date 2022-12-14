import { BrowserWindow } from 'electron'
import { contextMenu, getIcon, initTrayIcon } from '../tray_icon'
import { backendEvents } from '../../backend_events'
import { setRecentGames } from '../../recent_games/recent_games'
import { GlobalConfig } from '../../config'

jest.mock('../../logger/logfile')
jest.mock('../../config')
jest.mock('../../recent_games/recent_games')

describe('TrayIcon', () => {
  const mainWindow = new BrowserWindow()

  describe('content', () => {
    describe('contextMenu', () => {
      it('shows recent games first', () => {
        const menu = contextMenu(mainWindow, [
          { title: 'game 1', appName: '123456' }
        ])

        expect(menu[0]).toEqual({
          click: expect.any(Function),
          label: 'game 1'
        })
      })

      it('sets accelerators per platform', () => {
        let menu = contextMenu(mainWindow, [], 'linux')

        expect(menu).toContainEqual({
          accelerator: 'Ctrl+R',
          label: 'tray.reload',
          click: expect.any(Function)
        })

        menu = contextMenu(mainWindow, [], 'darwin')

        expect(menu).toContainEqual({
          accelerator: 'Cmd+R',
          label: 'tray.reload',
          click: expect.any(Function)
        })
      })
    })

    it('updates the content when recent games change', async () => {
      setRecentGames([{ title: 'game 1', appName: '12345' }])

      const appIcon = await initTrayIcon(mainWindow)

      expect(appIcon['menu'][0]).toEqual({
        click: expect.any(Function),
        label: 'game 1'
      })

      expect(appIcon['menu'][1]).toEqual({
        type: 'separator'
      })

      backendEvents.emit('recentGamesChanged', [
        { title: 'game 2', appName: '67890' },
        { title: 'game 1', appName: '12345' }
      ])

      expect(appIcon['menu'][0]).toEqual({
        click: expect.any(Function),
        label: 'game 2'
      })

      expect(appIcon['menu'][1]).toEqual({
        click: expect.any(Function),
        label: 'game 1'
      })

      expect(appIcon['menu'][2]).toEqual({
        type: 'separator'
      })
    })
  })

  describe('icon', () => {
    // the mock returns the icon path, the width, and the height
    it('shows different size per platform', async () => {
      let icon = await getIcon('linux')
      expect(icon).toMatch(/.*icon-light.png width=32 height=32/)

      icon = await getIcon('darwin')
      expect(icon).toMatch(/.*icon-light.png width=20 height=20/)
    })

    it('can show dark or light icon', async () => {
      GlobalConfig['setConfigValue']('darkTrayIcon', true)

      let icon = await getIcon()
      expect(icon).toMatch(/.*icon-dark.png/)

      GlobalConfig['setConfigValue']('darkTrayIcon', false)

      icon = await getIcon()
      expect(icon).toMatch(/.*icon-light.png/)
    })
  })
})
