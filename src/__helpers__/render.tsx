import React, { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import ContextProvider, { initialContext } from 'src/state/ContextProvider'
import { ContextType } from 'src/types'
import i18n from './i18n'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const renderWithState = (
  children: ReactNode,
  state: { [key: string]: any } = {}
) => {
  const contextState: ContextType = {
    ...initialContext,
    ...state
  }

  render(
    <I18nextProvider i18n={i18n}>
      <ContextProvider.Provider value={contextState}>
        {children}
      </ContextProvider.Provider>
    </I18nextProvider>
  )
}
