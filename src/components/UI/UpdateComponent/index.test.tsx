import '@testing-library/jest-dom'
import React from 'react'

import { render } from '@testing-library/react'

import UpdateComponent from './index'

describe('UpdateComponent', () => {
  test('renders', () => {
    render(<UpdateComponent />)
  })

  test('to contain svg Element', () => {
    const { getByTestId } = render(<UpdateComponent />)
    const updateComponent = getByTestId('updateComponent')
    expect(updateComponent).toContainHTML('svg')
  })
})
