import '@testing-library/jest-dom'
import React from 'react';

import {
  fireEvent,
  render
} from '@testing-library/react';

import LanguageSelector, { FlagPosition } from './index';

describe('LanguageSelector', () => {

  test('renders', () => {
    render(<LanguageSelector handleLanguageChange={() => {return;}}/>);
  })

  test('set init class name', () => {
    const { getByTestId } = render(<LanguageSelector handleLanguageChange={() => {return;} } className={'test'}/>);
    const languageSelector = getByTestId('languageselector');
    expect(languageSelector).toHaveClass('test');
  })

  test('set init language with flag position NONE', () => {
    const { getByTestId } = render(<LanguageSelector handleLanguageChange={() => {return;} } currentLanguage={'de'}/>);
    const languageSelector = getByTestId('languageselector');
    expect(languageSelector).toHaveValue('de');
    expect(languageSelector).not.toHaveTextContent('🇬🇧');
  })

  test('set init flag position APPEND', () => {
    const { getByTestId } = render(<LanguageSelector handleLanguageChange={() => {return;} } flagPossition={FlagPosition.APPEND}/>);
    const languageSelector = getByTestId('languageselector');
    expect(languageSelector).toHaveTextContent('English 🇬🇧');
  })

  test('set init flag position PREPEND', () => {
    const { getByTestId } = render(<LanguageSelector handleLanguageChange={() => {return;} } flagPossition={FlagPosition.PREPEND}/>);
    const languageSelector = getByTestId('languageselector');
    expect(languageSelector).toHaveTextContent('🇬🇧 English');
  })

  test('calls handleLanguageChange on select', () => {
    const onHandleLanguageChange = jest.fn();
    const { getByTestId } = render(<LanguageSelector handleLanguageChange={onHandleLanguageChange} />);
    const languageSelector = getByTestId('languageselector');
    fireEvent.change(languageSelector, {target: { value: 'de'}});
    expect(onHandleLanguageChange).toBeCalledTimes(1);
    expect(onHandleLanguageChange).toBeCalledWith('de');
    fireEvent.change(languageSelector, {target: { value: 'nl'}});
    expect(onHandleLanguageChange).toBeCalledTimes(2);
    expect(onHandleLanguageChange).toBeCalledWith('nl')
  })

});
