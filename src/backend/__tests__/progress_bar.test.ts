import { BrowserWindow } from 'electron'
import { backendEvents } from '../backend_events'
import { sendFrontendMessage } from '../main_window'
import '../progress_bar'

jest.mock('../logger/logfile')

describe('progress_bar', () => {
  const window = {
    webContents: {
      send: jest.fn()
    },
    setProgressBar: jest.fn()
  }

  // stub windows
  beforeAll(() => {
    BrowserWindow['setAllWindows']([window])
  })

  // cleanup stubs
  afterAll(() => {
    BrowserWindow['setAllWindows']([])
  })

  // spy on `setProgressBar` method
  beforeEach(() => {
    window.setProgressBar = jest.fn()
  })

  describe('on gameStatusUpdate with status="queued"', () => {
    it('does nothing', () => {
      sendFrontendMessage('gameStatusUpdate', {
        appName: 'Test',
        status: 'queued'
      })

      expect(window.setProgressBar).not.toBeCalled()
    })
  })

  describe('on gameStatusUpdate with status other than "done"', () => {
    it('sets progress bar to indeterminate', () => {
      sendFrontendMessage('gameStatusUpdate', {
        appName: 'Test',
        status: 'installing'
      })

      expect(window.setProgressBar).toBeCalledWith(2)
    })

    it('starts listening for progress updates', () => {
      jest.spyOn(backendEvents, 'on')

      sendFrontendMessage('gameStatusUpdate', {
        appName: 'Test',
        status: 'installing'
      })

      expect(backendEvents.on).toBeCalledWith(
        'progressUpdate-Test',
        expect.any(Function)
      )
    })
  })

  describe('on progressUpdate-${appName}', () => {
    it('sets progress bar according to progress', () => {
      sendFrontendMessage('progressUpdate-Test', {
        progress: { percent: 42 }
      })

      expect(window.setProgressBar).toBeCalledWith(0.42)
    })
  })

  describe('on gameStatusUpdate with status="done"', () => {
    it('removes the progress bar', () => {
      sendFrontendMessage('gameStatusUpdate', {
        appName: 'Test',
        status: 'done'
      })

      expect(window.setProgressBar).toBeCalledWith(-1)
    })

    it('stops listening for progress updates', () => {
      jest.spyOn(backendEvents, 'off')

      sendFrontendMessage('gameStatusUpdate', {
        appName: 'Test',
        status: 'done'
      })

      expect(backendEvents.off).toBeCalledWith(
        'progressUpdate-Test',
        expect.any(Function)
      )
    })
  })
})
