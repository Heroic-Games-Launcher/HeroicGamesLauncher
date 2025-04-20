import { BrowserWindow } from 'electron'
import { initTrayIcon, testingExportsTrayIcon } from '../tray_icon'
import { backendEvents } from '../../backend_events'
import { GlobalConfig } from '../../config'
import { RecentGame } from 'common/types'
import { configStore } from '../../constants'
import i18next from 'i18next'

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
      beforeEach(() => {
        setRecentGames([])
      })

      it('shows recent games first', () => {
        const menu = testingExportsTrayIcon.contextMenu(mainWindow, [
          { title: 'game 1', appName: '123456' }
        ])

        // @ts-expect-error FIXME: Mocks shouldn't add functionality
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
        it('updates the content', async () => {
          setRecentGames([{ title: 'game 1', appName: '12345' }])

          const appIcon = await initTrayIcon(mainWindow)

          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          expect(appIcon['menu'][0]).toEqual({
            click: expect.any(Function),
            label: 'game 1'
          })

          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          expect(appIcon['menu'][1]).toEqual({
            type: 'separator'
          })

          backendEvents.emit('recentGamesChanged', [
            { title: 'game 2', appName: '67890' },
            { title: 'game 1', appName: '12345' }
          ])

          // wait for a moment since the event handler is async
          await wait(5)

          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          expect(appIcon['menu'][0]).toEqual({
            click: expect.any(Function),
            label: 'game 2'
          })

          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          expect(appIcon['menu'][1]).toEqual({
            click: expect.any(Function),
            label: 'game 1'
          })

          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          expect(appIcon['menu'][2]).toEqual({
            type: 'separator'
          })
        })

        it('limits the number games displayed based on config', async () => {
          // limits to maxRecentGames config
          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          GlobalConfig['setConfigValue']('maxRecentGames', 3)

          setRecentGames([])

          const appIcon = await initTrayIcon(mainWindow)

          // @ts-expect-error FIXME: Mocks shouldn't add functionality
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

          // @ts-expect-error FIXME: Mocks shouldn't add functionality
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

      describe('when language changes', () => {
        it('reloads the menu with the new language', async () => {
          // mock some translation
          const original_t = i18next.t
          jest.spyOn(i18next, 't').mockImplementation((key) => {
            if (key === 'tray.quit') {
              return i18next.language === 'es' ? 'Salir' : 'Quit'
            }
            return key as string
          })

          // check it renders english
          i18next.language = 'en'
          const appIcon = await initTrayIcon(mainWindow)
          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          let items = appIcon['menu']
          expect(items[items.length - 1].label).toEqual('Quit')

          // change language
          i18next.language = 'es'
          backendEvents.emit('languageChanged')
          // wait for a moment since the event handler is async
          await wait(5)

          // check it renders spanish
          // @ts-expect-error FIXME: Mocks shouldn't add functionality
          items = appIcon['menu']
          expect(items[items.length - 1].label).toEqual('Salir')

          // reset t function mock
          i18next.t = original_t
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
      // @ts-expect-error FIXME: Mocks shouldn't add functionality
      GlobalConfig['setConfigValue']('maxRecentGames', undefined)

      const appIcon = await initTrayIcon(mainWindow)

      // @ts-expect-error FIXME: Mocks shouldn't add functionality
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
      // @ts-expect-error FIXME: Mocks shouldn't add functionality
      GlobalConfig['setConfigValue']('darkTrayIcon', true)

      let icon = testingExportsTrayIcon.getIcon()
      expect(icon).toMatch(/.*icon-dark.png/)

      // @ts-expect-error FIXME: Mocks shouldn't add functionality
      GlobalConfig['setConfigValue']('darkTrayIcon', false)

      icon = testingExportsTrayIcon.getIcon()
      expect(icon).toMatch(/.*icon-light.png/)
    })
  })
})
