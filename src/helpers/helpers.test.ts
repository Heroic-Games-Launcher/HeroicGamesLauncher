import '@testing-library/react'

import { GameStatus, InstallProgress } from 'src/types'
import { initElectronMocks, ipcRenderer } from 'src/test_helpers/mock/electron'
import { install } from 'src/helpers'
import {
  resetTestTypes,
  test_opendialog,
  test_openmessagebox_response
} from 'src/test_helpers/testTypes'

interface Props {
  appName: string
  handleGameStatus: (game: GameStatus) => Promise<void>
  installPath: 'import' | 'default' | 'another'
  isInstalling: boolean
  previousProgress: InstallProgress
  progress: InstallProgress
  setInstallPath?: (path: string) => void
  t: (str: string) => string
  installDlcs: boolean
  sdlList: Array<string>
}

async function callHandleInstall(props: Partial<Props> = {}) {
  const defaultProps: Props = {
    appName: 'game',
    handleGameStatus: () =>
      new Promise(() => {
        return
      }),
    installPath: 'default',
    isInstalling: false,
    installDlcs: false,
    sdlList: [],
    previousProgress: {
      bytes: '0',
      eta: '0',
      folder: '/',
      percent: '0'
    },
    progress: {
      bytes: '0',
      eta: '0',
      percent: '0'
    },
    t: (str: string) => str
  }
  return await install({ ...defaultProps, ...props })
}

describe('handleInstall', () => {
  beforeEach(() => {
    resetTestTypes()
    initElectronMocks()
  })

  test('install game on default path', async () => {
    const onHandleGameStatus = jest.fn()
    await callHandleInstall({ handleGameStatus: onHandleGameStatus })
    expect(ipcRenderer.invoke).toBeCalledWith('install', {
      appName: 'game',
      installDlcs: false,
      path: "'default/install/path'",
      sdlList: []
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('requestSettings', 'default')
    expect(onHandleGameStatus).toBeCalledWith({
      appName: 'game',
      status: 'installing'
    })
    expect(onHandleGameStatus).toBeCalledWith({
      appName: 'game',
      status: 'done'
    })
  })

  test('stop game installing on default path', async () => {
    const onHandleGameStatus = jest.fn()

    // call sendkill
    test_openmessagebox_response.set(1)
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      isInstalling: true
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('kill', 'game')

    // remove folder
    test_openmessagebox_response.set(2)
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      isInstalling: true
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('kill', 'game')
    expect(ipcRenderer.send).toBeCalledWith('removeFolder', [
      'default/install/path',
      'folder_name'
    ])
  })

  test('install game on import path', async () => {
    const onHandleGameStatus = jest.fn()
    test_opendialog.set({ path: 'import/path' })
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'import'
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('importGame', {
      appName: 'game',
      path: 'import/path'
    })
    expect(onHandleGameStatus).toBeCalledWith({
      appName: 'game',
      status: 'installing'
    })
    expect(onHandleGameStatus).toBeCalledWith({
      appName: 'game',
      status: 'done'
    })
  })

  test('install game on import path with invalid path does nothing', async () => {
    const onHandleGameStatus = jest.fn()
    test_opendialog.set({ path: undefined })
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'import'
    })
    expect(onHandleGameStatus).not.toBeCalled()
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('openDialog', {
      buttonLabel: 'gamepage:box.choose',
      properties: ['openDirectory'],
      title: 'gamepage:box.importpath'
    })
  })

  test('install game on import path with cancel openDialog does nothing', async () => {
    const onHandleGameStatus = jest.fn()
    test_opendialog.set({ canceled: true })
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'import'
    })
    expect(onHandleGameStatus).not.toBeCalled()
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('openDialog', {
      buttonLabel: 'gamepage:box.choose',
      properties: ['openDirectory'],
      title: 'gamepage:box.importpath'
    })
  })

  test('stop game installing on import path', async () => {
    const onHandleGameStatus = jest.fn()

    // call sendkill
    test_openmessagebox_response.set(1)
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'import',
      isInstalling: true
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('kill', 'game')

    // remove folder
    test_openmessagebox_response.set(2)
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'import',
      isInstalling: true
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.send).toBeCalledWith('removeFolder', [
      'import',
      'folder_name'
    ])
  })

  test('install game on another path', async () => {
    const onHandleGameStatus = jest.fn()
    test_opendialog.set({ path: 'another/path' })
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'another'
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('install', {
      appName: 'game',
      path: "'another/path'",
      installDlcs: false,
      sdlList: []
    })
    expect(onHandleGameStatus).toBeCalledWith({
      appName: 'game',
      status: 'installing'
    })
    expect(onHandleGameStatus).toBeCalledWith({
      appName: 'game',
      status: 'done'
    })
    expect(ipcRenderer.invoke).toBeCalledWith('openDialog', {
      buttonLabel: 'gamepage:box.choose',
      properties: ['openDirectory'],
      title: 'gamepage:box.installpath'
    })
  })

  test('install game on another path with invalid path does nothing', async () => {
    const onHandleGameStatus = jest.fn()
    test_opendialog.set({ path: undefined })
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'another'
    })
    expect(onHandleGameStatus).not.toBeCalledWith()
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('openDialog', {
      buttonLabel: 'gamepage:box.choose',
      properties: ['openDirectory'],
      title: 'gamepage:box.installpath'
    })
  })

  test('install game on another path with cancel openDialog does nothing', async () => {
    const onHandleGameStatus = jest.fn()
    test_opendialog.set({ canceled: true })
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'another'
    })
    expect(onHandleGameStatus).not.toBeCalledWith()
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('openDialog', {
      buttonLabel: 'gamepage:box.choose',
      properties: ['openDirectory'],
      title: 'gamepage:box.installpath'
    })
  })

  test('stop game installing on another path', async () => {
    const onHandleGameStatus = jest.fn()

    // call sendkill
    test_openmessagebox_response.set(1)
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'another',
      isInstalling: true
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.invoke).toBeCalledWith('kill', 'game')

    // remove folder
    test_openmessagebox_response.set(2)
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: 'another',
      isInstalling: true
    })
    expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'game')
    expect(ipcRenderer.send).toBeCalledWith('removeFolder', [
      'another',
      'folder_name'
    ])
  })

  test('install game on undefined path does nothing', async () => {
    const onHandleGameStatus = jest.fn()
    await callHandleInstall({
      handleGameStatus: onHandleGameStatus,
      installPath: undefined
    })
    expect(onHandleGameStatus).not.toBeCalled()
    expect(ipcRenderer.invoke).not.toBeCalled()
  })
})
