import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react';

import ToggleSwitch from './index';

describe('ToggleSwitch', () => {

  test('renders', () => {
    render(<ToggleSwitch handleChange={() => {return;}} value={false}/>);
  })

  test('is clickable', () => {
    const { getByTestId } = render(<ToggleSwitch handleChange={() => {return;}} value={false}/>);
    const toggleSwitch = getByTestId('toggleSwitch');
    fireEvent.click(toggleSwitch);
    expect(toggleSwitch).toBeChecked;
    fireEvent.click(toggleSwitch);
    expect(toggleSwitch).not.toBeChecked;

  })

  test('is not clickable if disabled', () => {
    const { getByTestId } = render(<ToggleSwitch handleChange={() => {return;}} value={false} disabled={true}/>);
    const toggleSwitch = getByTestId('toggleSwitch');
    fireEvent.click(toggleSwitch);
    expect(toggleSwitch).not.toBeChecked;
  })

  test('calls handleChange on click', () => {
    const onHandleChange = jest.fn();
    const { getByTestId } = render(<ToggleSwitch handleChange={onHandleChange} value={false}/>);
    const toggleSwitch = getByTestId('toggleSwitch');
    fireEvent.click(toggleSwitch);
    expect(onHandleChange).toBeCalled();
  })

})

