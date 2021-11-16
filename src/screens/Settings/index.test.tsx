import React from 'react';

import {
  render,
  waitFor
} from '@testing-library/react';

import { Route, Router} from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ipcRenderer } from 'src/test_helpers/mock/electron';
import { resetTestTypes, test_appsettings, test_context, test_game } from 'src/test_helpers/testTypes';
import ContextProvider from 'src/state/ContextProvider';
import Settings from './index';


async function renderSettings(type = 'game', gamecard = false)
{
  const history = createMemoryHistory();
  history.push({pathname: '/settings/' + test_game.get().app_name + '/' + type, state: {fromGameCard: gamecard}});
  const returnvalue =  await waitFor(() => render(
    <Router history={history}>
      <ContextProvider.Provider value={test_context.get()}>
        <Route path='/settings/:appName/:type' component={Settings}/>
      </ContextProvider.Provider>
    </Router>
  ));
  return {history, ...returnvalue};
}

describe('Settings', () => {
  beforeEach(() => {
    resetTestTypes();
  })

  test('renders', async () => {
    await renderSettings();
  })

  test('renders if appsettings are mostly empty', async () => {
    test_appsettings.set({
      customWinePaths: undefined,
      egsLinkedPath: '',
      maxWorkers: undefined,
      savesPath: ''
    });
    await renderSettings();
  })

  test('does not invokes ipcRenderer get game info if game is not known', async () => {
    test_game.set({app_name: 'default'});
    await renderSettings();
    await waitFor(() =>expect(ipcRenderer.invoke).not.toBeCalledWith('getGameInfo', 'default'));
  })

  test('renders link to cloud save if enabled', async () => {
    test_game.set({cloud_save_enabled: true});
    const { getByTestId } = await renderSettings();
    const linkSync = await waitFor(() => getByTestId('linkSync'));
    expect(linkSync).toHaveTextContent('settings.navbar.sync');
  })

  test('renders general settings if type is general', async () => {
    const { getByTestId } = await renderSettings('general');
    await waitFor(() => getByTestId('generalSettings'));
  })

  test('renders wine and tools settings if type is wine', async () => {
    const { getByTestId } = await renderSettings('wine');
    await waitFor(() => getByTestId('wineSettings'));
    await waitFor(() => getByTestId('toolsSettings'));
  })

  test('renders other settings if type is other', async () => {
    const { getByTestId } = await renderSettings('other');
    await waitFor(() => getByTestId('otherSettings'));
  })

  test('renders sync settings if type is sync', async () => {
    const { getByTestId } = await renderSettings('sync');
    await waitFor(() => getByTestId('syncSettings'));
  })

})
