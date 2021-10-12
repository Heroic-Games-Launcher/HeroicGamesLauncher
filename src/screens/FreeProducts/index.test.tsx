import React from 'react';

import {
  render,
  waitFor,
  fireEvent
} from '@testing-library/react';
import { when } from 'jest-when';
import { test_context } from 'src/test_helpers/testTypes';
import { resetDates } from './utils/testUtils';
import { Route, Router} from 'react-router-dom';
import ContextProvider from 'src/state/ContextProvider';
import { createMemoryHistory } from 'history';
import { ipcRenderer } from 'src/test_helpers/mock/electron';
import * as mockFreeProductsApi from 'src/screens/FreeProducts/utils/mockApiResponse.json'


import FreeProducts from './index';
import { FreeGameElement } from 'src/types';

const renderFreeProducts = async () =>
{
  const history = createMemoryHistory()
  history.push('/free-products');
  const returnvalue =  await waitFor(() => render(
    <Router history={history}>
      <ContextProvider.Provider value={test_context.get()}>
        <Route path='/free-products' component={FreeProducts}/>
      </ContextProvider.Provider>
    </Router>
  ))
  return returnvalue
}

describe('Free Products', () => {

  beforeEach(() => {
    const products: FreeGameElement[] = mockFreeProductsApi.data.Catalog.searchStore.elements
    resetDates(products)
    when(ipcRenderer.invoke).calledWith('requestFreeProducts').mockResolvedValue([products[5], products[9]]);
  })

  test('renders with fetch call', async () => {
    await renderFreeProducts()
    expect(ipcRenderer.invoke).toBeCalledWith('requestFreeProducts')
  })

  test('displays only valid free promotions', async () => {
    const component = await renderFreeProducts()
    const images = component.getAllByTestId('test-free-product-image')
    const title = component.getAllByTestId('test-free-product-title')
    expect(images).toHaveLength(2)
    expect(title).toHaveLength(2)
    expect(title[0].textContent).toBe('Speed Brawl')
    expect(title[1].textContent).toBe('Tharsis')
  })

  test('opens store link on click', async () => {
    const component = await renderFreeProducts()
    const link = component.getAllByTestId('test-free-product-link')
    fireEvent.click(link[0])
    expect(ipcRenderer.send).toHaveBeenCalledWith('createNewWindow', 'https://www.epicgames.com/store/en/p/speed-brawl')
  })

})