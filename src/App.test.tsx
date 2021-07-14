import React from 'react';

import {
  render
} from '@testing-library/react';

import App from './App';
jest.mock('electron-store', () => jest.fn(() => ''));

describe.skip('App', () => {

  test('renders', () => {
    render(<React.Suspense fallback="App loaded"><App /></React.Suspense>);
  })

})
