import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { WineInstallation } from 'src/types';
import { ipcRenderer } from 'src/test_helpers/mock/electron';
import { resetTestTypes, test_opendialog, test_wineinstallations } from 'src/test_helpers/testTypes';
import Tools from './index';

function renderTools(wineVersion: Partial<WineInstallation> = {}, winePrefix = 'winePrefix')
{
  return render(
    <Tools winePrefix={ winePrefix } wineVersion={{...test_wineinstallations.get()[0], ...wineVersion}}/>);
}

describe('Tools', () => {
  beforeEach(() => {
    resetTestTypes();
  })

  test('renders', async () => {
    renderTools();
  })

  test('click on winecfg invokes ipcRenderer', () => {
    const { getByTestId } = renderTools();
    const wineCFG = getByTestId('wineCFG');
    fireEvent.click(wineCFG);
    expect(ipcRenderer.invoke).toBeCalledWith('callTool', {'exe': undefined, 'prefix': 'winePrefix', 'tool': 'winecfg', 'wine': 'path/to/wine/bin'});
  })

  test('click on winetricks invokes ipcRenderer', () => {
    const { getByTestId } = renderTools();
    const wineTricks = getByTestId('wineTricks');
    fireEvent.click(wineTricks);
    expect(ipcRenderer.invoke).toBeCalledWith('callTool', {'exe': undefined, 'prefix': 'winePrefix', 'tool': 'winetricks', 'wine': 'path/to/wine/bin'});
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
    expect(ipcRenderer.invoke).toBeCalledWith(
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
    test_opendialog.set({path: ''});
    fireEvent.click(toolsDrag);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.select',
        'filters': [{'extensions': ['exe', 'msi'], 'name': 'Binaries'}],
        'properties': ['openFile'],
        'title': 'box.runexe.title'}));
    expect(ipcRenderer.send).not.toBeCalled();
  })

  test('click on drag invokes ipcRenderer', async () => {
    const { getByTestId } = renderTools();
    const toolsDrag = getByTestId('toolsDrag');
    test_opendialog.set({path: 'file.exe'});
    fireEvent.click(toolsDrag);
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith(
      'openDialog',
      {
        'buttonLabel': 'box.select',
        'filters': [{'extensions': ['exe', 'msi'], 'name': 'Binaries'}],
        'properties': ['openFile'],
        'title': 'box.runexe.title'}));
    expect(ipcRenderer.invoke).toBeCalledWith(
      'callTool',
      {'exe': 'file.exe', 'prefix': 'winePrefix', 'tool': 'runExe', 'wine': 'path/to/wine/bin'}
    );
  })
})
