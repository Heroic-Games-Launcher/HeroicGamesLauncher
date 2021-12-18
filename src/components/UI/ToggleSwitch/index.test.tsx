import React from 'react'

import { fireEvent, render } from '@testing-library/react'

import ToggleSwitch from './index'

interface Props {
  dataTestId?: string
  disabled?: boolean
  handleChange: () => void
  value: boolean
}

function renderToggleSwitch(props: Partial<Props> = {}) {
  const defaultProps: Props = {
    handleChange: () => {
      return
    },
    value: false
  }
  return render(<ToggleSwitch {...{ ...defaultProps, ...props }} />)
}

describe('ToggleSwitch', () => {
  test('renders', () => {
    renderToggleSwitch()
  })

  test('is clickable', () => {
    const { getByTestId } = renderToggleSwitch()
    const toggleSwitch = getByTestId('toggleSwitch')
    fireEvent.click(toggleSwitch)
    expect(toggleSwitch).toBeChecked
    fireEvent.click(toggleSwitch)
    expect(toggleSwitch).not.toBeChecked
  })

  test('is not clickable if disabled', () => {
    const { getByTestId } = renderToggleSwitch({ disabled: true })
    const toggleSwitch = getByTestId('toggleSwitch')
    fireEvent.click(toggleSwitch)
    expect(toggleSwitch).not.toBeChecked
  })

  test('calls handleChange on click', () => {
    const onHandleChange = jest.fn()
    const { getByTestId } = renderToggleSwitch({ handleChange: onHandleChange })
    const toggleSwitch = getByTestId('toggleSwitch')
    fireEvent.click(toggleSwitch)
    expect(onHandleChange).toBeCalled()
  })
})
