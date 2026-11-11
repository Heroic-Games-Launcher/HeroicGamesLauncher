import { ReactNode, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import ControllerHints from '.'

function WithController({
  activeController,
  children
}: {
  activeController: string
  children: ReactNode
}) {
  const appContext = useContext(ContextProvider)

  return (
    <ContextProvider.Provider value={{ ...appContext, activeController }}>
      {children}
    </ContextProvider.Provider>
  )
}

const meta = {
  title: 'Patterns/ControllerHints',
  component: ControllerHints,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The button legend pinned to the bottom of the window while a gamepad is connected. The glyph set is picked from the controller id, and the labels follow whatever element has focus.'
      }
    }
  }
} satisfies Meta<typeof ControllerHints>

export default meta

type Story = StoryObj<typeof meta>

export const SteamDeck: Story = {
  render: () => (
    <WithController activeController="28de-11ff-Steam Deck Controller">
      <ControllerHints />
    </WithController>
  )
}

export const Xbox: Story = {
  render: () => (
    <WithController activeController="Xbox Wireless Controller">
      <ControllerHints />
    </WithController>
  )
}

export const PlayStation5: Story = {
  render: () => (
    <WithController activeController="054c-0ce6-DualSense Wireless Controller">
      <ControllerHints />
    </WithController>
  )
}

export const PlayStation4: Story = {
  render: () => (
    <WithController activeController="054c-09cc-Wireless Controller">
      <ControllerHints />
    </WithController>
  )
}

export const HiddenWithoutAController: Story = {
  render: () => (
    <WithController activeController="">
      <ControllerHints />
    </WithController>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.controller-hints')).toBeNull()
  }
}

export const PicksTheGlyphSetFromTheController: Story = {
  render: () => (
    <WithController activeController="Microsoft Xbox One Controller">
      <ControllerHints />
    </WithController>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.controller-hints')).toHaveClass(
      'xbox'
    )
  }
}
