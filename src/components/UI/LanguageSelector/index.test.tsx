import '@testing-library/jest-dom'
import React from 'react'

import { fireEvent, render } from '@testing-library/react'

import LanguageSelector, { FlagPosition } from './index'

interface Props {
  className?: string
  currentLanguage?: string
  flagPossition?: FlagPosition
  handleLanguageChange: (language: string) => void
}

function renderLanguageSelector(props: Partial<Props> = {}) {
  const defaultProps: Props = {
    handleLanguageChange: () => {
      return
    }
  }

  return render(<LanguageSelector {...{ ...defaultProps, ...props }} />)
}

describe('LanguageSelector', () => {
  test('renders', () => {
    renderLanguageSelector()
  })

  test('set init class name', () => {
    const { getByTestId } = renderLanguageSelector({ className: 'test' })
    const languageSelector = getByTestId('languageSelector')
    expect(languageSelector).toHaveClass('test')
  })

  test('set init language with flag position NONE', () => {
    const { getByTestId } = renderLanguageSelector({ currentLanguage: 'de' })
    const languageSelector = getByTestId('languageSelector')
    expect(languageSelector).toHaveValue('de')
    expect(languageSelector).not.toHaveTextContent('🇬🇧')
  })

  test('set init flag position APPEND', () => {
    const { getByTestId } = renderLanguageSelector({
      flagPossition: FlagPosition.APPEND
    })
    const languageSelector = getByTestId('languageSelector')
    expect(languageSelector).toHaveTextContent('English 🇬🇧')
  })

  test('set init flag position PREPEND', () => {
    const { getByTestId } = renderLanguageSelector({
      flagPossition: FlagPosition.PREPEND
    })
    const languageSelector = getByTestId('languageSelector')
    expect(languageSelector).toHaveTextContent('🇬🇧 English')
  })

  test('calls handleLanguageChange on select', () => {
    const onHandleLanguageChange = jest.fn()
    const { getByTestId } = renderLanguageSelector({
      handleLanguageChange: onHandleLanguageChange
    })
    const languageSelector = getByTestId('languageSelector')
    fireEvent.change(languageSelector, { target: { value: 'de' } })
    expect(onHandleLanguageChange).toBeCalledTimes(1)
    expect(onHandleLanguageChange).toBeCalledWith('de')
    fireEvent.change(languageSelector, { target: { value: 'nl' } })
    expect(onHandleLanguageChange).toBeCalledTimes(2)
    expect(onHandleLanguageChange).toBeCalledWith('nl')
  })
})
