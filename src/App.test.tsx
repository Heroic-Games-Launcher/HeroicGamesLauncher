import React from 'react';

import {
  render
} from '@testing-library/react';

import App from './App';
jest.mock('electron-store', () => jest.fn(() => {
  return {configStore: {get: () => ''}}
}));
jest.mock('src//assets/heroic-icon.png', () => jest.fn(() => ''))

describe('App', () => {

  test.skip('renders', () => {
    render(<React.Suspense fallback="App loaded"><App /></React.Suspense>);
  })

})
