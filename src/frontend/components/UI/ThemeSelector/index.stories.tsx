import { expect } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { ThemeSelector, defaultThemes } from '.'

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
