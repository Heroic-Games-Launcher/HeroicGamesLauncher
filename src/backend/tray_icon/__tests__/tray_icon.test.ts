import { BrowserWindow } from 'electron'
import { initTrayIcon, testingExportsTrayIcon } from '../tray_icon'
import { backendEvents } from '../../backend_events'
import { GlobalConfig } from '../../config'
import { testingExportsRecentGames } from '../../recent_games/recent_games'

jest.mock('../../logger/logfile')
jest.mock('../../config')
jest.mock('../../recent_games/recent_games')

describe('TrayIcon', () => {
  const mainWindow = new BrowserWindow()

  describe('content', () => {
    describe('contextMenu', () => {
      it('shows recent games first', () => {
        const menu = testingExportsTrayIcon.contextMenu(mainWindow, [
          { title: 'game 1', appName: '123456' }
        ])

        expect(menu[0]).toEqual({
          click: expect.any(Function),
          label: 'game 1'
        })
      })

      it('sets accelerators per platform', () => {
        let menu = testingExportsTrayIcon.contextMenu(mainWindow, [], 'linux')

        expect(menu).toContainEqual({
          accelerator: 'Ctrl+R',
          label: 'tray.reload',
          click: expect.any(Function)
        })

        menu = testingExportsTrayIcon.contextMenu(mainWindow, [], 'darwin')

        expect(menu).toContainEqual({
          accelerator: 'Cmd+R',
          label: 'tray.reload',
          click: expect.any(Function)
        })
      })
    })

    it('updates the content when recent games change', async () => {
      testingExportsRecentGames.setRecentGames([
        { title: 'game 1', appName: '12345' }
      ])

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
      let icon = await testingExportsTrayIcon.getIcon('linux')
      expect(icon).toMatch(/.*icon-light.png width=32 height=32/)

      icon = await testingExportsTrayIcon.getIcon('darwin')
      expect(icon).toMatch(/.*icon-light.png width=20 height=20/)
    })

    it('can show dark or light icon', async () => {
      GlobalConfig['setConfigValue']('darkTrayIcon', true)

      let icon = await testingExportsTrayIcon.getIcon()
      expect(icon).toMatch(/.*icon-dark.png/)

      GlobalConfig['setConfigValue']('darkTrayIcon', false)

      icon = await testingExportsTrayIcon.getIcon()
      expect(icon).toMatch(/.*icon-light.png/)
    })
  })
})
