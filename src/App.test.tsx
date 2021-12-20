import React from 'react'

import { render } from '@testing-library/react'

import App from './App'

jest.mock('electron-store', function () {
  return jest.fn().mockImplementation(function () {
    const mockStore = jest.fn(() => ({ get: jest.fn() }))
    return { mockStore }
  })
})

jest.mock('src//assets/heroic-icon.png', () => jest.fn(() => ''))

describe('App', () => {
  test.skip('renders', () => {
    render(
      <React.Suspense fallback="App loaded">
        <App />
      </React.Suspense>
    )
  })
})
