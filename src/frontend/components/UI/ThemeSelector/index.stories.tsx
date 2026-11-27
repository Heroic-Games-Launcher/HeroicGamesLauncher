import { useContext } from 'react'
import { expect } from 'storybook/test'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'

import ContextProvider from 'frontend/state/ContextProvider'
import { defaultThemes } from 'frontend/helpers/themes'
import { ThemeSelector } from '.'

const meta = {
  title: 'Forms/ThemeSelector',
  component: ThemeSelector,
  parameters: {
    docs: {
      description: {
        component:
          'Theme picker from the accessibility settings. It lists the built-in themes plus any CSS file found in the custom themes folder.'
      }
    }
  }
} satisfies Meta<typeof ThemeSelector>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

const WithRemovedTheme: Decorator = (Story) => {
  const appContext = useContext(ContextProvider)

  return (
    <ContextProvider.Provider value={{ ...appContext, theme: 'heroicTheme' }}>
      <Story />
    </ContextProvider.Provider>
  )
}

export const RemovedThemeFallsBackToDefault: Story = {
  decorators: [WithRemovedTheme],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toHaveTextContent('Heroic Theme')
  }
}

export const WithCustomThemes: Story = {
  beforeEach: () => {
    window.api.getCustomThemes = () =>
      Promise.resolve(['neon.css', 'paper.css'])
    return () => {
      delete (window.api as Partial<typeof window.api>).getCustomThemes
    }
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('combobox'))

    await expect(document.body).toHaveTextContent('neon.css')
  }
}

export const ListsEveryBuiltInTheme: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('combobox'))

    for (const label of Object.values(defaultThemes)) {
      await expect(document.body).toHaveTextContent(label)
    }
  }
}
