import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react'

import { initElectronMocks } from 'src/test_helpers/mock/electron';
import { resetTestTypes, test_context } from 'src/test_helpers/testTypes';
import ContextProvider from 'src/state/ContextProvider';
import SearchBar from './index';

function renderSearchBar() {
  return render(
    <ContextProvider.Provider value={test_context.get()}>
      <SearchBar />
    </ContextProvider.Provider>);
}

describe('SearchBar', () => {
  beforeEach(() => {
    resetTestTypes();
    initElectronMocks();
  })

  test('renders', () => {
    renderSearchBar();
  })

  test('set text in input field and calls handle search', () => {
    const onHandleSearch = jest.fn();
    test_context.set({handleSearch: onHandleSearch})
    const { getByTestId } = renderSearchBar();
    const searchInput = getByTestId('searchInput');
    fireEvent.change(searchInput, {target: { value: 'Test Search'}});
    expect(searchInput).toHaveValue('Test Search');
    expect(onHandleSearch).toBeCalledWith('Test Search');
  })

  test('calls handle search by clicking on search', () => {
    const onHandleSearch = jest.fn();
    test_context.set({handleSearch: onHandleSearch})
    const { getByTestId } = renderSearchBar();
    const searchButton = getByTestId('searchButton');
    fireEvent.click(searchButton);
    expect(onHandleSearch).toBeCalledWith('');
  })

  test('calls handle search with empty string by clicking on cancel', () => {
    const onHandleSearch = jest.fn();
    test_context.set({handleSearch: onHandleSearch})
    const { getByTestId } = renderSearchBar();
    const searchInput = getByTestId('searchInput');
    fireEvent.change(searchInput, {target: { value: 'Test Search'}});
    const closeButton = getByTestId('closeButton');
    fireEvent.click(closeButton);
    expect(onHandleSearch).toBeCalledWith('');
  })
})
