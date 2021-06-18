import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { initElectronMocks, ipcRenderer } from 'src/test_helpers/mock/electron';
import { resetTestTypes, test_egssync_response, test_opendialog } from 'src/test_helpers/testTypes';
import GeneralSettings from './index';

interface Props {
  addDesktopShortcuts: boolean,
  addGamesToStartMenu: boolean,
  darkTrayIcon: boolean,
  defaultInstallPath: string,
  egsLinkedPath: string,
  egsPath: string,
  exitToTray: boolean,
  language: string,
  maxWorkers: number,
  setDefaultInstallPath: (value: string) => void,
  setEgsLinkedPath: (value: string) => void,
  setEgsPath: (value: string) => void,
  setLanguage: (value: string) => void,
  setMaxWorkers: (value: number) => void,
  toggleAddDesktopShortcuts: () => void,
  toggleAddGamesToStartMenu: () => void,
  toggleDarkTrayIcon: () => void,
  toggleTray: () => void
  }

async function renderGeneralSettings(props: Partial<Props> = {})
{
  const defaultprops: Props = {
    addDesktopShortcuts: true,
    addGamesToStartMenu: true,
    darkTrayIcon: false,
    defaultInstallPath: 'defaultInstallPath',
    egsLinkedPath: 'egsLinkedPath',
    egsPath: 'egsPath',
    exitToTray: false,
    language: 'en',
    maxWorkers: 1,
    setDefaultInstallPath: (value: string) => value,
    setEgsLinkedPath: (value: string) => value,
    setEgsPath: (value: string) => value,
    setLanguage: (value: string) => value,
    setMaxWorkers: (value: number) => value,
    toggleAddDesktopShortcuts: () => {return},
    toggleAddGamesToStartMenu: () => {return},
    toggleDarkTrayIcon: () => {return;},
    toggleTray: () => {return;}
  };
  const returnvalue = await render(<GeneralSettings {...{...defaultprops, ...props}} />);
  expect(ipcRenderer.invoke).toBeCalledWith('getMaxCpus');
  return returnvalue;
}

describe('GeneralSettings', () => {
  beforeEach(() => {
    resetTestTypes();
    initElectronMocks();
  })

  test('renders', async () => {
    return await renderGeneralSettings();
  })

  test('change default install path', async () => {
    const onSetDefaultInstallPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings({setDefaultInstallPath: onSetDefaultInstallPath});
    const installPathInput = getByTestId('setinstallpath');
    fireEvent.change(installPathInput, {target: { value: 'new/install/path'}});
    expect(onSetDefaultInstallPath).toBeCalledWith('new/install/path');

    test_opendialog.set({path: 'another/install/path'});
    const installPathButton = getByTestId('setinstallpathbutton');
    fireEvent.click(installPathButton);
    await waitFor(() => expect(onSetDefaultInstallPath).toBeCalledWith('\'another/install/path\''));

    test_opendialog.set({path: ''});
    fireEvent.click(installPathButton);
    await waitFor(() => expect(onSetDefaultInstallPath).toBeCalledWith(''));
  })

  test('change epic sync path', async () => {
    const onSetEgsPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings({egsLinkedPath: '', egsPath: '', setEgsPath: onSetEgsPath});
    const syncPathInput = getByTestId('setEpicSyncPath');
    fireEvent.change(syncPathInput, {target: { value: 'new/sync/path'}});
    await waitFor(() => expect(onSetEgsPath).toBeCalledWith('new/sync/path'));

    test_opendialog.set({path: 'another/sync/path'});
    const syncPathButton = getByTestId('setEpicSyncPathButton');
    fireEvent.click(syncPathButton);
    await waitFor(() => expect(onSetEgsPath).toBeCalledWith('\'another/sync/path\''));

    test_opendialog.set({path: ''});
    fireEvent.click(syncPathButton);
    await waitFor(() => expect(onSetEgsPath).toBeCalledWith(''));

    await renderGeneralSettings({egsLinkedPath: '', egsPath: 'old/path', setEgsPath: onSetEgsPath});
    const syncPathBackspace = getByTestId('setEpicSyncPathBackspace');
    fireEvent.click(syncPathBackspace);
    await waitFor(() => expect(onSetEgsPath).toBeCalledWith(''));

    expect(onSetEgsPath).toBeCalledTimes(4);
  })

  test('change epic sync path not working if linked', async () => {
    const onSetEgsPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings({egsLinkedPath: 'linked/path', egsPath: '', setEgsPath: onSetEgsPath});
    const syncPathInput = getByTestId('setEpicSyncPath');
    expect(syncPathInput).toBeDisabled();
    fireEvent.change(syncPathInput, {target: { value: 'new/sync/path'}});
    await waitFor(() => expect(syncPathInput).toHaveValue('linked/path'));

    test_opendialog.set({path: 'another/sync/path'});
    const syncPathButton = getByTestId('setEpicSyncPathButton');
    fireEvent.click(syncPathButton);
    await waitFor(() => expect(onSetEgsPath).not.toBeCalledWith('another/sync/path'));
    await waitFor(() => expect(onSetEgsPath).not.toBeCalledTimes(2));

    await renderGeneralSettings({egsLinkedPath: 'linked/path', egsPath: 'linked/path', setEgsPath: onSetEgsPath});
    const syncPathBackspace = getByTestId('setEpicSyncPathBackspace');
    fireEvent.click(syncPathBackspace);
    await waitFor(() => expect(onSetEgsPath).not.toBeCalledWith(''));
    await waitFor(() => expect(onSetEgsPath).not.toBeCalledTimes(2));
  })

  test('sync succesfully with epic path', async () => {
    const onSetegsLinkedPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings(
      {
        egsLinkedPath: '',
        egsPath: 'path/to/sync',
        setEgsLinkedPath: onSetegsLinkedPath
      });
    const syncButton = getByTestId('syncButton');

    fireEvent.click(syncButton);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith('openMessageBox', {'message': 'message.sync', 'title': 'EGS Sync'}));
    expect(() => expect(ipcRenderer.invoke).toBeCalledWith('egsSync', 'unlink'));
    expect(onSetegsLinkedPath).toBeCalledWith('path/to/sync');
  })

  test('sync fails with epic path', async () => {
    const onSetegsLinkedPath = jest.fn();
    const onSetEgsPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings(
      {
        egsLinkedPath: '',
        egsPath: 'path/to/sync',
        setEgsLinkedPath: onSetegsLinkedPath,
        setEgsPath: onSetEgsPath
      });
    const syncButton = getByTestId('syncButton');

    test_egssync_response.set('Error');
    fireEvent.click(syncButton);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith('showErrorBox', {'content': 'box.sync.error', 'title': 'box.error'}));
    expect(onSetegsLinkedPath).toBeCalledWith('');
    expect(onSetEgsPath).toBeCalledWith('');
  })

  test('unlink synced epic path', async () => {
    const onSetegsLinkedPath = jest.fn();
    const onSetEgsPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings(
      {
        egsLinkedPath: 'synced/path',
        egsPath: 'synced/path',
        setEgsLinkedPath: onSetegsLinkedPath,
        setEgsPath: onSetEgsPath
      });
    const syncButton = getByTestId('syncButton');

    fireEvent.click(syncButton);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith('openMessageBox', {'message': 'message.unsync', 'title': 'EGS Sync'}));
    expect(onSetegsLinkedPath).toBeCalledWith('');
    expect(onSetEgsPath).toBeCalledWith('');
  })

  test('change language', async () => {
    const onSetLanguage = jest.fn();
    const { getByTestId } = await renderGeneralSettings({ setLanguage: onSetLanguage});
    const languageSelector = getByTestId('languageSelector');
    const buttonWeblate = getByTestId('buttonWeblate');

    fireEvent.change(languageSelector, { target: { value: 'de' }});
    expect(ipcRenderer.send).toBeCalledWith('changeLanguage', 'de');
    expect(onSetLanguage).toBeCalledWith('de');

    fireEvent.click(buttonWeblate);
    expect(ipcRenderer.send).toBeCalledWith('openWeblate');
  })

  test('change max workers', async () => {
    const onSetMaxWorkers = jest.fn();
    const { getByTestId } = await renderGeneralSettings({ setMaxWorkers: onSetMaxWorkers});
    const maxWorkers = getByTestId('setMaxWorkers');

    fireEvent.change(maxWorkers, { target: { value: '8' }});
    waitFor(() => expect(onSetMaxWorkers).toBeCalledWith(8));
  })
})
