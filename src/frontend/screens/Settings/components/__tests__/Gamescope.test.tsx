import React, { act, ReactNode, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvents from '@testing-library/user-event'
import '@testing-library/jest-dom/extend-expect'
import Gamescope from '../Gamescope'
import ContextProvider from 'frontend/state/ContextProvider'
import { ContextType, SettingsContextType } from 'frontend/types'
import SettingsContext from '../../SettingsContext'

// TODO: Move this somewhere else once we make it more generic
const SettingsWrapper = (props: React.PropsWithChildren) => {
  const [currentConfig, setCurrentConfig] = useState<Record<string, unknown>>(
    {}
  )

  const values = {
    getSetting: (key: string, fallback: unknown) =>
      currentConfig[key] ?? fallback,
    setSetting: (key: string, value: unknown) => {
      const currentValue = currentConfig[key]
      if (currentValue !== undefined || currentValue !== null) {
        const noChange = JSON.stringify(value) === JSON.stringify(currentValue)
        if (noChange) return
      }
      setCurrentConfig({ ...currentConfig, [key]: value })
    }
  } as SettingsContextType
  return (
    <SettingsContext.Provider value={values}>
      {props.children}
    </SettingsContext.Provider>
  )
}

// TODO: move this somewhere else once we make it more generic
function renderComponentWithContexts(
  globalContextValues: ContextType,
  component: ReactNode
) {
  return render(
    <ContextProvider.Provider value={globalContextValues}>
      <SettingsWrapper>{component}</SettingsWrapper>
    </ContextProvider.Provider>
  )
}

// TODO: maybe move this into a test setup file so it applies to all frontend tests?
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: jest.fn((key: string, fallback?: string) => fallback || key)
  })
}))

describe('Gamescope', () => {
  beforeEach(() => {
    // @ts-expect-error: it complains about all the other methods that we don't need
    window.api = {
      hasExecutable: () => Promise.resolve(true)
    }
  })

  describe('on windows', () => {
    const globalContextValues = { platform: 'win32' } as ContextType

    it('renders nothing', () => {
      const { container } = renderComponentWithContexts(
        globalContextValues,
        <Gamescope />
      )
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('on mac', () => {
    const globalContextValues = { platform: 'darwin' } as ContextType

    it('renders nothing', () => {
      const { container } = renderComponentWithContexts(
        globalContextValues,
        <Gamescope />
      )
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('on linux', () => {
    const globalContextValues = { platform: 'linux' } as ContextType

    it('shows upscaling options when enabled', async () => {
      renderComponentWithContexts(globalContextValues, <Gamescope />)

      // upscale options are not visible initially
      expect(screen.queryByText('Upscale Method')).not.toBeInTheDocument()

      // show them after enabling upscaling
      const enableUpscaleInput =
        await screen.findByLabelText('Enables Upscaling')
      await userEvents.click(enableUpscaleInput)

      expect(await screen.findByText('Upscale Method')).toBeInTheDocument()

      // test changing upscale settings
      const gameWidthInput = await screen.findByLabelText('Game Width')
      await act(async () => await userEvents.type(gameWidthInput, '123'))

      expect(gameWidthInput).toHaveValue('123')

      const gameHeightInput = await screen.findByLabelText('Game Height')
      await act(async () => await userEvents.type(gameHeightInput, '321'))

      expect(gameHeightInput).toHaveValue('321')
      expect(gameWidthInput).toHaveValue('123')
    })
  })
})
