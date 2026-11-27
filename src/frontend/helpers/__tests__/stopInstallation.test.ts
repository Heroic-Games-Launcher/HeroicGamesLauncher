import type { TFunction } from 'i18next'
import {
  getStopInstallationCancel,
  getStopInstallationDialog,
  openStopInstallationDialog
} from '../stopInstallation'

type Progress = Parameters<typeof getStopInstallationDialog>[1]

const t = ((_key: string, defaultValue?: string) =>
  defaultValue ?? '') as unknown as TFunction<'gamepage'>

const actions = () => ({
  cancel: jest.fn(),
  keepProgress: jest.fn(),
  removeProgress: jest.fn()
})

const baseProgress: Progress = { eta: '', percent: 45, bytes: 512 }

describe('getStopInstallationDialog', () => {
  it('orders the normal dialog safe-first', () => {
    const dialog = getStopInstallationDialog(t, baseProgress, actions())

    expect(dialog.title).toBe('Stop installing?')
    expect(dialog.buttons?.map((button) => button.text)).toEqual([
      'Keep installing',
      'Stop and keep files',
      'Stop and delete files'
    ])
    expect(dialog.buttons?.map((button) => button.variant)).toEqual([
      'secondary',
      'primary',
      'danger'
    ])
    expect(dialog.buttons?.[0].onClick).toBeUndefined()
    expect(dialog.message).toContain('Keep the files downloaded')
  })

  it('keeps files then cancels without deleting for stop-and-keep', () => {
    const handlers = actions()
    const stopKeep = getStopInstallationDialog(t, baseProgress, handlers)
      .buttons?.[1]

    stopKeep?.onClick?.()

    expect(handlers.keepProgress).toHaveBeenCalledTimes(1)
    expect(handlers.cancel).toHaveBeenCalledWith(false)
    expect(handlers.removeProgress).not.toHaveBeenCalled()
  })

  it('deletes progress then cancels with removeDownloaded for stop-and-delete', () => {
    const handlers = actions()
    const stopDelete = getStopInstallationDialog(t, baseProgress, handlers)
      .buttons?.[2]

    stopDelete?.onClick?.()

    expect(handlers.removeProgress).toHaveBeenCalledTimes(1)
    expect(handlers.cancel).toHaveBeenCalledWith(true)
    expect(handlers.keepProgress).not.toHaveBeenCalled()
  })

  it('keeps the three-button shape for a queued download with progress', () => {
    const dialog = getStopInstallationDialog(t, baseProgress, actions(), true)

    expect(dialog.buttons).toHaveLength(3)
    expect(dialog.buttons?.map((button) => button.text)).toEqual([
      'Keep installing',
      'Stop and keep files',
      'Stop and delete files'
    ])
    expect(dialog.message).toContain('Keep the files downloaded')
  })

  it('treats reported bytes as progress for a queued download', () => {
    const dialog = getStopInstallationDialog(
      t,
      { eta: '', percent: 0, bytes: 0 },
      actions(),
      true
    )

    expect(dialog.buttons).toHaveLength(3)
  })

  it('offers only keep-or-remove for a queued download with no progress', () => {
    const handlers = actions()
    const dialog = getStopInstallationDialog(
      t,
      { eta: '', percent: 0, bytes: undefined },
      handlers,
      true
    )

    expect(dialog.title).toBe('Remove from queue')
    expect(dialog.message).toContain('Nothing has been downloaded yet')
    expect(dialog.buttons?.map((button) => button.text)).toEqual([
      'Keep installing',
      'Remove from queue'
    ])
    expect(dialog.buttons?.map((button) => button.variant)).toEqual([
      'secondary',
      'danger'
    ])
    expect(dialog.buttons?.map((button) => button.text)).not.toContain(
      'Stop and keep files'
    )

    dialog.buttons?.[1].onClick?.()

    expect(handlers.cancel).toHaveBeenCalledWith(false)
    expect(handlers.keepProgress).not.toHaveBeenCalled()
    expect(handlers.removeProgress).not.toHaveBeenCalled()
  })
})

describe('getStopInstallationCancel', () => {
  const api = () => ({
    cancelDownload: jest.fn(),
    cancelQueuedDownload: jest.fn()
  })

  it('cancels the running download by flag', () => {
    const calls = api()

    getStopInstallationCancel('game', calls, false)(true)

    expect(calls.cancelDownload).toHaveBeenCalledWith(true)
    expect(calls.cancelQueuedDownload).not.toHaveBeenCalled()
  })

  it('cancels a queued download by app name and flag', () => {
    const calls = api()

    getStopInstallationCancel('game', calls, true)(false)

    expect(calls.cancelQueuedDownload).toHaveBeenCalledWith('game', false)
    expect(calls.cancelDownload).not.toHaveBeenCalled()
  })
})

describe('openStopInstallationDialog', () => {
  const makeApi = () => ({
    cancelDownload: jest.fn(),
    cancelQueuedDownload: jest.fn()
  })

  const makeStorage = () => ({
    setItem: jest.fn(),
    removeItem: jest.fn()
  })

  const open = (
    queued: boolean,
    progress: Progress,
    api = makeApi(),
    storage = makeStorage()
  ) => {
    const dialogs: Array<ReturnType<typeof getStopInstallationDialog>> = []

    openStopInstallationDialog({
      appName: 'game',
      path: '/games/game',
      t,
      progress,
      showDialogModal: (options) => dialogs.push(options),
      api,
      storage,
      queued
    })

    return { dialog: dialogs[0], api, storage }
  }

  it('cancels the running download with the matching flag and keeps/removes progress', () => {
    const kept = open(false, baseProgress)
    kept.dialog.buttons?.[1].onClick?.()

    expect(kept.api.cancelDownload).toHaveBeenCalledWith(false)
    expect(kept.api.cancelQueuedDownload).not.toHaveBeenCalled()
    expect(kept.storage.setItem).toHaveBeenCalledWith(
      'game',
      expect.stringContaining('/games/game')
    )

    const deleted = open(false, baseProgress)
    deleted.dialog.buttons?.[2].onClick?.()

    expect(deleted.api.cancelDownload).toHaveBeenCalledWith(true)
    expect(deleted.storage.removeItem).toHaveBeenCalledWith('game')
  })

  it('cancels a queued download by name with the matching flag', () => {
    const kept = open(true, baseProgress)
    kept.dialog.buttons?.[1].onClick?.()

    expect(kept.api.cancelQueuedDownload).toHaveBeenCalledWith('game', false)
    expect(kept.api.cancelDownload).not.toHaveBeenCalled()

    const deleted = open(true, baseProgress)
    deleted.dialog.buttons?.[2].onClick?.()

    expect(deleted.api.cancelQueuedDownload).toHaveBeenCalledWith('game', true)
  })

  it('removes a queued download without progress without deleting files', () => {
    const noProgress: Progress = { eta: '', percent: 0, bytes: undefined }
    const result = open(true, noProgress)

    expect(result.dialog.title).toBe('Remove from queue')
    result.dialog.buttons?.[1].onClick?.()

    expect(result.api.cancelQueuedDownload).toHaveBeenCalledWith('game', false)
    expect(result.api.cancelDownload).not.toHaveBeenCalled()
    expect(result.storage.setItem).not.toHaveBeenCalled()
    expect(result.storage.removeItem).not.toHaveBeenCalled()
  })
})
