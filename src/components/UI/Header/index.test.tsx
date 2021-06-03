import '@testing-library/jest-dom'
import React from 'react';

import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  fireEvent,
  render
} from '@testing-library/react';


import { ContextType } from 'src/types';
import { game, plugin } from 'src/test_helpers/testDefaultVariables';
import ContextProvider from 'src/state/ContextProvider';
import Header from './index';

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

interface Props {
  goTo: string,
  numberOfGames: number,
  renderBackButton: boolean,
  title: string
}

// helper to render with specific props
function getHeader(props: Partial<{ args: Partial<Props>, context: Partial<ContextType> }> = {}) {
  const defaultContext: ContextType = {
    category: 'games',
    data: [],
    error: false,
    filter: 'all',
    gameUpdates: [],
    handleCategory: () => { return; },
    handleFilter: () => { return; },
    handleGameStatus: () => Promise.resolve(),
    handleLayout: () => { return; },
    handleSearch: () => { return; },
    layout: 'grid',
    libraryStatus: [],
    platform: 'linux',
    refresh: () => Promise.resolve(),
    refreshLibrary: () => Promise.resolve(),
    refreshing: false,
    user: 'user'
  };
  const defaultArgs: Props = {
    goTo: '/',
    numberOfGames: 0,
    renderBackButton: false,
    title: 'title'
  };

  return (
    <ContextProvider.Provider value={{...defaultContext, ...props.context}}>
      <Header {...{...defaultArgs, ...props.args}} />
    </ContextProvider.Provider>);
}

describe('Header', () => {

  test('renders', () => {
    render(getHeader());
  })

  test('renders back button and switch to goTo on click', () => {
    const history = createMemoryHistory();
    const { getByRole } = render(<Router history={history}> {getHeader({args: { goTo: '/link', renderBackButton: true }})}</Router>);
    const returnLink = getByRole('link');
    expect(history.location.pathname).toBe('/');
    fireEvent.click(returnLink);
    expect(history.location.pathname).toBe('/link');
  })

  test('renders back button and call goBack on click if goTo is empty', () => {
    const history = createMemoryHistory();
    const { getByRole } = render(<Router history={history}> {getHeader({args: { goTo: '', renderBackButton: true }})}</Router>);
    const returnLink = getByRole('link');
    expect(history.location.pathname).toBe('/');
    fireEvent.click(returnLink);
    expect(history.location.pathname).toBe('/');
  })

  test('shows title', () => {
    const { getByTestId } = render(getHeader({args: { title: 'Test Title' }}));
    const title = getByTestId('headerTitle');
    expect(title).toHaveTextContent('Test Title');
  })

  test('shows number of games', () => {

    // no games found
    const { rerender, getByTestId } = render(getHeader());
    let totalGames = getByTestId('totalGamesText');
    expect(totalGames).toHaveTextContent('nogames');

    // games found
    rerender(getHeader({ args: { numberOfGames: 12345 }}));
    totalGames = getByTestId('totalGamesText');
    expect(totalGames).toHaveTextContent('Total Games: 12345');
  })

  test('filtering games works', () => {
    const context = {
      data: [game, plugin],
      filter: 'all',
      gameUpdates: [plugin.app_name],
      handleFilter: jest.fn(),
      libraryStatus: [{
        appName: game.app_name,
        status: 'installing' as const
      },
      {
        appName: plugin.app_name,
        status: 'updating' as const
      }]
    }

    const { rerender, getByTestId } = render(getHeader({ context: context }));

    const filters = ['all', 'installed', 'uninstalled', 'downloading', 'updates'];

    // check that each filter entry for games is working.
    // Fixme: how we can avoid the rerender and wait for the useContext rerender trigger ?
    filters.forEach((value) => {
      context.filter = value;
      rerender(getHeader({ context: context }));
      const filter = getByTestId(value);
      fireEvent.click(filter);
      expect(filter).toHaveClass('selected');
      expect(context.handleFilter).toBeCalledWith(value);
    });
  })

  test('filtering unreal works', () => {
    const context = {
      category: 'unreal',
      filter: 'all',
      handleFilter: jest.fn()
    }

    const { rerender, getByTestId } = render(getHeader({ context: context }));

    const filters = ['unreal', 'asset', 'plugin', 'project'];

    // check that each filter entry for unreal is working.
    // Fixme: how we can avoid the rerender and wait for the useContext rerender trigger ?
    filters.forEach((value) => {
      context.filter = value;
      rerender(getHeader({ context: context }));
      const filter = getByTestId(value);
      fireEvent.click(filter);
      expect(filter).toHaveClass('selected');
      expect(context.handleFilter).toBeCalledWith(value);
    });
  })

  test('selecting unreal version works', () => {
    const context = {
      category: 'unreal',
      filter: 'UE_',
      handleFilter: jest.fn(),
      layout: 'grid'
    }

    const { getByTestId } = render(getHeader({ context: context }));
    const ueVersionSelect = getByTestId('ueVersionSelect');
    fireEvent.change(ueVersionSelect, { target: { value: 'UE_4.17' } });
    expect(context.handleFilter).toBeCalledWith('UE_4.17');
  })

  test('layout works', () => {
    const context = {
      category: 'games',
      handleLayout: jest.fn(),
      layout: 'grid'
    }

    const { rerender, getByTestId } = render(getHeader({ context: context }));

    let selectLayoutGrid = getByTestId('grid');
    let selectLayoutList = getByTestId('list');

    // trigger grid layout
    fireEvent.click(selectLayoutGrid);
    expect(context.handleLayout).toBeCalledWith('grid');
    expect(selectLayoutGrid).toHaveClass('MuiSvgIcon-root selectedLayout material-icons', { exact: true });
    expect(selectLayoutList).toHaveClass('MuiSvgIcon-root material-icons', { exact: true });

    //Fixme: wait for useContext to rerender.
    context.layout = 'list';
    rerender(getHeader({ context: context }));

    // trigger list layout
    selectLayoutGrid = getByTestId('grid');
    selectLayoutList = getByTestId('list');
    fireEvent.click(selectLayoutList);
    expect(context.handleLayout).toBeCalledWith('list');
    expect(selectLayoutGrid).toHaveClass('MuiSvgIcon-root material-icons', { exact: true });
    expect(selectLayoutList).toHaveClass('MuiSvgIcon-root selectedLayout material-icons', { exact: true });

  })

  test('category works', () => {
    const context = {
      category: 'games',
      handleCategory: jest.fn()
    }

    const { rerender, getByTestId } = render(getHeader({ context: context }));

    let selectGames = getByTestId('gamesCategory');
    let selectUnreal = getByTestId('unrealCategory');

    // triggering the same category should do nothing
    fireEvent.click(selectGames);
    expect(context.handleCategory).not.toBeCalled();

    // trigger unreal category
    fireEvent.click(selectUnreal);
    expect(selectGames).toHaveClass('selected');
    expect(context.handleCategory).toBeCalledWith('unreal');

    // Fixme: wait for useContext to rerender.
    context.category = 'unreal';
    rerender(getHeader({ context: context }));

    // trigger games category
    selectGames = getByTestId('gamesCategory');
    selectUnreal = getByTestId('unrealCategory');
    fireEvent.click(selectGames);
    expect(selectUnreal).toHaveClass('selected');
    expect(context.handleCategory).toBeCalledWith('games');
  })
})
