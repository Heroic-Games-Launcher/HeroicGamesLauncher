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
        changeLanguage: () => new Promise(() => {return;})
      },
      t: (str: string) => str
    };
  }
}));

interface Props {
    context: ContextType,
    goTo: string,
    handleCategory: () => void,
    handleFilter: () => void,
    handleLayout: () => void,
    numberOfGames: number,
    renderBackButton: boolean,
    title: string
}

// helper to render with specific props
function getHeader(props: Partial<Props> = {}) {
  const defaultProps: Props = {
    context:
        {
          category: 'games',
          data: [],
          error: false,
          filter: 'all',
          gameUpdates: [],
          handleCategory: () => {return;},
          handleFilter: () => {return;},
          handleGameStatus: () => Promise.resolve(),
          handleLayout: () => {return;},
          handleSearch: () => {return;},
          layout: 'grid',
          libraryStatus: [],
          refresh: () => Promise.resolve(),
          refreshLibrary: () => Promise.resolve(),
          refreshing: false,
          user: 'user'
        },
    goTo: '/',
    handleCategory: () => {return;},
    handleFilter: () => {return;},
    handleLayout: () => {return;},
    numberOfGames: 0,
    renderBackButton: false,
    title: 'title'
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

    // no games found
    const { rerender, getByTestId } = render(getHeader());
    let totalGames = getByTestId('totalGamesText');
    expect(totalGames).toHaveTextContent('nogames');

    // games found
    rerender(getHeader({ numberOfGames: 12345 }));
    totalGames = getByTestId('totalGamesText');
    expect(totalGames).toHaveTextContent('Total Games: 12345');
  })

  test('filtering games works', () => {
    const onHandleFilter = jest.fn();

    const context = {
      category: 'games',
      data: [game, plugin],
      error: false,
      filter: 'all',
      gameUpdates: [plugin.app_name],
      handleCategory: () => {return;},
      handleFilter: () => {return;},
      handleGameStatus: () => Promise.resolve(),
      handleLayout: () => {return;},
      handleSearch: () => {return;},
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
      user: 'user'
    }

    const { rerender, getByTestId } = render(getHeader({context: context, handleFilter: onHandleFilter}));

    const filters = ['all', 'installed', 'uninstalled', 'downloading', 'updates'];

    // check that each filter entry for games is working.
    // Fixme: how we can avoid the rerender and wait for the useContext rerender trigger ?
    filters.forEach((value) => {
      context.filter = value;
      rerender(getHeader({context: context, handleFilter: onHandleFilter}));
      const filter = getByTestId(value);
      fireEvent.click(filter);
      expect(filter).toHaveClass('selected');
      expect(onHandleFilter).toBeCalledWith(value);
    });
  })

  test('filtering unreal works', () => {
    const onHandleFilter = jest.fn();

    const context = {
      category: 'unreal',
      data: [game, plugin],
      error: false,
      filter: 'all',
      gameUpdates: [plugin.app_name],
      handleCategory: () => {return;},
      handleFilter: () => {return;},
      handleGameStatus: () => Promise.resolve(),
      handleLayout: () => {return;},
      handleSearch: () => {return;},
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
      user: 'user'
    }

    const { rerender, getByTestId } = render(getHeader({context: context, handleFilter: onHandleFilter}));

    const filters = ['unreal', 'asset', 'plugin', 'project'];

    // check that each filter entry for unreal is working.
    // Fixme: how we can avoid the rerender and wait for the useContext rerender trigger ?
    filters.forEach((value) => {
      context.filter = value;
      rerender(getHeader({context: context, handleFilter: onHandleFilter}));
      const filter = getByTestId(value);
      fireEvent.click(filter);
      expect(filter).toHaveClass('selected');
      expect(onHandleFilter).toBeCalledWith(value);
    });
  })

  test('selecting unreal version works', () => {
    const onHandleFilter = jest.fn();

    const context = {
      category: 'unreal',
      data: [game, plugin],
      error: false,
      filter: 'UE_',
      gameUpdates: [plugin.app_name],
      handleCategory: () => {return;},
      handleFilter: () => {return;},
      handleGameStatus: () => Promise.resolve(),
      handleLayout: () => {return;},
      handleSearch: () => {return;},
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
      user: 'user'
    }

    const { getByTestId } = render(getHeader({context: context, handleFilter: onHandleFilter}));
    const ueVersionSelect = getByTestId('ueVersionSelect');
    fireEvent.change(ueVersionSelect, {target: {value: 'UE_4.17'}});
    expect(onHandleFilter).toBeCalledWith('UE_4.17');
  })

  test('layout works', () => {
    const onHandleLayout = jest.fn();

    const context = {
      category: 'games',
      data: [],
      error: false,
      filter: 'all',
      gameUpdates: [],
      handleCategory: () => {return;},
      handleFilter: () => {return;},
      handleGameStatus: () => Promise.resolve(),
      handleLayout: () => {return;},
      handleSearch: () => {return;},
      layout: 'grid',
      libraryStatus: [],
      refresh: () => Promise.resolve(),
      refreshLibrary: () => Promise.resolve(),
      refreshing: false,
      user: 'user'
    }

    const { rerender, getByTestId } = render(getHeader({handleLayout: onHandleLayout}));

    let selectLayoutGrid = getByTestId('grid');
    let selectLayoutList = getByTestId('list');

    // trigger grid layout
    fireEvent.click(selectLayoutGrid);
    expect(onHandleLayout).toBeCalledWith('grid');
    expect(selectLayoutGrid).toHaveClass('MuiSvgIcon-root selectedLayout material-icons', {exact: true});
    expect(selectLayoutList).toHaveClass('MuiSvgIcon-root material-icons', {exact: true});

    //Fixme: wait for useContext to rerender.
    context.layout = 'list';
    rerender(getHeader({context: context, handleLayout: onHandleLayout}));

    // trigger list layout
    selectLayoutGrid = getByTestId('grid');
    selectLayoutList = getByTestId('list');
    fireEvent.click(selectLayoutList);
    expect(onHandleLayout).toBeCalledWith('list');
    expect(selectLayoutGrid).toHaveClass('MuiSvgIcon-root material-icons', {exact: true});
    expect(selectLayoutList).toHaveClass('MuiSvgIcon-root selectedLayout material-icons', {exact: true});

  })

  test('category works', () => {
    const onHandleCategory = jest.fn();
    const onHandleFilter = jest.fn();

    const context = {
      category: 'games',
      data: [],
      error: false,
      filter: 'all',
      gameUpdates: [],
      handleCategory: () => {return;},
      handleFilter: () => {return;},
      handleGameStatus: () => Promise.resolve(),
      handleLayout: () => {return;},
      handleSearch: () => {return;},
      layout: 'grid',
      libraryStatus: [],
      refresh: () => Promise.resolve(),
      refreshLibrary: () => Promise.resolve(),
      refreshing: false,
      user: 'user'
    }

    const { rerender, getByTestId } = render(getHeader({
      context: context,
      handleCategory: onHandleCategory,
      handleFilter: onHandleFilter
    }));

    let selectGames = getByTestId('gamesCategory');
    let selectUnreal = getByTestId('unrealCategory');

    // triggering the same category should do nothing
    fireEvent.click(selectGames);
    expect(onHandleCategory).not.toBeCalled();

    // trigger unreal category
    fireEvent.click(selectUnreal);
    expect(selectGames).toHaveClass('selected');
    expect(onHandleCategory).toBeCalledWith('unreal');

    // Fixme: wait for useContext to rerender.
    context.category = 'unreal';
    rerender(getHeader({
      context: context,
      handleCategory: onHandleCategory,
      handleFilter: onHandleFilter
    }));

    // trigger games category
    selectGames = getByTestId('gamesCategory');
    selectUnreal = getByTestId('unrealCategory');
    fireEvent.click(selectGames);
    expect(selectUnreal).toHaveClass('selected');
    expect(onHandleCategory).toBeCalledWith('games');
  })
})
