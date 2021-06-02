import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { ipcRenderer, remote } from 'src/test_helpers/mock/electron';
import GeneralSettings from './index';

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
    darkTrayIcon: boolean
    defaultInstallPath: string
    egsLinkedPath: string
    egsPath: string
    exitToTray: boolean
    language: string
    maxWorkers: number
    setDefaultInstallPath: (value: string) => void
    setEgsLinkedPath: (value: string) => void
    setEgsPath: (value: string) => void
    setLanguage: (value: string) => void
    setMaxWorkers: (value: number) => void
    toggleDarkTrayIcon: () => void
    toggleTray: () => void
  }

async function renderGeneralSettings(props: Partial<Props> = {})
{
  const defaultprops: Props = {
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
    toggleDarkTrayIcon: () => {return;},
    toggleTray: () => {return;}
  };
  ipcRenderer.invoke.mockReturnValueOnce(props.maxWorkers || defaultprops.maxWorkers);
  const returnvalue = await render(<GeneralSettings {...{...defaultprops, ...props}} />);
  expect(ipcRenderer.invoke).toBeCalledWith('getMaxCpus');
  return returnvalue;
}

describe('GeneralSettings', () => {
  test('renders', async () => {
    return await renderGeneralSettings();
  })

  test('change default install path', async () => {
    const onSetDefaultInstallPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings({setDefaultInstallPath: onSetDefaultInstallPath});
    const installPathInput = getByTestId('setinstallpath');
    fireEvent.change(installPathInput, {target: { value: 'new/install/path'}});
    expect(onSetDefaultInstallPath).toBeCalledWith('new/install/path');

    remote.dialog.showOpenDialog.mockImplementationOnce(() => Promise.resolve({filePaths: ['another/install/path']}));
    const installPathButton = getByTestId('setinstallpathbutton');
    fireEvent.click(installPathButton);
    await waitFor(() => expect(onSetDefaultInstallPath).toBeCalledWith('another/install/path'));

    remote.dialog.showOpenDialog.mockImplementationOnce(() => Promise.resolve({filePaths: []}));
    fireEvent.click(installPathButton);
    await waitFor(() => expect(onSetDefaultInstallPath).toBeCalledWith(''));
  })

  test('change epic sync path', async () => {
    const onSetEgsPath = jest.fn();
    const { getByTestId } = await renderGeneralSettings({egsLinkedPath: '', egsPath: '', setEgsPath: onSetEgsPath});
    const syncPathInput = getByTestId('setEpicSyncPath');
    fireEvent.change(syncPathInput, {target: { value: 'new/sync/path'}});
    await waitFor(() => expect(onSetEgsPath).toBeCalledWith('new/sync/path'));

    remote.dialog.showOpenDialog.mockImplementationOnce(() => Promise.resolve({filePaths: ['another/sync/path']}));
    const syncPathButton = getByTestId('setEpicSyncPathButton');
    fireEvent.click(syncPathButton);
    await waitFor(() => expect(onSetEgsPath).toBeCalledWith('another/sync/path'));

    remote.dialog.showOpenDialog.mockImplementationOnce(() => Promise.resolve({filePaths: []}));
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

    remote.dialog.showOpenDialog.mockImplementationOnce(() => Promise.resolve({filePaths: ['another/sync/path']}));
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

    ipcRenderer.invoke.mockResolvedValueOnce('Success');
    fireEvent.click(syncButton);
    await waitFor(() => expect(remote.dialog.showMessageBox).toBeCalledWith({'message': 'message.sync', 'title': 'EGS Sync'}));
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

    ipcRenderer.invoke.mockResolvedValueOnce('Error');
    fireEvent.click(syncButton);
    await waitFor(() => expect(remote.dialog.showErrorBox).toBeCalledWith('box.error', 'box.sync.error'));
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

    ipcRenderer.invoke.mockResolvedValueOnce({});
    fireEvent.click(syncButton);
    await waitFor(() => expect(remote.dialog.showMessageBox).toBeCalledWith({'message': 'message.unsync', 'title': 'EGS Sync'}));
    expect(onSetegsLinkedPath).toBeCalledWith('');
    expect(onSetEgsPath).toBeCalledWith('');
  })

  test('change language', async () => {
    const onSetLanguage = jest.fn();
    const { getByTestId } = await renderGeneralSettings({ setLanguage: onSetLanguage});
    const languageSelector = getByTestId('languageSelector');

    fireEvent.change(languageSelector, { target: { value: 'de' }});
    expect(ipcRenderer.send).toBeCalledWith('changeLanguage', 'de');
    expect(onSetLanguage).toBeCalledWith('de');
  })

  test('change max workers', async () => {
    const onSetMaxWorkers = jest.fn();
    const { getByTestId } = await renderGeneralSettings({ setMaxWorkers: onSetMaxWorkers});
    const maxWorkers = getByTestId('setMaxWorkers');

    fireEvent.change(maxWorkers, { target: { value: '8' }});
    waitFor(() => expect(onSetMaxWorkers).toBeCalledWith(8));
  })
})
