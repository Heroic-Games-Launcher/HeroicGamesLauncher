import { BrowserWindow } from 'electron'
import { initTrayIcon, testingExportsTrayIcon } from '../tray_icon'
import { backendEvents } from '../../backend_events'
import { GlobalConfig } from '../../config'
import { RecentGame } from 'common/types'
import { configStore } from '../../constants'

jest.mock('../../logger/logfile')
jest.mock('../../config')

const wait = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

describe('TrayIcon', () => {
  const mainWindow = new BrowserWindow()

  const setRecentGames = (games: RecentGame[]) => {
    jest.spyOn(configStore, 'get').mockReturnValue(games)
  }

  afterEach(() => {
    configStore.get = jest.fn()
  })

  describe('content', () => {
    describe('contextMenu', () => {
      it('shows recent games first', () => {
        const menu = testingExportsTrayIcon.contextMenu(mainWindow, [
          { title: 'game 1', appName: '123456' }
        ])

        // @ts-expect-error FIXME Mocks should not work like this
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
      describe('when recent games change', () => {
        it('updates the content when recent games change', async () => {
          setRecentGames([{ title: 'game 1', appName: '12345' }])

          const appIcon = await initTrayIcon(mainWindow)

          // @ts-expect-error FIXME Mocks should not work like this
          expect(appIcon['menu'][0]).toEqual({
            click: expect.any(Function),
            label: 'game 1'
          })

          // @ts-expect-error FIXME Mocks should not work like this
          expect(appIcon['menu'][1]).toEqual({
            type: 'separator'
          })

          backendEvents.emit('recentGamesChanged', [
            { title: 'game 2', appName: '67890' },
            { title: 'game 1', appName: '12345' }
          ])

          // wait for a moment since the event handler is async
          await wait(5)

          // @ts-expect-error FIXME Mocks should not work like this
          expect(appIcon['menu'][0]).toEqual({
            click: expect.any(Function),
            label: 'game 2'
          })

          // @ts-expect-error FIXME Mocks should not work like this
          expect(appIcon['menu'][1]).toEqual({
            click: expect.any(Function),
            label: 'game 1'
          })

          // @ts-expect-error FIXME Mocks should not work like this
          expect(appIcon['menu'][2]).toEqual({
            type: 'separator'
          })
        })

        it('limits the games based on config', async () => {
          // limits to maxRecentGames config
          // @ts-expect-error FIXME Mocks should not work like this
          GlobalConfig['setConfigValue']('maxRecentGames', 3)

          setRecentGames([])

          const appIcon = await initTrayIcon(mainWindow)

          // @ts-expect-error FIXME Mocks should not work like this
          expect(appIcon['menu'][0]).toEqual({
            type: 'separator'
          })

          backendEvents.emit('recentGamesChanged', [
            { title: 'game 1', appName: '1' },
            { title: 'game 2', appName: '2' },
            { title: 'game 3', appName: '3' },
            { title: 'game 4', appName: '4' },
            { title: 'game 5', appName: '5' }
          ])

          // wait for a moment since the event handler is async
          await wait(5)

          // @ts-expect-error FIXME Mocks should not work like this
          const items = appIcon['menu']

          expect(items[0]).toEqual({
            click: expect.any(Function),
            label: 'game 1'
          })

          expect(items[1]).toEqual({
            click: expect.any(Function),
            label: 'game 2'
          })

          expect(items[2]).toEqual({
            click: expect.any(Function),
            label: 'game 3'
          })

          expect(items[3]).toEqual({
            type: 'separator'
          })
        })
      })
    })

    it('limits the number of recent games to show at creation', async () => {
      const recentGames = [
        { title: 'game 1', appName: '1' },
        { title: 'game 2', appName: '2' },
        { title: 'game 3', appName: '3' },
        { title: 'game 4', appName: '4' },
        { title: 'game 5', appName: '5' },
        { title: 'game 6', appName: '6' },
        { title: 'game 7', appName: '7' },
        { title: 'game 8', appName: '8' },
        { title: 'game 9', appName: '9' }
      ]

      setRecentGames(recentGames)

      // defaults to 5
      // @ts-expect-error FIXME Mocks should not work like this
      GlobalConfig['setConfigValue']('maxRecentGames', undefined)

      const appIcon = await initTrayIcon(mainWindow)

      // @ts-expect-error FIXME Mocks should not work like this
      const items = appIcon['menu']

      expect(items[0]).toEqual({
        click: expect.any(Function),
        label: 'game 1'
      })

      expect(items[1]).toEqual({
        click: expect.any(Function),
        label: 'game 2'
      })

      expect(items[2]).toEqual({
        click: expect.any(Function),
        label: 'game 3'
      })

      expect(items[3]).toEqual({
        click: expect.any(Function),
        label: 'game 4'
      })

      expect(items[4]).toEqual({
        click: expect.any(Function),
        label: 'game 5'
      })

      expect(items[5]).toEqual({
        type: 'separator'
      })
    })
  })

  describe('icon', () => {
    // the mock returns the icon path, the width, and the height
    it('shows different size per platform', () => {
      let icon = testingExportsTrayIcon.getIcon('linux')
      expect(icon).toMatch(/.*icon-light.png width=32 height=32/)

      icon = testingExportsTrayIcon.getIcon('darwin')
      expect(icon).toMatch(/.*icon-light.png width=20 height=20/)
    })

    it('can show dark or light icon', () => {
      // @ts-expect-error FIXME Mocks should not work like this
      GlobalConfig['setConfigValue']('darkTrayIcon', true)

      let icon = testingExportsTrayIcon.getIcon()
      expect(icon).toMatch(/.*icon-dark.png/)

      // @ts-expect-error FIXME Mocks should not work like this
      GlobalConfig['setConfigValue']('darkTrayIcon', false)

      icon = testingExportsTrayIcon.getIcon()
      expect(icon).toMatch(/.*icon-light.png/)
    })
  })
})
