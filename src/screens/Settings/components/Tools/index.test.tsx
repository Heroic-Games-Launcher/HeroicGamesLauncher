import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { WineInstallation } from 'src/types';
import { ipcRenderer, remote } from 'src/test_helpers/mock/electron';
import Tools from './index';

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

function renderTools(wineVersion: Partial<WineInstallation> = {}, winePrefix = 'winePrefix')
{
  const defaultProps: WineInstallation = {
    bin: 'path/to/wine/bin',
    name: 'wine'
  };
  return render(
    <Tools winePrefix={ winePrefix } wineVersion={{...defaultProps, ...wineVersion}}/>);
}

describe('Tools', () => {
  test('renders', async () => {
    renderTools();
  })

  test('click on winecfg invokes ipcRenderer', () => {
    const { getByTestId } = renderTools();
    const wineCFG = getByTestId('wineCFG');
    fireEvent.click(wineCFG);
    expect(ipcRenderer.send).toBeCalledWith('callTool', {'exe': undefined, 'prefix': 'winePrefix', 'tool': 'winecfg', 'wine': 'path/to/wine/bin'});
  })

  test('click on winetricks invokes ipcRenderer', () => {
    const { getByTestId } = renderTools();
    const wineTricks = getByTestId('wineTricks');
    fireEvent.click(wineTricks);
    expect(ipcRenderer.send).toBeCalledWith('callTool', {'exe': undefined, 'prefix': 'winePrefix', 'tool': 'winetricks', 'wine': 'path/to/wine/bin'});
  })

  test('on drag over works', () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    fireEvent.dragOver(toolsDrag);

  })

  test('on drop catches empty items', () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    fireEvent.drop(toolsDrag, { dataTransfer: {} });
    expect(ipcRenderer.send).not.toBeCalled();
  })

  test('on drop catches invalid files', () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    fireEvent.drop(toolsDrag, {
      dataTransfer: {
        items: [
          {
            getAsFile: () => {return {path: 'file.exe'}},
            kind: 'folder'
          }
        ]
      }
    });
    expect(ipcRenderer.send).not.toBeCalled();
  })

  test('on drop catches incorrect path from GetAsFile', () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    fireEvent.drop(toolsDrag, {
      dataTransfer: {
        items: [
          {
            getAsFile: () => {return;},
            kind: 'file'
          }
        ]
      }
    });
    expect(ipcRenderer.send).not.toBeCalled();
  })

  test('on drop invokes ipcRenderer with correct path', () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    fireEvent.drop(toolsDrag, {
      dataTransfer: {
        items: [
          {
            getAsFile: () => { return {path: 'file.exe'}},
            kind: 'file'
          }
        ]
      }
    });
    expect(ipcRenderer.send).toBeCalledWith(
      'callTool', {
        'exe': 'file.exe',
        'prefix': 'winePrefix',
        'tool': 'runExe',
        'wine': 'path/to/wine/bin'}
    );
  })

  test('click on drag catches empty path', async () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: []});
    fireEvent.click(toolsDrag);
    await waitFor(() => expect(remote.dialog.showOpenDialog).toBeCalledWith(
      {'buttonLabel': 'box.select',
        'filters': [{'extensions': ['exe', 'msi'], 'name': 'Binaries'}],
        'properties': ['openFile'], 'title': 'box.runexe.title'}));
    expect(ipcRenderer.send).not.toBeCalled();
  })

  test('click on drag invokes ipcRenderer', async () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    remote.dialog.showOpenDialog.mockResolvedValueOnce({filePaths: ['file.exe']});
    fireEvent.click(toolsDrag);
    await waitFor(() => expect(remote.dialog.showOpenDialog).toBeCalledWith(
      {'buttonLabel': 'box.select',
        'filters': [{'extensions': ['exe', 'msi'], 'name': 'Binaries'}],
        'properties': ['openFile'], 'title': 'box.runexe.title'}));
    expect(ipcRenderer.send).toBeCalledWith(
      'callTool',
      {'exe': 'file.exe', 'prefix': 'winePrefix', 'tool': 'runExe', 'wine': 'path/to/wine/bin'}
    );
  })
})
