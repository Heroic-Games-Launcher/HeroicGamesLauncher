import React from 'react';

import {
  fireEvent,
  render,
  waitFor
} from '@testing-library/react';

import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ipcRenderer } from 'src/test_helpers/mock/electron';
import { test_context, test_game } from 'src/test_helpers/testTypes';
import ContextProvider from 'src/state/ContextProvider';
import GameCard from './index';

interface Props {
  appName: string
  cover: string
  coverList: string
  hasUpdate: boolean
  isGame: boolean
  isInstalled: boolean
  logo: string
  size: string
  title: string
  version: string
}

function renderGameCard(props: Partial<Props> = {})
{
  const defaultProps: Props = {
    appName: test_game.get().app_name,
    cover: 'cover',
    coverList: 'coverList',
    hasUpdate: false,
    isGame: false,
    isInstalled: false,
    logo: 'logo',
    size: '100',
    title: 'title',
    version: '1.0.0'
  }

  const history = createMemoryHistory();

  return render(
    <Router history={history}>
      <ContextProvider.Provider value={test_context.get()}>
        <GameCard {... { ...defaultProps, ...props}}/>
      </ContextProvider.Provider>
    </Router>
  );
}

describe('GameCard', () => {
  test('renders', () => {
    renderGameCard();
  })

  test('renders StopIconAlt if status is playing and cancel on click', async () => {
    test_context.set(
      {
        handleGameStatus: jest.fn(),
        libraryStatus: [
          {
            appName: test_game.get().app_name,
            status: 'playing'
          }]
      });

    const { getByTestId } = renderGameCard({ isInstalled: true });
    const renderIcon = getByTestId('renderIcon');
    fireEvent.click(renderIcon);
    await waitFor(() => expect(test_context.get().handleGameStatus)
      .toBeCalledWith({'appName': 'game', 'status': 'done'}));
    await waitFor(() => expect(ipcRenderer.send).toBeCalledWith('kill', 'game'));
  })

  test('renders StopIcon if status is installing and cancel on click', async () => {
    test_context.set(
      {
        handleGameStatus: jest.fn(),
        libraryStatus: [
          {
            appName: test_game.get().app_name,
            status: 'installing'
          }]
      });

    const { getByTestId } = renderGameCard({ isInstalled: true });
    const renderIcon = getByTestId('renderIcon');
    fireEvent.click(renderIcon);
    await waitFor(() => expect(test_context.get().handleGameStatus)
      .toBeCalledWith({'appName': 'game', 'status': 'done'}));
    await waitFor(() => expect(ipcRenderer.send).toBeCalledWith('kill', 'game'));
  })

  test('renders StopIcon if status is updating and cancel on click', async () => {
    test_context.set(
      {
        handleGameStatus: jest.fn(),
        libraryStatus: [
          {
            appName: test_game.get().app_name,
            status: 'updating'
          }]
      });

    const { getByTestId } = renderGameCard({ isInstalled: true });
    const renderIcon = getByTestId('renderIcon');
    fireEvent.click(renderIcon);
    await waitFor(() => expect(test_context.get().handleGameStatus)
      .toBeCalledWith({'appName': 'game', 'status': 'done'}));
    await waitFor(() => expect(ipcRenderer.send).toBeCalledWith('kill', 'game'));
  })

  test('renders PlayIcon if game is installed and launch on click', async () => {
    test_context.set(
      {
        handleGameStatus: jest.fn(),
        libraryStatus: [
          {
            appName: test_game.get().app_name,
            status: 'done'
          }]
      });

    const { getByTestId } = renderGameCard({ isGame: true , isInstalled: true});
    const renderIcon = getByTestId('renderIcon');
    fireEvent.click(renderIcon);
    await waitFor(() => expect(test_context.get().handleGameStatus)
      .toBeCalledWith({'appName': 'game', 'status': 'playing'}));
    await waitFor(() => expect(ipcRenderer.invoke).toBeCalledWith('launch', 'game'));
  })

  test('renders DownIcon if game is not installed and install on click', async () => {
    test_context.set(
      {
        handleGameStatus: jest.fn(),
        libraryStatus: [
          {
            appName: test_game.get().app_name,
            status: 'done'
          }]
      });

    const { getByTestId } = renderGameCard({ isGame: true , isInstalled: false});
    const renderIcon = getByTestId('renderIcon');
    fireEvent.click(renderIcon);
    await waitFor(() => expect(test_context.get().handleGameStatus)
      .toBeCalledWith({'appName': 'game', 'status': 'installing'}));
    await waitFor(() => expect(ipcRenderer.invoke)
      .toBeCalledWith('install', {'appName': 'game', 'path': 'defaultInstallPath'}));
  })

  test('renders no icon if status is moving', () => {
    test_context.set(
      {
        handleGameStatus: jest.fn(),
        libraryStatus: [
          {
            appName: test_game.get().app_name,
            status: 'moving'
          }]
      });

    const { findByTestId } = renderGameCard({ isGame: false , isInstalled: true});
    expect(findByTestId('renderIcon')).resolves.toBeNull;
  })
})
