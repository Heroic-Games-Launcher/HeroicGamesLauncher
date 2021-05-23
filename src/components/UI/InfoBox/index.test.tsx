import '@testing-library/jest-dom'
import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react';

import InfoBox from './index';

jest.mock('react-i18next', () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      i18n: {
        changeLanguage: () => new Promise(() => {return;})
      },
      t: (str: string) => str
    };
  }
}));

describe('InfoBox', () => {

  test('renders', () => {
    render(<InfoBox text="Test Info" ><div></div></InfoBox>);
  })

  test('contains text', () => {
    const { getByTestId } = render(<InfoBox text="Test Info" ><div></div></InfoBox>);
    const spanInfoBox = getByTestId('infobox-span');
    expect(spanInfoBox).toHaveTextContent('Test Info');
  })

  test('contains children', () => {
    const { getByTestId } = render(<InfoBox text="" ><div data-testid='children'>Test Info</div></InfoBox>);
    const children = getByTestId('children');
    expect(children).toHaveTextContent('Test Info');
  })

  test('children is visible on click', () => {
    const { getByTestId } = render(<InfoBox text="" ><div></div></InfoBox>);
    const spanInfoBox = getByTestId('infobox-span');
    const divInfoBox = getByTestId('infobox-div');
    expect(divInfoBox).not.toBeVisible();
    fireEvent.click(spanInfoBox);
    expect(divInfoBox).toBeVisible();
  })

})
