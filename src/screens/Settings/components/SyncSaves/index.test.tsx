import React from 'react'

import { fireEvent, render, waitFor } from '@testing-library/react'

import { ipcRenderer } from 'src/test_helpers/mock/electron'
import {
  resetTestTypes,
  test_appsettings,
  test_context,
  test_game,
  test_opendialog
} from 'src/test_helpers/testTypes'
import ContextProvider from 'src/state/ContextProvider'
import SyncSaves from './index'

interface Props {
  appName: string
  autoSyncSaves: boolean
  isProton?: boolean
  savesPath: string
  setAutoSyncSaves: (value: boolean) => void
  setSavesPath: (value: string) => void
  winePrefix?: string
}

async function renderSyncSaves(props: Partial<Props> = {}) {
  const defaultProps: Props = {
    appName: test_game.get().app_name,
    autoSyncSaves: false,
    isProton: false,
    savesPath: 'savesPath',
    setAutoSyncSaves: () => {
      return
    },
    setSavesPath: () => {
      return
    },
    winePrefix: test_appsettings.get().winePrefix
  }

  return await waitFor(() =>
    render(
      <ContextProvider.Provider value={test_context.get()}>
        <SyncSaves {...{ ...defaultProps, ...props }} />
      </ContextProvider.Provider>
    )
  )
}

describe('SyncSaves', () => {
  beforeEach(() => {
    resetTestTypes()
  })

  test('renders', async () => {
    await renderSyncSaves()
  })

  test('renders invoke setSavePath with default if savePath is empty', async () => {
    const onSetSavePath = jest.fn()
    test_appsettings.set({ winePrefix: '' })
    await renderSyncSaves({ savesPath: '', setSavesPath: onSetSavePath })
    await waitFor(() =>
      expect(onSetSavePath).toBeCalledWith(
        '/drive_c/users/user/AppData/LocalLow'
      )
    )
  })

  test('renders invoke setSavePath with path given in savePath', async () => {
    const onSetSavePath = jest.fn()
    await renderSyncSaves({
      savesPath: 'my/save/path',
      setSavesPath: onSetSavePath
    })
    await waitFor(() => expect(onSetSavePath).toBeCalledWith('my/save/path'))
  })

  test('renders invoke setSavePath with backslash path under windows', async () => {
    const onSetSavePath = jest.fn()
    test_context.set({ platform: 'win32' })
    await renderSyncSaves({
      savesPath: 'my/save/path',
      setSavesPath: onSetSavePath
    })
    await waitFor(() => expect(onSetSavePath).toBeCalledWith('my\\save\\path'))
  })

  test('input save path invoke setSavePath', async () => {
    const onSetSavePath = jest.fn()
    const { getByTestId } = await renderSyncSaves({
      savesPath: 'my/save/path',
      setSavesPath: onSetSavePath
    })
    await waitFor(() => expect(onSetSavePath).toBeCalledWith('my/save/path'))

    const inputSavePath = getByTestId('inputSavePath')
    fireEvent.change(inputSavePath, { target: { value: 'new/save/path' } })
    await waitFor(() => expect(onSetSavePath).toBeCalledWith('new/save/path'))
  })

  test('input save path via dialog invoke setSavePath', async () => {
    const onSetSavePath = jest.fn()
    const { getByTestId } = await renderSyncSaves({
      savesPath: '',
      setSavesPath: onSetSavePath
    })

    const selectSavePath = getByTestId('selectSavePath')

    test_opendialog.set({ path: '' })
    fireEvent.click(selectSavePath)
    await waitFor(() => expect(onSetSavePath).toBeCalledWith(''))

    test_opendialog.set({ path: 'new/save/path' })
    fireEvent.click(selectSavePath)
    await waitFor(() => expect(onSetSavePath).toBeCalledWith('new/save/path'))
  })

  test('remove save path invoke setSavePath with empty path', async () => {
    const onSetSavePath = jest.fn()
    const { getByTestId } = await renderSyncSaves({
      setSavesPath: onSetSavePath
    })
    await waitFor(() => expect(onSetSavePath).toBeCalledWith('savesPath'))
    const removeSavePath = getByTestId('removeSavePath')

    fireEvent.click(removeSavePath)
    await waitFor(() => expect(onSetSavePath).toBeCalledWith(''))
  })

  test('change sync type invokes setSyncType', async () => {
    const { getByTestId } = await renderSyncSaves()

    const selectSyncType = getByTestId('selectSyncType')
    expect(selectSyncType).toHaveValue('setting.manualsync.download')

    fireEvent.change(selectSyncType, {
      target: { value: 'setting.manualsync.upload' }
    })
    expect(selectSyncType).toHaveValue('setting.manualsync.upload')
  })

  test('click sync button works', async () => {
    const { getByTestId } = await renderSyncSaves()
    const setSync = getByTestId('setSync')

    fireEvent.click(setSync)
    expect(setSync).toHaveTextContent('setting.manualsync.syncing')
    await waitFor(() =>
      expect(setSync).toHaveTextContent('setting.manualsync.sync')
    )
    expect(ipcRenderer.invoke).toBeCalledWith('getUserInfo')
    expect(ipcRenderer.invoke).toBeCalledWith('openMessageBox', {
      message: 'success',
      title: 'Saves Sync'
    })
  })

  test('toggle auto sync invokes setAutoSyncSaves', async () => {
    const onSetAutoSyncSaves = jest.fn()
    const { getByTestId } = await renderSyncSaves({
      setAutoSyncSaves: onSetAutoSyncSaves
    })

    const toggleAutoSyncSaves = getByTestId('toggleSwitch')
    expect(toggleAutoSyncSaves).not.toBeChecked()
    fireEvent.click(toggleAutoSyncSaves)
    expect(onSetAutoSyncSaves).toBeCalledWith(true)
  })
})
