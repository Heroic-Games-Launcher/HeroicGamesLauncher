import '@testing-library/jest-dom'
import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react';

import InfoBox from './index';

interface Props {
  children: React.ReactNode
  text: string
}

function renderInfoBox(props: Partial<Props> = {})
{
  const defaultProps: Props = {
    children: <div></div>,
    text: 'text'
  };

  return render(
    <InfoBox {... { ...defaultProps, ...props}}/>
  );
}

describe('InfoBox', () => {

  test('renders', () => {
    renderInfoBox();
  })

  test('contains text', () => {
    const { getByTestId } = renderInfoBox({text: 'Test Info'});
    const spanInfoBox = getByTestId('infoboxSpan');
    expect(spanInfoBox).toHaveTextContent('Test Info');
  })

  test('contains children', () => {
    const { getByTestId } = renderInfoBox({children: <div data-testid='children'>Test Info</div>});
    const children = getByTestId('children');
    expect(children).toHaveTextContent('Test Info');
  })

  test('children is visible on click', () => {
    const { getByTestId } = renderInfoBox();
    const spanInfoBox = getByTestId('infoboxSpan');
    const divInfoBox = getByTestId('infoboxDiv');
    expect(divInfoBox).not.toBeVisible();
    fireEvent.click(spanInfoBox);
    expect(divInfoBox).toBeVisible();
  })

})
