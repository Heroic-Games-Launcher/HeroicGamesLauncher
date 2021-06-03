import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { WineInstallation } from 'src/types';
import { remote } from 'src/test_helpers/mock/electron';
import WineSettings from './index';

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
    altWine: WineInstallation[]
    autoInstallDxvk: boolean
    customWinePaths: string[]
    isDefault: boolean
    setAltWine: (altWine: WineInstallation[]) => void
    setCustomWinePaths: (value: string[]) => void
    setWinePrefix: (value: string) => void
    setWineVersion: (wine: WineInstallation) => void
    toggleAutoInstallDxvk: () => void
    winePrefix: string
    wineVersion: WineInstallation
  }

function renderWineSettings(props: Partial<Props> = {})
{
  const defaultProps: Props = {
    altWine: [{
      bin: 'path/to/wine/bin',
      name: 'wine'
    }],
    autoInstallDxvk: false,
    customWinePaths: ['customWinePaths'],
    isDefault: false,
    setAltWine: () => {return;},
    setCustomWinePaths: () => {return;},
    setWinePrefix: () => {return;},
    setWineVersion: () => {return;},
    toggleAutoInstallDxvk: () => {return;},
    winePrefix: 'winePrefix',
    wineVersion: {
      bin: 'path/to/wine/bin',
      name: 'wine'
    }
  }

  return render(<WineSettings {...{...defaultProps, ...props}} />);
}

describe('WineSettings', () => {
  test('renders', () => {
    renderWineSettings();
  })

  test('change wine prefix invokes setWinePrefix', () => {
    const onSetWinePrefix = jest.fn();
    const { getByTestId } = renderWineSettings({setWinePrefix: onSetWinePrefix});
    const inputWinePrefix = getByTestId('selectWinePrefix');
    fireEvent.change(inputWinePrefix, { target: { value: 'newPrefix' }});
    expect(onSetWinePrefix).toBeCalledWith('newPrefix');
  })

  test('add empty wine prefix invokes setWinePrefix with default value', async () => {
    const onSetWinePrefix = jest.fn();
    const { getByTestId } = renderWineSettings({setWinePrefix: onSetWinePrefix});
    const addWinePrefix = getByTestId('addWinePrefix');
    remote.dialog.showOpenDialog.mockResolvedValueOnce({ filePaths: []});
    fireEvent.click(addWinePrefix);
    await waitFor(() => expect(remote.dialog.showOpenDialog).toBeCalledWith(
      {'buttonLabel': 'box.choose',
        'properties': ['openDirectory'],
        'title': 'box.wineprefix'}));
    expect(onSetWinePrefix).toBeCalledWith('~/.wine')
  })

  test('add valid wine prefix invokes setWinePrefix with path', async () => {
    const onSetWinePrefix = jest.fn();
    const { getByTestId } = renderWineSettings({setWinePrefix: onSetWinePrefix});
    const addWinePrefix = getByTestId('addWinePrefix');
    remote.dialog.showOpenDialog.mockResolvedValueOnce({ filePaths: ['newPrefixPath']});
    fireEvent.click(addWinePrefix);
    await waitFor(() => expect(remote.dialog.showOpenDialog).toBeCalledWith(
      {'buttonLabel': 'box.choose',
        'properties': ['openDirectory'],
        'title': 'box.wineprefix'}));
    expect(onSetWinePrefix).toBeCalledWith('newPrefixPath')
  })

  test('select wine prefix search path invokes setSelectPath', async () => {
    const { getByTestId } = renderWineSettings({isDefault: true});
    const selectWinePath = getByTestId('selectWinePath');
    expect(selectWinePath).toHaveValue(undefined);
    fireEvent.change(selectWinePath, { target: { value: 'customWinePaths'}});
    await waitFor(() => expect(selectWinePath).toHaveValue('customWinePaths'));
  })

  test('remove last wine prefix search path invokes removeCustomPath with empty path', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({isDefault: true, setCustomWinePaths: onSetCustomWinePaths});
    const removeWinePath = getByTestId('removeWinePath');
    const selectWinePath = getByTestId('selectWinePath');

    expect(selectWinePath).toHaveValue(undefined);
    fireEvent.change(selectWinePath, { target: { value: 'customWinePaths'}});
    await waitFor(() => expect(selectWinePath).toHaveValue('customWinePaths'));

    fireEvent.click(removeWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith([]));
  })

  test('remove not last wine prefix search path invokes removeCustomPath with remaining paths', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({
      customWinePaths: ['customWinePaths', 'remainingWinePaths'],
      isDefault: true,
      setCustomWinePaths: onSetCustomWinePaths});
    const removeWinePath = getByTestId('removeWinePath');
    const selectWinePath = getByTestId('selectWinePath');

    expect(selectWinePath).toHaveValue(undefined);
    fireEvent.change(selectWinePath, { target: { value: 'customWinePaths'}});
    await waitFor(() => expect(selectWinePath).toHaveValue('customWinePaths'));

    fireEvent.click(removeWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith(['remainingWinePaths']));
  })

  test('add empty custom wine path invokes setCustomWinePath with empty array', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({
      customWinePaths: [],
      isDefault: true,
      setCustomWinePaths: onSetCustomWinePaths});
    const addWinePath = getByTestId('addWinePath');

    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: []});
    fireEvent.click(addWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith([]));
    expect(remote.dialog.showOpenDialog).toBeCalledWith({
      'buttonLabel': 'box.choose',
      'properties': ['openFile'],
      'title': 'box.customWine'});

    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: ['newWinePaths']});
    fireEvent.click(addWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith(['newWinePaths']));
    expect(remote.dialog.showOpenDialog).toBeCalledWith({
      'buttonLabel': 'box.choose',
      'properties': ['openFile'],
      'title': 'box.customWine'});

  })

  test('add valid custom wine path invokes setCustomWinePath with path', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({
      customWinePaths: [],
      isDefault: true,
      setCustomWinePaths: onSetCustomWinePaths});
    const addWinePath = getByTestId('addWinePath');

    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: ['newWinePaths']});
    fireEvent.click(addWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith(['newWinePaths']));
    expect(remote.dialog.showOpenDialog).toBeCalledWith({
      'buttonLabel': 'box.choose',
      'properties': ['openFile'],
      'title': 'box.customWine'});
  })

  test('add already existing custom wine path does not invoke setCustomWinePath', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({
      isDefault: true,
      setCustomWinePaths: onSetCustomWinePaths});
    const addWinePath = getByTestId('addWinePath');

    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: ['customWinePaths']});
    fireEvent.click(addWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).not.toBeCalledWith());
    expect(remote.dialog.showOpenDialog).toBeCalledWith({
      'buttonLabel': 'box.choose',
      'properties': ['openFile'],
      'title': 'box.customWine'});
  })

  test('change wine version invokes setWineVersion', async () => {
    const onSetWineVersion = jest.fn();
    const { getByTestId } = renderWineSettings({setWineVersion: onSetWineVersion});
    const setWineVersion = getByTestId('setWineVersion');

    fireEvent.change(setWineVersion, {target: {value: 'wine'}});
    await waitFor(() => expect(onSetWineVersion).toBeCalledWith({'bin': 'path/to/wine/bin', 'name': 'wine'}));
  })
})
