import '@testing-library/jest-dom'
import React from 'react';

import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  fireEvent,
  render
} from '@testing-library/react';


import { ContextType } from 'src/types';
import { game, plugin } from 'src/testDefaultVariables';
import ContextProvider from 'src/state/ContextProvider';
import Header from './index';

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
    context: ContextType,
    goTo: string,
    handleFilter: (value: string) => void,
    handleLayout: (value: string) => void,
    numberOfGames: number,
    renderBackButton: boolean,
    title: string
}

function getHeader(props: Partial<Props> = {}) {
  const defaultProps: Props = {
    context:
        {
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
        },
    goTo: '/',
    handleFilter: () => {return;},
    handleLayout: () => {return;},
    numberOfGames: 0,
    renderBackButton: false,
    title: ''
  };

  return (
    <ContextProvider.Provider value={{ ...defaultProps, ...props }.context}>
      <Header {...{ ...defaultProps, ...props }} />
    </ContextProvider.Provider>);
}

describe('Header', () => {

  test('renders', () => {
    render(getHeader());
  })

  test('renders back button and switch to goTo on click', () => {
    const history = createMemoryHistory();
    const { getByRole } = render(<Router history={history}> {getHeader({goTo: '/link', renderBackButton: true })}</Router>);
    const returnLink = getByRole('link');
    expect(history.location.pathname).toBe('/');
    fireEvent.click(returnLink);
    expect(history.location.pathname).toBe('/link');
  })

  test('renders back button and call goBack on click if goTo is empty', () => {
    const history = createMemoryHistory();
    const { getByRole } = render(<Router history={history}> {getHeader({goTo: '', renderBackButton: true })}</Router>);
    const returnLink = getByRole('link');
    expect(history.location.pathname).toBe('/');
    fireEvent.click(returnLink);
    expect(history.location.pathname).toBe('/');
  })

  test('shows title', () => {
    const { getByTestId } = render(getHeader({ title: 'Test Title' }));
    const title = getByTestId('headerTitle');
    expect(title).toHaveTextContent('Test Title');
  })

  test('shows number of games', () => {
    const { rerender, getByTestId } = render(getHeader());
    let totalGames = getByTestId('totalGamesText');
    expect(totalGames).toHaveTextContent('nogames');

    rerender(getHeader({ numberOfGames: 12345 }));
    totalGames = getByTestId('totalGamesText');
    expect(totalGames).toHaveTextContent('Total Games: 12345');
  })

  test('filtering works', () => {
    const onHandleFilter = jest.fn();

    const context = {
      data: [game, plugin],
      error: false,
      filter: 'all',
      gameUpdates: [plugin.app_name],
      handleFilter: () => null,
      handleGameStatus: () => Promise.resolve(),
      handleLayout: () => null,
      handleSearch: () => null,
      layout: 'grid',
      libraryStatus: [{
        appName: game.app_name,
        status: 'installing' as const
      },
      {
        appName: plugin.app_name,
        status: 'updating' as const
      }],
      refresh: () => Promise.resolve(),
      refreshLibrary: () => Promise.resolve(),
      refreshing: false,
      user: ''
    }

    const { rerender, getByTestId } = render(getHeader({context: context, handleFilter: onHandleFilter}));

    const filters = ['all', 'installed', 'uninstalled', 'downloading', 'updates', 'unreal'];

    filters.forEach((value) => {
      context.filter = value;
      rerender(getHeader({context: context, handleFilter: onHandleFilter}));
      const filter = getByTestId(value);
      fireEvent.click(filter);
      expect(filter).toHaveClass('selected');
      expect(onHandleFilter).toBeCalledWith(value);
    });
  })

  test('layout works', () => {
    const onHandleLayout = jest.fn();

    const context = {
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
    }

    const { rerender, getByTestId } = render(getHeader({handleLayout: onHandleLayout}));

    let selectLayoutGrid = getByTestId('grid');
    let selectLayoutList = getByTestId('list');
    fireEvent.click(selectLayoutGrid);
    expect(onHandleLayout).toBeCalledWith('grid');
    expect(selectLayoutGrid).toHaveClass('MuiSvgIcon-root selectedLayout material-icons', {exact: true});
    expect(selectLayoutList).toHaveClass('MuiSvgIcon-root material-icons', {exact: true});

    context.layout = 'list';
    rerender(getHeader({context: context, handleLayout: onHandleLayout}));

    selectLayoutGrid = getByTestId('grid');
    selectLayoutList = getByTestId('list');
    fireEvent.click(selectLayoutList);
    expect(onHandleLayout).toBeCalledWith('list');
    expect(selectLayoutGrid).toHaveClass('MuiSvgIcon-root material-icons', {exact: true});
    expect(selectLayoutList).toHaveClass('MuiSvgIcon-root selectedLayout material-icons', {exact: true});

  })
})
