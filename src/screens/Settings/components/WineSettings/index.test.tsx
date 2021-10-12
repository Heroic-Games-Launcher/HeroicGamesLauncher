import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { WineInstallation } from 'src/types';
import { ipcRenderer } from 'src/test_helpers/mock/electron';
import { resetTestTypes, test_opendialog, test_wineinstallations } from 'src/test_helpers/testTypes';
import WineSettings from './index';

interface Props {
  altWine: WineInstallation[]
  autoInstallDxvk: boolean
  customWinePaths: string[]
  isDefault: boolean
  maxSharpness: number
  enableFSR: boolean
  enableEsync: boolean
  enableFsync: boolean
  enableResizableBar: boolean
  setAltWine: (altWine: WineInstallation[]) => void
  setCustomWinePaths: (value: string[]) => void
  setWineCrossoverBottle: (value: string) => void
  setWinePrefix: (value: string) => void
  setWineVersion: (wine: WineInstallation) => void
  setFsrSharpness: (value: number) => void
  toggleAutoInstallDxvk: () => void
  toggleFSR: () => void
  toggleResizableBar: () => void
  toggleEsync: () => void
  toggleFsync: () => void
  wineCrossoverBottle: string
  winePrefix: string
  wineVersion: WineInstallation
}

function renderWineSettings(props: Partial<Props> = {})
{
  const defaultProps: Props = {
    altWine: test_wineinstallations.get(),
    autoInstallDxvk: false,
    customWinePaths: ['custom/wine/path'],
    enableFSR: false,
    enableEsync: false,
    enableFsync: false,
    isDefault: false,
    maxSharpness: 5,
    enableResizableBar: false,
    setAltWine: () => {return;},
    setCustomWinePaths: () => {return;},
    setWineCrossoverBottle: () => {return;},
    setWinePrefix: () => {return;},
    setWineVersion: () => {return;},
    setFsrSharpness: () => {return;},
    toggleAutoInstallDxvk: () => {return;},
    toggleFSR: () => {return;},
    toggleResizableBar: () => {return;},
    toggleEsync: () => {return;},
    toggleFsync: () => {return;},
    wineCrossoverBottle: 'bottle',
    winePrefix: 'winePrefix',
    wineVersion: {
      bin: 'path/to/wine/bin',
      name: 'wine'
    }
  }

  return render(<WineSettings {...{...defaultProps, ...props}} />);
}

describe('WineSettings', () => {
  beforeEach(() => {
    resetTestTypes();
  })

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

  test('add empty wine prefix invokes setWinePrefix with the current winePrefix set', async () => {
    const onSetWinePrefix = jest.fn();
    const { getByTestId } = renderWineSettings({setWinePrefix: onSetWinePrefix});
    const addWinePrefix = getByTestId('addWinePrefix');
    test_opendialog.set({path: ''});
    fireEvent.click(addWinePrefix);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.choose',
        'properties': ['openDirectory'],
        'title': 'box.wineprefix'
      }));
    expect(onSetWinePrefix).toBeCalledWith('winePrefix')
  })

  test('add valid wine prefix invokes setWinePrefix with path', async () => {
    const onSetWinePrefix = jest.fn();
    const { getByTestId } = renderWineSettings({setWinePrefix: onSetWinePrefix});
    const addWinePrefix = getByTestId('addWinePrefix');
    test_opendialog.set({path: 'new/prefix/path'});
    fireEvent.click(addWinePrefix);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.choose',
        'properties': ['openDirectory'],
        'title': 'box.wineprefix'
      }));
    expect(onSetWinePrefix).toBeCalledWith('new/prefix/path')
  })

  test('select wine prefix search path invokes setSelectPath', async () => {
    const { getByTestId } = renderWineSettings({isDefault: true});
    const selectWinePath = getByTestId('selectWinePath');
    expect(selectWinePath).toHaveValue(undefined);
    fireEvent.change(selectWinePath, { target: { value: 'custom/wine/path'}});
    await waitFor(() => expect(selectWinePath).toHaveValue('custom/wine/path'));
  })

  test('remove last wine prefix search path invokes removeCustomPath with empty path', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({isDefault: true, setCustomWinePaths: onSetCustomWinePaths});
    const removeWinePath = getByTestId('removeWinePath');
    const selectWinePath = getByTestId('selectWinePath');

    expect(selectWinePath).toHaveValue(undefined);
    fireEvent.change(selectWinePath, { target: { value: 'custom/wine/path'}});
    await waitFor(() => expect(selectWinePath).toHaveValue('custom/wine/path'));

    fireEvent.click(removeWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith([]));
  })

  test('remove not last wine prefix search path invokes removeCustomPath with remaining paths', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({
      customWinePaths: ['custom/wine/path', 'remainingWinePaths'],
      isDefault: true,
      setCustomWinePaths: onSetCustomWinePaths});
    const removeWinePath = getByTestId('removeWinePath');
    const selectWinePath = getByTestId('selectWinePath');

    expect(selectWinePath).toHaveValue(undefined);
    fireEvent.change(selectWinePath, { target: { value: 'custom/wine/path'}});
    await waitFor(() => expect(selectWinePath).toHaveValue('custom/wine/path'));

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

    test_opendialog.set({ path: ''});
    fireEvent.click(addWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith([]));
    expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.choose',
        'properties': ['openFile'],
        'title': 'box.customWine'
      });

    test_opendialog.set({ path: 'new/wine/path'});
    fireEvent.click(addWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith(['new/wine/path']));
    expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.choose',
        'properties': ['openFile'],
        'title': 'box.customWine'
      }
    );
  })

  test('add valid custom wine path invokes setCustomWinePath with path', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({
      customWinePaths: [],
      isDefault: true,
      setCustomWinePaths: onSetCustomWinePaths});
    const addWinePath = getByTestId('addWinePath');

    test_opendialog.set({ path: 'new/wine/path'});
    fireEvent.click(addWinePath);
    await waitFor(() => expect(onSetCustomWinePaths).toBeCalledWith(['new/wine/path']));
    expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.choose',
        'properties': ['openFile'],
        'title': 'box.customWine'
      }
    );
  })

  test('add already existing custom wine path does not invoke setCustomWinePath', async () => {
    const onSetCustomWinePaths = jest.fn();
    const { getByTestId } = renderWineSettings({
      isDefault: true,
      setCustomWinePaths: onSetCustomWinePaths});
    const addWinePath = getByTestId('addWinePath');

    test_opendialog.set({path: 'custom/wine/path'})
    fireEvent.click(addWinePath);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.choose',
        'properties': ['openFile'],
        'title': 'box.customWine'
      }
    ));
    expect(onSetCustomWinePaths).not.toBeCalled();
  })

  test('change wine version invokes setWineVersion', async () => {
    const onSetWineVersion = jest.fn();
    const { getByTestId } = renderWineSettings({setWineVersion: onSetWineVersion});
    const setWineVersion = getByTestId('setWineVersion');

    fireEvent.change(setWineVersion, {target: {value: 'wine'}});
    await waitFor(() => expect(onSetWineVersion).toBeCalledWith({'bin': 'path/to/wine/bin', 'name': 'wine'}));
  })

  test('If multiple wines are installed setWineVersion is not invoked by useEffect', async () => {
    const onSetWineVersion = jest.fn();

    test_wineinstallations.set([
      {
        bin: 'wine1/bin',
        name: 'wine1'
      },
      {
        bin: 'wine2/bin',
        name: 'wine2'
      }])

    renderWineSettings({setWineVersion: onSetWineVersion});

    await waitFor(() => expect(onSetWineVersion).not.toBeCalled());
  })

  test('esync toggle triggers correct function upon click', async () => {
    const toggleEsync = jest.fn();
    const { getByTestId } = renderWineSettings({ toggleEsync: toggleEsync });
    const esyncToggle = getByTestId('esyncToggle');
    fireEvent.click(esyncToggle);

    await waitFor(() => expect(toggleEsync).toBeCalled());
  })

  test('fsync toggle triggers correct function upon click', async () => {
    const toggleFsync = jest.fn();
    const { getByTestId } = renderWineSettings({ toggleFsync: toggleFsync });
    const fsyncToggle = getByTestId('fsyncToggle');
    fireEvent.click(fsyncToggle);

    await waitFor(() => expect(toggleFsync).toBeCalled());
  })
})
