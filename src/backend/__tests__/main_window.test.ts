import { createMainWindow, sendFrontendMessage } from '../main_window'
import { BrowserWindow, Display, screen } from 'electron'
import { configStore } from '../constants'
import { overrideProcessPlatform } from './constants.test'

jest.mock('../logger/logfile')

describe('main_window', () => {
  describe('sendFrontendMessage', () => {
    describe('if no main window', () => {
      beforeAll(() => {
        // @ts-expect-error FIXME Mocks should not work like this
        BrowserWindow['setAllWindows']([])
      })

      it('returns false', () => {
        expect(sendFrontendMessage('message')).toBe(false)
      })
    })

    describe('if there is a main window', () => {
      const window = {
        webContents: {
          send: jest.fn()
        }
      }

      // stub windows
      beforeAll(() => {
        // @ts-expect-error FIXME Mocks should not work like this
        BrowserWindow['setAllWindows']([window])
      })

      // spy the `send` method
      beforeEach(() => {
        window.webContents.send = jest.fn()
      })

      // cleanup stubs
      afterAll(() => {
        // @ts-expect-error FIXME Mocks should not work like this
        BrowserWindow['setAllWindows']([])
      })

      it('sends a message to its webContents', () => {
        sendFrontendMessage('message', 'param1', 'param2')

        expect(window.webContents.send).toBeCalledWith(
          'message',
          'param1',
          'param2'
        )
      })
    })
  })

  describe('createMainWindow', () => {
    describe('with stored window geometry', () => {
      beforeEach(() => {
        jest.spyOn(configStore, 'has').mockReturnValue(true)
        jest.spyOn(configStore, 'get').mockReturnValue({
          width: 800,
          height: 600,
          x: 0,
          y: 0
        })
      })

      it('creates the new window with the given geometry', () => {
        const window = createMainWindow()
        // @ts-expect-error FIXME Mocks should not work like this
        const options = window['options']

        expect(options.height).toBe(600)
        expect(options.width).toBe(800)
        expect(options.x).toBe(0)
        expect(options.y).toBe(0)
      })
    })

    describe('without stored window geometry', () => {
      beforeAll(() => {
        jest.spyOn(configStore, 'has').mockReturnValue(false)
      })

      it('creates the new window with the default geometry', () => {
        const window = createMainWindow()
        // @ts-expect-error FIXME Mocks should not work like this
        const options = window['options']

        expect(options.height).toBe(690)
        expect(options.width).toBe(1200)
        expect(options.x).toBe(0)
        expect(options.y).toBe(0)
      })

      it('ensures windows is not bigger than the screen', () => {
        // mock a smaller screen info
        jest.spyOn(screen, 'getPrimaryDisplay').mockReturnValue({
          workAreaSize: {
            height: 768,
            width: 1024
          }
        } as Display)

        const window = createMainWindow()
        // @ts-expect-error FIXME Mocks should not work like this
        const options = window['options']

        expect(options.height).toBe(690)
        expect(options.width).toBe(1024 * 0.8) // 80% of the workAreaSize.width
        expect(options.x).toBe(0)
        expect(options.y).toBe(0)
      })
    })

    describe('with frameless window enabled', () => {
      beforeEach(() => {
        jest.spyOn(configStore, 'has').mockReturnValue(false)
        jest.spyOn(configStore, 'get').mockReturnValue({
          framelessWindow: true
        })
      })

      it('creates a simple frameless window on Linux', () => {
        const originalPlatform = overrideProcessPlatform('linux')
        const window = createMainWindow()
        // @ts-expect-error FIXME Mocks should not work like this
        const options = window['options']
        overrideProcessPlatform(originalPlatform)

        expect(options.frame).toBe(false)
        expect(options.titleBarStyle).toBeUndefined()
        expect(options.titleBarOverlay).toBeUndefined()
      })

      it('creates a frameless window with overlay controls on macOS and Windows', () => {
        ;['darwin', 'win32'].forEach((platform) => {
          const originalPlatform = overrideProcessPlatform(platform)
          const window = createMainWindow()
          // @ts-expect-error FIXME Mocks should not work like this
          const options = window['options']
          overrideProcessPlatform(originalPlatform)

          expect(options.frame).toBeUndefined()
          expect(options.titleBarStyle).toBe('hidden')
          expect(options.titleBarOverlay).toBe(true)
        })
      })
    })

    describe('with frameless window disabled', () => {
      beforeAll(() => {
        jest.spyOn(configStore, 'has').mockReturnValue(false)
        jest.spyOn(configStore, 'get').mockReturnValue({
          framelessWindow: false
        })
      })

      it('creates the new window with default titlebar', () => {
        const window = createMainWindow()
        // @ts-expect-error FIXME Mocks should not work like this
        const options = window['options']

        expect(options.frame).toBeUndefined()
        expect(options.titleBarStyle).toBeUndefined()
        expect(options.titleBarOverlay).toBeUndefined()
      })
    })
  })
})
