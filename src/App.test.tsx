import React from 'react';

import {
  render
} from '@testing-library/react';

import App from './App';

describe('App', () => {

  test('renders', () => {
    render(<React.Suspense fallback="App loaded"><App /></React.Suspense>);
  })

})
