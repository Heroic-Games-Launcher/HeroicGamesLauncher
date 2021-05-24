import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react';

import {ContextType} from 'src/types';
import {
  handleKofi,
  handleQuit,
  openAboutWindow,
  openDiscordLink
} from 'src/helpers';
import { ipcRenderer } from 'electron';
import ContextProvider from 'src/state/ContextProvider';
import UserSelector from './index';

jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      i18n: {
        changeLanguage: () => new Promise(() => { return; })
      },
      t: (str: string) => str
    };
  }
}));

jest.mock('src/helpers', () => ({
  handleKofi: jest.fn(),
  handleQuit: jest.fn(),
  openAboutWindow: jest.fn(),
  openDiscordLink: jest.fn()
}));

function renderUserSelector(props: Partial<ContextType> = {}) {
  const defaultProps: ContextType = {
    data: [],
    error: false,
    filter: 'all',
    gameUpdates: [],
    handleFilter: () => null,
    handleGameStatus: () => Promise.resolve(),
    handleLayout: () => null,
    handleSearch: () => null,
    layout: 'grid',
    libraryStatus: [],
    refresh: () => Promise.resolve(),
    refreshLibrary: () => Promise.resolve(),
    refreshing: false,
    user: ''
  };

  return render(
    <ContextProvider.Provider value={{ ...defaultProps, ...props }}>
      <UserSelector />
    </ContextProvider.Provider>);
}

describe('UserSelector', () => {

  test('render', () => {
    renderUserSelector();
  })

  test('shows correct username', () => {
    const { getByTestId} = renderUserSelector( {user: 'test-user'});
    const userName = getByTestId('userName');
    expect(userName).toHaveTextContent('test-user');
  })

  test('calls refresh library on click', () => {
    const onRefreshLibrary = jest.fn();
    const { getByTestId } = renderUserSelector({ refreshLibrary: onRefreshLibrary});
    const divLibrary = getByTestId('refreshLibrary');
    expect(onRefreshLibrary).not.toBeCalled();
    fireEvent.click(divLibrary);
    expect(onRefreshLibrary).toBeCalledTimes(1);
  })

  test('calls handle kofi on click', () => {
    const { getByTestId } = renderUserSelector();
    const divKofi = getByTestId('handleKofi');
    expect(handleKofi).not.toBeCalled();
    fireEvent.click(divKofi);
    expect(handleKofi).toBeCalledTimes(1);
  })

  test('calls open discord link on click', () => {
    const { getByTestId } = renderUserSelector();
    const divDiscordLink = getByTestId('openDiscordLink');
    expect(openDiscordLink).not.toBeCalled();
    fireEvent.click(divDiscordLink);
    expect(openDiscordLink).toBeCalledTimes(1);
  })

  test('calls open about window on click', () => {
    const { getByTestId } = renderUserSelector();
    const divAboutWindow = getByTestId('openAboutWindow');
    expect(openAboutWindow).not.toBeCalled();
    fireEvent.click(divAboutWindow);
    expect(openAboutWindow).toBeCalledTimes(1);
  })

  test('calls handle logout on click and invoke ipc renderer if user confirm', () => {
    window.confirm = jest.fn().mockImplementation(() => true)

    const { getByTestId } = renderUserSelector();
    const divLogout = getByTestId('handleLogout');
    expect(ipcRenderer.invoke).not.toBeCalled();
    fireEvent.click(divLogout);
    expect(ipcRenderer.invoke).toBeCalledTimes(1);
    expect(ipcRenderer.invoke).toBeCalledWith('logout');
  })

  test("calls handle logout on click and doesn't invoke ipc renderer if user don't confirm", () => {
    window.confirm = jest.fn().mockImplementation(() => false)

    const { getByTestId } = renderUserSelector();
    const divLogout = getByTestId('handleLogout');
    expect(ipcRenderer.invoke).not.toBeCalled();
    fireEvent.click(divLogout);
    expect(ipcRenderer.invoke).not.toBeCalled();
  })

  test('calls handle quit on click', () => {
    const { getByTestId } = renderUserSelector();
    const divQuit = getByTestId('handleQuit');
    expect(handleQuit).not.toBeCalled();
    fireEvent.click(divQuit);
    expect(handleQuit).toBeCalledTimes(1);
  })
})
