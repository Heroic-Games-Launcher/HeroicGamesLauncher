import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { ContextType } from 'src/types';
import { game } from 'src/test_helpers/testDefaultVariables'
import { ipcRenderer, remote } from 'src/test_helpers/mock/electron';
import ContextProvider from 'src/state/ContextProvider';
import SyncSaves from './index';

jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      i18n: {
        changeLanguage: () => new Promise(() => {return;})
      },
      t: (str: string) => str
    };
  }
}));

interface Props {
  appName: string
  autoSyncSaves: boolean
  isProton?: boolean
  savesPath: string
  setAutoSyncSaves: (value: boolean) => void
  setSavesPath: (value: string) => void
  winePrefix?: string
}

type UserInfo = {
  account_id?: string
  displayName?: string
  epicId?: string
  name?: string
}

async function renderSyncSaves(props: Partial<Props> = {}, context: Partial<ContextType> = {})
{
  const defaultContext: ContextType = {
    category: 'games',
    data: [],
    error: false,
    filter: 'all',
    gameUpdates: [],
    handleCategory: () => null,
    handleFilter: () => null,
    handleGameStatus: () => Promise.resolve(),
    handleLayout: () => null,
    handleSearch: () => null,
    layout: 'grid',
    libraryStatus: [],
    platform: 'linux',
    refresh: () => Promise.resolve(),
    refreshLibrary: () => Promise.resolve(),
    refreshing: false,
    user: 'user'
  };

  const defaultUser: UserInfo = {
    account_id: 'account_id',
    displayName: 'displayName',
    epicId: 'epicId',
    name: 'name'
  };

  const defaultProps: Props = {
    appName: 'appName',
    autoSyncSaves: false,
    isProton: false,
    savesPath: 'savesPath',
    setAutoSyncSaves: () => {return;},
    setSavesPath: () => {return;},
    winePrefix: 'winePrefix'
  };

  remote.process.platform = context.platform ? context.platform : defaultContext.platform;
  ipcRenderer.invoke.mockResolvedValueOnce(game).mockResolvedValueOnce({
    account_id: defaultUser.account_id,
    user: context.user ? context.user : defaultContext.user});
  const returnvalue = await render(
    <ContextProvider.Provider value={{...defaultContext, ...context}}>
      <SyncSaves {...{...defaultProps, ...props}}/>
    </ContextProvider.Provider>)
  await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith('getGameInfo', 'appName'));
  await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith('getUserInfo'));
  return returnvalue;
}

describe('SyncSaves', () => {
  test('renders', async () => {
    await renderSyncSaves();
  })

  test('renders invoke setSavePath with default if savePath is empty', async () => {
    const onSetSavePath = jest.fn();
    await renderSyncSaves({savesPath: '', setSavesPath: onSetSavePath});
    expect(onSetSavePath).toBeCalledWith('/drive_c/users/user/AppData/LocalLow');
  })

  test('renders invoke setSavePath with path given in savePath', async () => {
    const onSetSavePath = jest.fn();
    await renderSyncSaves({savesPath: 'my/save/path', setSavesPath: onSetSavePath});
    expect(onSetSavePath).toBeCalledWith('my/save/path');
  })

  test('renders invoke setSavePath with backslash path under windows', async () => {
    const onSetSavePath = jest.fn();
    await renderSyncSaves({savesPath: 'my/save/path', setSavesPath: onSetSavePath}, {platform: 'win32'});
    expect(onSetSavePath).toBeCalledWith('my\\save\\path');
  })

  test('renders invoke setSavePath with backslash path under windows', async () => {
    const onSetSavePath = jest.fn();
    await renderSyncSaves({savesPath: 'my/save/path', setSavesPath: onSetSavePath}, {platform: 'win32'});
    expect(onSetSavePath).toBeCalledWith('my\\save\\path');
  })

  test('renders invoke setSavePath with backslash path under windows', async () => {
    const onSetSavePath = jest.fn();
    await renderSyncSaves({savesPath: 'my/save/path', setSavesPath: onSetSavePath}, {platform: 'win32'});
    expect(onSetSavePath).toBeCalledWith('my\\save\\path');
  })

  test('input save path invoke setSavePath', async () => {
    const onSetSavePath = jest.fn();
    const { getByTestId } = await renderSyncSaves({savesPath: 'my/save/path', setSavesPath: onSetSavePath});
    expect(onSetSavePath).toBeCalledWith('my/save/path');

    const inputSavePath = getByTestId('inputSavePath');
    fireEvent.change(inputSavePath, { target: { value: 'new/save/path' }});
    expect(onSetSavePath).toBeCalledWith('new/save/path');
  })

  test('input save path via dialog invoke setSavePath', async () => {
    const onSetSavePath = jest.fn();
    const { getByTestId } = await renderSyncSaves({savesPath: '', setSavesPath: onSetSavePath});

    const selectSavePath = getByTestId('selectSavePath');

    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: []});
    fireEvent.click(selectSavePath);
    await waitFor(() => expect(onSetSavePath).toBeCalledWith(''));

    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: ['new/save/path']});
    fireEvent.click(selectSavePath);
    await waitFor(() => expect(onSetSavePath).toBeCalledWith('new/save/path'));
  })

  test('remove save path invoke setSavePath with empty path', async () => {
    const onSetSavePath = jest.fn();
    const { getByTestId } = await renderSyncSaves({setSavesPath: onSetSavePath});
    expect(onSetSavePath).toBeCalledWith('savesPath');
    const removeSavePath = getByTestId('removeSavePath');

    fireEvent.click(removeSavePath);
    await waitFor(() => expect(onSetSavePath).toBeCalledWith(''));
  })

  test('change sync type invokes setSyncType', async () => {
    const { getByTestId } = await renderSyncSaves();

    const selectSyncType = getByTestId('selectSyncType');
    expect(selectSyncType).toHaveValue('setting.manualsync.download');

    fireEvent.change(selectSyncType, { target: { value: 'setting.manualsync.upload'}});
    expect(selectSyncType).toHaveValue('setting.manualsync.upload');
  })

  test('click sync button works', async () => {
    const { getByTestId } = await renderSyncSaves();

    const setSync = getByTestId('setSync');

    ipcRenderer.invoke.mockResolvedValueOnce({user: 'user'}).mockResolvedValueOnce('success');
    remote.dialog.showMessageBox.mockResolvedValueOnce({});
    fireEvent.click(setSync);
    expect(setSync).toHaveTextContent('setting.manualsync.syncing')
    await waitFor(() => expect(setSync).toHaveTextContent('setting.manualsync.sync'));
    expect(ipcRenderer.invoke).toBeCalledWith('getUserInfo');
    expect(remote.dialog.showMessageBox).toBeCalledWith({'message': 'success', 'title': 'Saves Sync'});
  })

  test('toggle auto sync invokes setAutoSyncSaves', async () => {
    const onSetAutoSyncSaves = jest.fn();
    const { getByTestId } = await renderSyncSaves({setAutoSyncSaves: onSetAutoSyncSaves});

    const toggleAutoSyncSaves = getByTestId('toggleSwitch');
    expect(toggleAutoSyncSaves).not.toBeChecked();
    fireEvent.click(toggleAutoSyncSaves);
    expect(onSetAutoSyncSaves).toBeCalledWith(true);
  })
})
