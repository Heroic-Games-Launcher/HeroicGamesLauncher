import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react'

import { ContextType } from 'src/types';
import ContextProvider from 'src/state/ContextProvider';
import SearchBar from './index';

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

function renderSearchBar(props: Partial<ContextType> = {}) {
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
      <SearchBar />
    </ContextProvider.Provider>);
}

describe('SearchBar', () => {
  test('renders', () => {
    renderSearchBar();
  })

  test('set text in input field and calls handle search', () => {
    const onHandleSearch = jest.fn();
    const { getByTestId } =renderSearchBar({ handleSearch: onHandleSearch});
    const searchInput = getByTestId('searchInput');
    fireEvent.change(searchInput, {target: { value: 'Test Search'}});
    expect(searchInput).toHaveValue('Test Search');
    expect(onHandleSearch).toBeCalledWith('Test Search');
  })

  test('calls handle search by clicking on search', () => {
    const onHandleSearch = jest.fn();
    const { getByTestId } = renderSearchBar({ handleSearch: onHandleSearch});
    const searchButton = getByTestId('searchButton');
    fireEvent.click(searchButton);
    expect(onHandleSearch).toBeCalledWith('');
  })

  test('calls handle search with empty string by clicking on cancel', () => {
    const onHandleSearch = jest.fn();
    const { getByTestId } = renderSearchBar({ handleSearch: onHandleSearch});
    const searchInput = getByTestId('searchInput');
    fireEvent.change(searchInput, {target: { value: 'Test Search'}});
    const closeButton = getByTestId('closeButton');
    fireEvent.click(closeButton);
    expect(onHandleSearch).toBeCalledWith('');
  })
})
